import { randomUUID } from 'node:crypto';
import { link, lstat, mkdir, open, readFile, realpath, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import type { LoadedKit } from '../data/types.js';
import { resume } from '../state/index.js';
import type { State } from '../state/index.js';
import { markdown, renderTable, RiskError } from '../premortem/index.js';
import type { RiskReport } from '../premortem/index.js';

type Row = Readonly<Record<string, unknown>>;
export function renderRiskRegister(kit: LoadedKit, state: State, report: RiskReport, template: string,
  generatedOn = new Date().toISOString().slice(0, 10)): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(generatedOn) ||
      new Date(`${generatedOn}T00:00:00Z`).toISOString().slice(0, 10) !== generatedOn) throw new RiskError('Invalid generation date');
  const data = kit.documents.find((document) => document.path === 'outputs/bindings.yaml')?.data;
  const bindings = data?.placeholders as Row | undefined;
  const resolvers = data?.system_resolvers as Row | undefined;
  const environment = resume(state, kit).environment;
  const output = template.replace(/\{\{([a-z0-9_]+)\}\}/g, (_match, name: string) => {
    const binding = bindings?.[name] as Row | undefined;
    if (!binding) throw new RiskError('Missing output binding');
    if (binding.from === 'question' && typeof binding.id === 'string') {
      const value = environment[binding.id];
      if (typeof value !== 'string' || !value.trim()) throw new RiskError('Required output answer is missing');
      return markdown(value);
    }
    if (binding.from === 'system' && typeof binding.resolver === 'string' && resolvers?.[binding.resolver]) {
      if (binding.resolver === 'today') return generatedOn;
      if (binding.resolver === 'premortem_table') return renderTable(kit, report);
    }
    throw new RiskError('Unsupported output binding');
  });
  if (output.includes('{{')) throw new RiskError('Unresolved output placeholder');
  return output.endsWith('\n') ? output : `${output}\n`;
}

async function unlinkedDirectory(path: string): Promise<void> {
  const info = await lstat(path);
  if (info.isSymbolicLink() || !info.isDirectory()) throw new RiskError('Expected an unlinked directory');
}

/** Read only the installed kit's fixed template; never follow a linked template component. */
export async function readRiskTemplate(root: string): Promise<string> {
  const base = await realpath(root);
  let path = base;
  for (const part of ['templates', 'project', 'docs', 'risk-register.md.tmpl']) {
    path = join(path, part);
    if ((await lstat(path)).isSymbolicLink()) throw new RiskError('Linked templates are not supported');
  }
  return readFile(path, 'utf8');
}

/** Create-only publication: an existing report, including human edits, is never replaced. */
export async function writeRiskRegister(project: string, content: string, options: { dryRun?: boolean } = {}): Promise<void> {
  if (content.includes('{{')) throw new RiskError('Unresolved output placeholder');
  await unlinkedDirectory(project);
  const base = await realpath(project);
  const directory = join(base, 'docs');
  let temporary: string | undefined;
  try {
    try { await unlinkedDirectory(directory); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      if (options.dryRun) return;
      await mkdir(directory);
    }
    const target = join(directory, 'risk-register.md');
    try { await lstat(target); throw new RiskError('Risk register already exists'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    if (options.dryRun) return;
    const candidate = join(directory, `.risk-register.${randomUUID()}.tmp`);
    const file = await open(candidate, 'wx', 0o600);
    temporary = candidate;
    try { await file.writeFile(content, 'utf8'); await file.sync(); }
    finally { await file.close(); }
    await unlinkedDirectory(directory);
    await link(temporary, target); // Atomic creation fails if a report appeared concurrently.
  } catch { throw new RiskError('Unable to create risk register'); }
  finally { if (temporary) await unlink(temporary).catch(() => undefined); }
}
