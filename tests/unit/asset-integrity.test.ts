import { cp, lstat, mkdir, mkdtemp, readFile, rename, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, vi } from 'vitest';
import { runCli, EXIT } from '../../src/cli/program.js';
import { loadVerifiedKit } from '../../src/security/integrity.js';
import { prepareGeneration } from '../../src/outputs/generate.js';
import { createState } from '../../src/state/index.js';
import { readRiskTemplate } from '../../src/outputs/risk-register.js';

vi.mock('node:fs/promises', async (original) => ({ ...await original<typeof import('node:fs/promises')>(), lstat: vi.fn((await original<typeof import('node:fs/promises')>()).lstat) }));

const root = fileURLToPath(new URL('../../', import.meta.url));
async function copyKit() {
  const copy = await mkdtemp(join(tmpdir(), 'scaffolder-integrity-'));
  await Promise.all(['question-bank', 'failure-modes', 'rules', 'beginner-course', 'knowledge-packs', 'outputs', 'templates', 'skills/project-templates'].map(async (path) => {
    await mkdir(join(copy, path, '..'), { recursive: true });
    await cp(join(root, path), join(copy, path), { recursive: true });
  }));
  // Initial failing regression also runs before an inventory exists in the source checkout.
  try { await cp(join(root, 'integrity'), join(copy, 'integrity'), { recursive: true }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  return copy;
}

test('CLI refuses an altered pack before prompting or starting doctor IO', async () => {
  const copy = await copyKit();
  const path = join(copy, 'knowledge-packs/tool-versions.yaml');
  await writeFile(path, (await readFile(path, 'utf8')) + '\nreview_marker: changed\n');
  const process = vi.fn(); const prompt = vi.fn(); let error = ''; let output = '';
  const code = await runCli(['doctor'], { kitRoot: copy, tty: true, doctorAdapters: { process },
    doctorPortFactory: prompt, out: (text) => { output += text; }, err: (text) => { error += text; } });
  expect(code).toBe(EXIT.ERROR);
  expect(process).not.toHaveBeenCalled(); expect(prompt).not.toHaveBeenCalled();
  expect(output).toBe(''); expect(error).toMatch(/integrity/i); expect(error).not.toContain(copy);
});

test('complete reviewed inventory includes templates and skills and tolerates only CRLF normalization', async () => {
  const copy = await copyKit();
  const source = join(copy, 'templates/project/.gitignore.tmpl');
  await writeFile(source, (await readFile(source, 'utf8')).replaceAll('\r\n', '\n').replaceAll('\n', '\r\n'));
  const kit = await loadVerifiedKit(copy);
  expect(kit.verifiedAsset?.('skills/project-templates/deploy-checklist/SKILL.md')).toContain('deploy');
  expect(kit.documents.some((document) => document.path === 'question-bank/00-router.yaml')).toBe(true);
});

for (const mode of ['missing', 'extra', 'modified']) {
  test(`${mode} template fails before help is displayed`, async () => {
    const copy = await copyKit(); const path = join(copy, 'templates/project/.gitignore.tmpl');
    if (mode === 'missing') await rename(path, join(copy, 'removed-template.txt'));
    if (mode === 'extra') await writeFile(join(copy, 'templates/extra.tmpl'), 'unreviewed');
    if (mode === 'modified') await writeFile(path, 'unreviewed');
    const out = vi.fn();
    expect(await runCli(['--help'], { kitRoot: copy, out, err: () => {} })).toBe(EXIT.ERROR);
    expect(out).not.toHaveBeenCalled();
  });
}

test('absent, duplicate-key, malformed and traversal inventories are refused', async () => {
  const copy = await copyKit(); const path = join(copy, 'integrity/assets.json');
  const original = await readFile(path, 'utf8');
  await rename(path, join(copy, 'absent-inventory.json'));
  await expect(loadVerifiedKit(copy)).rejects.toThrow();
  const duplicate = original.replace('"schema":', '"schema": "wrong", "schema":');
  for (const source of ['not-json', duplicate, original.replace('question-bank/00-router.yaml', '../escape.yaml')]) {
    await writeFile(path, source); await expect(loadVerifiedKit(copy)).rejects.toThrow();
  }
});

test('linked inventory/asset components are refused before content is trusted', async () => {
  vi.mocked(lstat).mockResolvedValueOnce({ isSymbolicLink: () => true } as Awaited<ReturnType<typeof lstat>>);
  await expect(loadVerifiedKit(root)).rejects.toThrow();
});

test('generation and risk register use verified bytes after template replacement on disk', async () => {
  const copy = await copyKit(); const kit = await loadVerifiedKit(copy);
  const before = await prepareGeneration(copy, kit, createState(kit), { ids: ['gitignore'], offline: true, now: '2026-11-01' });
  const risk = await readRiskTemplate(copy, kit.verifiedAsset);
  await writeFile(join(copy, 'templates/project/.gitignore.tmpl'), 'unreviewed replacement');
  await writeFile(join(copy, 'templates/project/docs/risk-register.md.tmpl'), 'unreviewed replacement');
  expect(await prepareGeneration(copy, kit, createState(kit), { ids: ['gitignore'], offline: true, now: '2026-11-01' })).toEqual(before);
  expect(await readRiskTemplate(copy, kit.verifiedAsset)).toBe(risk);
  await expect(loadVerifiedKit(copy)).rejects.toThrow();
});
