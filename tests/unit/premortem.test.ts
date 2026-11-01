import { globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, test } from 'vitest';
import { loadKit, loadYamlFile } from '../../src/data/loader.js';
import { createState, setAnswer } from '../../src/state/index.js';
import { premortem, renderTable } from '../../src/premortem/index.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const kit = await loadKit(root);
const scenarios = globSync('tests/scenarios/*.yaml', { cwd: root });
const python = process.platform === 'win32' ? join(root, '.venv/Scripts/python.exe') : 'python';

for (const path of scenarios) {
  test(`matches Python pre-mortem ranking and scores: ${path}`, async () => {
    const scenario = (await loadYamlFile(root, path.replaceAll('\\', '/'))).data;
    let state = createState(kit);
    for (const [id, value] of Object.entries(scenario.answers as Record<string, unknown>)) {
      state = setAnswer(state, kit, id, { state: 'answered', value });
    }
    const reference = spawnSync(python, [join(root, 'tools/premortem.py'), path, '--top', '100'],
      { cwd: root, encoding: 'utf8', timeout: 30000, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
    expect(reference.status, reference.stderr).toBe(0);
    const expected = reference.stdout.split('\n').filter((line) => /^\| \d+ \|/.test(line))
      .map((line) => { const cells = line.split('|').map((cell) => cell.trim());
        return { id: cells[2], score: Number(cells[6]) }; });
    const report = premortem(kit, state, { top: 100 });
    expect(report.rows.map((risk) => ({ id: risk.id, score: risk.score }))).toEqual(expected);
    expect(report.total).toBe(expected.length);
  });
}

test('answers are coverage, not proof of prevention; deferred and stale answers stay unresolved', () => {
  let state = setAnswer(createState(kit), kit, 'sec.secrets', { state: 'answered', value: 'Local environment files and hosted environment settings' });
  state = setAnswer(state, kit, 'aic.no_secrets_in_prompts', { state: 'deferred', owner: 'Builder', revisit_when: 'Before coding' });
  const report = premortem(kit, state);
  const risk = report.rows.find((row) => row.id === 'SW-02')!;
  expect(risk.status).toBe('open');
  expect(risk.questions).toContainEqual({ id: 'sec.secrets', state: 'answered' });
  expect(risk.questions).toContainEqual({ id: 'aic.no_secrets_in_prompts', state: 'deferred' });
  expect(risk.cards.every((card) => card.status === 'unverified')).toBe(true);
  expect(report.researched + report.practice).toBe(report.total);
  state.questions['sec.secrets']!.states_allowed = ['answered', 'deferred'];
  expect(premortem(kit, state).rows.find((row) => row.id === 'SW-02')?.questions)
    .toContainEqual({ id: 'sec.secrets', state: 'unanswered' });
});

test('validates top limits without changing ranking or total', () => {
  const state = createState(kit);
  const all = premortem(kit, state, { top: 100 });
  expect(premortem(kit, state, { top: 3 }).rows).toEqual(all.rows.slice(0, 3));
  expect(premortem(kit, state, { top: 3 }).total).toBe(all.total);
  for (const top of [0, -1, 1.5, Infinity, NaN]) expect(() => premortem(kit, state, { top })).toThrow();
});

test('Markdown exposes evidence and unresolved work without letting data add rows or HTML', () => {
  const report = premortem(kit, createState(kit));
  report.rows[0]!.data = { ...report.rows[0]!.data, title: 'Title | extra\n<script>control</script>' };
  const markdown = renderTable(kit, report);
  expect(markdown).toContain('\\|');
  expect(markdown).not.toContain('<script>');
  expect(markdown).toContain('practice');
  expect(markdown).toContain('unverified');
});
