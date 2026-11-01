import { fileURLToPath } from 'node:url';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { runCli, EXIT } from '../../src/cli/program.js';
import { CANCELLED } from '../../src/interview/index.js';
import { loadYamlFile } from '../../src/data/loader.js';

const kitRoot = fileURLToPath(new URL('../../', import.meta.url));
test('help works without a terminal or state creation', async () => {
  let output = '';
  const code = await runCli(['--help'], { kitRoot, tty: false, out: (text) => { output += text; }, err: () => {} });
  expect(code).toBe(EXIT.SUCCESS);
  expect(output).toContain('init'); expect(output).toContain('next');
});
test('help labels and descriptions come from YAML for root and subcommands', async () => {
  const ui = (await loadYamlFile(kitRoot, 'beginner-course/interview-ui.yaml')).data;
  expect(ui.help).toEqual(expect.any(String));
  for (const argv of [['--help'], ['init', '--help']]) {
    let output = '';
    expect(await runCli(argv, { kitRoot, tty: false, out: (text) => { output += text; } })).toBe(EXIT.SUCCESS);
    expect(output).toContain(ui.help);
    expect(output).toContain(ui.usage);
    expect(output).toContain(ui.options);
  }
});
test('rejects noninteractive execution and unknown arguments without echoing them', async () => {
  let error = '';
  const io = { kitRoot, tty: false, out: () => {}, err: (text: string) => { error += text; } };
  expect(await runCli(['init'], io)).toBe(EXIT.ERROR);
  const marker = 'synthetic-unrecognized-input';
  expect(await runCli([marker], io)).toBe(EXIT.USAGE);
  expect(error).not.toContain(marker);
});
test('cancellation uses exit 130 and preserves the on-disk cursor', async () => {
  const path = join(await mkdtemp(join(tmpdir(), 'scaffolder-cli-')), 'state.json');
  const code = await runCli(['init', '--state', path], { kitRoot, tty: true, out: () => {}, err: () => {},
    portFactory: () => ({ ask: async () => CANCELLED, review: async () => CANCELLED, report: () => {}, invalid: () => {} }) });
  expect(code).toBe(EXIT.CANCELLED);
  const state = JSON.parse(await readFile(path, 'utf8'));
  expect(state.answers).toEqual({}); expect(state.progress.current_question).not.toBeNull();
});
