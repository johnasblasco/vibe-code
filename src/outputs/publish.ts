import { randomUUID } from 'node:crypto';
import { link, lstat, mkdir, open, realpath, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import type { GeneratedFile } from './generate.js';
import { OutputError, portablePath } from './paths.js';

export class PublishError extends OutputError {
  constructor(readonly written: readonly string[]) { super('Unable to publish the complete generation plan'); }
}
async function inspect(base: string, parts: string[], includeTarget: boolean): Promise<void> {
  let current = base;
  for (let index = 0; index < parts.length; index++) {
    current = join(current, parts[index]!);
    let info;
    try { info = await lstat(current); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
    if (info.isSymbolicLink()) throw new OutputError('Linked output components are not supported');
    if (index === parts.length - 1 && includeTarget) throw new OutputError('Destination already exists');
    if (!info.isDirectory()) throw new OutputError('Expected output directory');
  }
}
async function parents(base: string, parts: string[]): Promise<string> {
  let current = base;
  for (const part of parts) {
    current = join(current, part);
    try { await mkdir(current); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
    const info = await lstat(current);
    if (info.isSymbolicLink() || !info.isDirectory()) throw new OutputError('Expected unlinked output directory');
  }
  return current;
}

/** Every destination is preflighted first. Each complete file is then created without replacement. */
export async function publishPlan(project: string, files: readonly GeneratedFile[], options: { dryRun?: boolean } = {}) {
  const rootInfo = await lstat(project);
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) throw new OutputError('Expected existing unlinked project');
  const base = await realpath(project);
  const paths = files.map((file) => { portablePath(file.path); return file.path.toLowerCase(); });
  if (new Set(paths).size !== paths.length || paths.some((path) => paths.some((other) => other.startsWith(`${path}/`)))) {
    throw new OutputError('Colliding output paths');
  }
  for (const file of files) {
    if (file.content.replace(/\$\{\{[^{}]*\}\}/g, '').includes('{{')) throw new OutputError('Unresolved output placeholder');
    await inspect(base, portablePath(file.path), true);
  }
  if (options.dryRun) return { written: [] as string[] };
  const staged: { file: GeneratedFile; temporary: string; target: string }[] = [];
  const owned = new Set<string>();
  const written: string[] = [];
  try {
    for (const file of files) {
      const parts = portablePath(file.path);
      const directory = await parents(base, parts.slice(0, -1));
      const temporary = join(directory, `.scaffolder-${randomUUID()}.tmp`);
      const handle = await open(temporary, 'wx', 0o600);
      owned.add(temporary);
      try { await handle.writeFile(file.content, 'utf8'); await handle.sync(); }
      finally { await handle.close(); }
      staged.push({ file, temporary, target: join(base, ...parts) });
    }
    for (const item of staged) {
      await inspect(base, portablePath(item.file.path), true);
      await link(item.temporary, item.target);
      written.push(item.file.path);
    }
    return { written };
  } catch { throw new PublishError([...written]); }
  finally { for (const temporary of owned) await unlink(temporary).catch(() => undefined); }
}
