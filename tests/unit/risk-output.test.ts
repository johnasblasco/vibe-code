import { mkdtemp, mkdir, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { loadKit } from '../../src/data/loader.js';
import { createState, setAnswer } from '../../src/state/index.js';
import { premortem } from '../../src/premortem/index.js';
import { renderRiskRegister, writeRiskRegister } from '../../src/outputs/risk-register.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const kit = await loadKit(root);
const template = await readFile(join(root, 'templates/project/docs/risk-register.md.tmpl'), 'utf8');
const state = setAnswer(createState(kit), kit, 'product.name', { state: 'answered', value: 'Example | <project>' });
const report = premortem(kit, state);

test('renders the real template only through current bindings, with no unresolved placeholders', () => {
  const text = renderRiskRegister(kit, state, report, template, '2026-11-01');
  expect(text).toContain('Example \\| &lt;project&gt;');
  expect(text).toContain('2026-11-01');
  expect(text).not.toContain('{{');
  const changed = structuredClone(kit);
  const bindings = changed.documents.find((document) => document.path === 'outputs/bindings.yaml')!.data;
  (bindings.placeholders as Record<string, unknown>).project_name = { from: 'question', id: 'product.summary' };
  expect(() => renderRiskRegister(changed, state, report, template, '2026-11-01')).toThrow();
  expect(() => renderRiskRegister(kit, state, report, '{{unknown_binding}}', '2026-11-01')).toThrow();
  expect(() => renderRiskRegister(kit, state, report, '{{ malformed }}', '2026-11-01')).toThrow();
});

test('missing answers and invalid dates fail before any file is written', () => {
  expect(() => renderRiskRegister(kit, createState(kit), report, template, '2026-11-01')).toThrow();
  expect(() => renderRiskRegister(kit, state, report, template, 'not-a-date')).toThrow();
  expect(() => renderRiskRegister(kit, state, report, template, '2026-02-30')).toThrow();
});

test('dry run creates nothing; publish creates the report and refuses to overwrite edits', async () => {
  const project = await mkdtemp(join(tmpdir(), 'scaffolder-risk-'));
  const content = renderRiskRegister(kit, state, report, template, '2026-11-01');
  await writeRiskRegister(project, content, { dryRun: true });
  await expect(readFile(join(project, 'docs/risk-register.md'))).rejects.toThrow();
  await writeRiskRegister(project, content);
  expect(await readFile(join(project, 'docs/risk-register.md'), 'utf8')).toBe(content);
  await writeFile(join(project, 'docs/risk-register.md'), 'My reviewed risks');
  await expect(writeRiskRegister(project, content)).rejects.toThrow();
  expect(await readFile(join(project, 'docs/risk-register.md'), 'utf8')).toBe('My reviewed risks');
});

test('rejects a linked docs directory and leaves its destination untouched', async () => {
  const project = await mkdtemp(join(tmpdir(), 'scaffolder-risk-link-'));
  const destination = join(project, 'destination');
  await mkdir(destination);
  await symlink(destination, join(project, 'docs'), process.platform === 'win32' ? 'junction' : 'dir');
  await expect(writeRiskRegister(project, 'Report\n')).rejects.toThrow();
  await expect(readFile(join(destination, 'risk-register.md'))).rejects.toThrow();
});

test('concurrent publications create exactly one complete report and clean their owned temporary files', async () => {
  const project = await mkdtemp(join(tmpdir(), 'scaffolder-risk-race-'));
  await mkdir(join(project, 'docs'));
  const results = await Promise.allSettled([writeRiskRegister(project, 'First complete report\n'),
    writeRiskRegister(project, 'Second complete report\n')]);
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(['First complete report\n', 'Second complete report\n'])
    .toContain(await readFile(join(project, 'docs/risk-register.md'), 'utf8'));
  expect(await readdir(join(project, 'docs'))).toEqual(['risk-register.md']);
});
