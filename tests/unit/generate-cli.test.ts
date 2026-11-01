import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, vi } from 'vitest';
import { loadKit } from '../../src/data/loader.js';
import { createState, loadState, saveState } from '../../src/state/index.js';
import { runCli, EXIT } from '../../src/cli/program.js';
import { CANCELLED } from '../../src/interview/index.js';

const kitRoot = fileURLToPath(new URL('../../', import.meta.url));
const kit = await loadKit(kitRoot);
async function fixture() {
  const project = await mkdtemp(join(tmpdir(), 'scaffolder-generate-cli-'));
  const state = join(project, 'state.json'); await saveState(state, createState(kit));
  let output = ''; let error = '';
  const io = { kitRoot, tty: false, out: (text: string) => { output += text; }, err: (text: string) => { error += text; } };
  const args = ['generate', '--state', state, '--project', project, '--file', 'gitignore', '--offline'];
  return { project, state, io, args, output: () => output, error: () => error };
}
const port = () => ({ ask: vi.fn(async () => CANCELLED), invalid: () => {},
  contact: vi.fn(async (): Promise<string | typeof CANCELLED> => 'https://example.invalid/security'),
  confirm: vi.fn(async (): Promise<boolean | typeof CANCELLED> => true) });

test('generation help describes general project output rather than only risk registers', async () => {
  const f = await fixture();
  expect(await runCli(['generate', '--help'], f.io)).toBe(EXIT.SUCCESS);
  expect(f.output()).not.toContain('risk register');
});

test('generation previews noninteractively and creates no project files by default', async () => {
  const f = await fixture();
  expect(await runCli(f.args, f.io)).toBe(EXIT.SUCCESS);
  expect(f.output()).toContain('.gitignore');
  expect(f.output()).not.toContain('{{');
  expect(await readdir(f.project)).toEqual(['state.json']);
});

test('writing requires a terminal and explicit confirmation; cancel and decline leave no files', async () => {
  const f = await fixture();
  expect(await runCli([...f.args, '--write'], f.io)).toBe(EXIT.ERROR);
  const prompts = port(); prompts.confirm.mockResolvedValueOnce(CANCELLED).mockResolvedValueOnce(false);
  const io = { ...f.io, tty: true, generationPortFactory: () => prompts };
  expect(await runCli([...f.args, '--write'], io)).toBe(EXIT.CANCELLED);
  expect(await runCli([...f.args, '--write'], io)).toBe(EXIT.SUCCESS);
  expect(await readdir(f.project)).toEqual(['state.json']);
});

test('publishes only after confirmation and preflights existing files before requesting consent', async () => {
  const f = await fixture(); const prompts = port();
  const io = { ...f.io, tty: true, generationPortFactory: () => prompts };
  expect(await runCli([...f.args, '--write'], io)).toBe(EXIT.SUCCESS);
  const before = await readFile(join(f.project, '.gitignore'), 'utf8');
  expect(prompts.confirm).toHaveBeenCalledTimes(1);
  expect(await runCli([...f.args, '--write'], io)).toBe(EXIT.ERROR);
  expect(prompts.confirm).toHaveBeenCalledTimes(1);
  expect(await readFile(join(f.project, '.gitignore'), 'utf8')).toBe(before);
});

test('asks only missing bound questions, persists them, and requests the contact separately', async () => {
  const f = await fixture();
  const prompts = { ...port(), ask: vi.fn(async () => ({ state: 'answered', value: 'Project from prompt' })) };
  const args = ['generate', '--state', f.state, '--project', f.project, '--file', 'security', '--offline', '--write'];
  expect(await runCli(args, { ...f.io, tty: true, generationPortFactory: () => prompts })).toBe(EXIT.SUCCESS);
  expect(prompts.ask).toHaveBeenCalledTimes(1); expect(prompts.contact).toHaveBeenCalledTimes(1);
  expect((await loadState(f.state)).answers['product.name']).toEqual({ state: 'answered', value: 'Project from prompt' });
  expect(await readFile(join(f.project, 'SECURITY.md'), 'utf8')).toContain('https://example.invalid/security');
});
