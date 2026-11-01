import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { loadKit } from '../../src/data/loader.js';
import { createState, saveState, setAnswer } from '../../src/state/index.js';
import { evaluateGate } from '../../src/gates/index.js';
import { EXIT, runCli } from '../../src/cli/program.js';

const kitRoot = fileURLToPath(new URL('../../', import.meta.url));
const kit = await loadKit(kitRoot);
async function setup() {
  const project = await mkdtemp(join(tmpdir(), 'scaffolder-risk-cli-'));
  const path = join(project, 'state.json');
  const state = setAnswer(createState(kit), kit, 'product.name', { state: 'answered', value: 'Example project' });
  await saveState(path, state);
  let output = '';
  let error = '';
  return { project, path, state,
    io: { kitRoot, tty: false, out: (text: string) => { output += text; }, err: (text: string) => { error += text; } },
    output: () => output, error: () => error };
}

test('premortem previews without writes, then publishes once without overwriting human edits', async () => {
  const fixture = await setup();
  const args = ['premortem', '--state', fixture.path, '--project', fixture.project, '--top', '3'];
  expect(await runCli([...args, '--dry-run'], fixture.io)).toBe(EXIT.SUCCESS);
  expect(fixture.output()).toContain('Risk register for Example project');
  await expect(readFile(join(fixture.project, 'docs/risk-register.md'))).rejects.toThrow();
  expect(await runCli(args, fixture.io)).toBe(EXIT.SUCCESS);
  const before = await readFile(join(fixture.project, 'docs/risk-register.md'), 'utf8');
  expect(before).not.toContain('{{');
  expect(await runCli(args, fixture.io)).toBe(EXIT.ERROR);
  expect(await readFile(join(fixture.project, 'docs/risk-register.md'), 'utf8')).toBe(before);
});

test('invalid top limits are usage errors and do not echo arbitrary argument text', async () => {
  const fixture = await setup();
  for (const top of ['0', '-1', '1.5', 'synthetic-private-argument']) {
    expect(await runCli(['premortem', '--state', fixture.path, '--top', top], fixture.io)).toBe(EXIT.USAGE);
  }
  expect(fixture.error()).not.toContain('synthetic-private-argument');
});

test('gates block noninteractively and accept only explicitly supplied complete deferrals', async () => {
  const fixture = await setup();
  const args = ['gates', 'stage-1', '--state', fixture.path];
  expect(await runCli(args, fixture.io)).toBe(EXIT.BLOCKED);
  expect(fixture.output()).toContain('unverified');
  const gate = await evaluateGate(kit, fixture.state, 'stage-1');
  const document = { schema: 'gate-deferrals/v1', gate: 'stage-1', checks: Object.fromEntries(gate.checks.map((check) =>
    [check.id, { owner: 'Builder', reason: 'Waiting for tools', revisit_when: 'Before development' }])) };
  const path = join(fixture.project, 'deferrals.yaml');
  await writeFile(path, JSON.stringify(document));
  expect(await runCli([...args, '--deferrals', path], fixture.io)).toBe(EXIT.SUCCESS);
  expect(fixture.output()).toContain('Waiting for tools');
  expect(await runCli(args, fixture.io)).toBe(EXIT.BLOCKED);
  await writeFile(path, JSON.stringify({ ...document, gate: 'stage-2' }));
  expect(await runCli([...args, '--deferrals', path], fixture.io)).toBe(EXIT.ERROR);
});
