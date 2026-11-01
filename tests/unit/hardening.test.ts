import { fileURLToPath } from 'node:url';
import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, vi } from 'vitest';
import { loadKit, loadYamlFile } from '../../src/data/loader.js';
import { createState, loadState, saveState, setAnswer } from '../../src/state/index.js';
import { publicAddress } from '../../src/doctor/network.js';
import { doctor } from '../../src/doctor/index.js';
import { runCli, EXIT } from '../../src/cli/program.js';
import { prepareGeneration } from '../../src/outputs/generate.js';
import { publishPlan } from '../../src/outputs/publish.js';
import { resolvePins } from '../../src/outputs/lookups.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const kit = await loadKit(root);
const scenario = (await loadYamlFile(root, 'tests/security-scenarios/cli-hardening.yaml')).data;

test('credential userinfo and authorization headers are refused without echoing the input', () => {
  for (const value of scenario.credential_values as string[]) {
    let caught: unknown;
    try { setAnswer(createState(kit), kit, 'product.name', { state: 'answered', value }); }
    catch (error) { caught = error; }
    expect(caught instanceof Error, 'credential-shaped answer must be rejected').toBe(true);
    if (caught instanceof Error) expect(caught.message.includes(value)).toBe(false);
  }
});

test('preview policy rejects IANA non-global benchmarking and documentation IPv6 ranges', () => {
  for (const value of scenario.non_public_ipv6 as string[]) expect(publicAddress(value), 'non-global address must be blocked').toBe(false);
  expect(publicAddress('2001:4860:4860::8888')).toBe(true);
});

test('forged credential state cannot replace a valid saved file or be loaded from disk', async () => {
  const project = await mkdtemp(join(tmpdir(), 'scaffolder-private-state-')); const path = join(project, 'state.json');
  const state = createState(kit); await saveState(path, state); const before = await readFile(path, 'utf8');
  for (const value of scenario.credential_values as string[]) {
    const forged = { ...state, answers: { 'product.name': { state: 'answered', value } } };
    await expect(saveState(path, forged as typeof state)).rejects.toThrow();
    expect(await readFile(path, 'utf8')).toBe(before);
    const untrusted = join(project, 'untrusted.json'); await writeFile(untrusted, JSON.stringify(forged));
    await expect(loadState(untrusted)).rejects.toThrow();
  }
});

test('new credential formats are refused by doctor before subprocess or remote IO', async () => {
  const process = vi.fn(); const page = vi.fn(); const ci = vi.fn();
  for (const value of scenario.credential_values as string[]) {
    await expect(doctor(kit, createState(kit), 'stage-2', { project: root, repository: value, process, page, ci })).rejects.toThrow();
  }
  expect(process).not.toHaveBeenCalled(); expect(page).not.toHaveBeenCalled(); expect(ci).not.toHaveBeenCalled();
});

test('shell punctuation stays inert text in bound generated files with no path control', async () => {
  const project = await mkdtemp(join(tmpdir(), 'scaffolder-name-'));
  const state = setAnswer(createState(kit), kit, 'product.name', { state: 'answered', value: scenario.project_name });
  const plan = await prepareGeneration(root, kit, state, { ids: ['security'], contact: 'security@example.invalid', offline: true, now: '2026-11-01' });
  expect(plan.files.find((file) => file.path === 'SECURITY.md')!.content).toContain(scenario.project_name);
  await publishPlan(project, plan.files);
  expect(await readFile(join(project, 'SECURITY.md'), 'utf8')).toContain(scenario.project_name);
  expect((await readdir(project)).sort()).toEqual(['SECURITY.md', 'docs']);
});

test('planted README and fake .env do not activate unavailable AI, update, diagnostics or install commands', async () => {
  const project = await mkdtemp(join(tmpdir(), 'scaffolder-untrusted-readme-'));
  await writeFile(join(project, 'README.md'), String(scenario.planted_readme));
  await writeFile(join(project, '.env'), String(scenario.env_fixture) + '\n');
  const before = await readdir(project); const process = vi.fn(); const prompt = vi.fn(); let output = '';
  for (const name of ['ai', 'update', 'stuck', 'install-hooks', 'telemetry']) {
    expect(await runCli([name, '--project', project], { kitRoot: root, tty: true, doctorAdapters: { process },
      doctorPortFactory: prompt, out: (text) => { output += text; }, err: (text) => { output += text; } })).toBe(EXIT.USAGE);
  }
  expect(process).not.toHaveBeenCalled(); expect(prompt).not.toHaveBeenCalled();
  expect(await readdir(project)).toEqual(before);
  expect(output.includes(String(scenario.env_fixture))).toBe(false); expect(output).not.toContain(scenario.planted_readme);
});

test('a syntactically valid SHA with mismatched official commit evidence cannot become a pin', async () => {
  const request = async (url: string) => url.endsWith('/releases/latest')
    ? JSON.stringify({ tag_name: 'v7.0.1', draft: false, prerelease: false })
    : url.includes('/git/ref/') ? JSON.stringify({ object: { type: 'commit', sha: 'a'.repeat(40) } })
      : JSON.stringify({ sha: 'b'.repeat(40) });
  await expect(resolvePins(kit, ['actions/checkout'], { now: '2026-11-01', request })).rejects.toThrow();
});

test('generation rejects an official lookup that moves a previously reviewed release tag', async () => {
  const pack = kit.documents.find((document) => document.data.id === 'tool-versions')!.data;
  const config = (pack.lookups as Record<string, Record<string, unknown>>)['actions/checkout']!;
  const request = async (url: string) => url.includes('nodejs.org')
    ? JSON.stringify([{ version: 'v26.13.0', lts: 'LTS', date: '2026-10-28' }])
    : url.endsWith('/releases/latest') ? JSON.stringify({ tag_name: config.tag, draft: false, prerelease: false })
      : url.includes('/git/ref/') ? JSON.stringify({ object: { type: 'commit', sha: 'a'.repeat(40) } })
        : JSON.stringify({ sha: 'a'.repeat(40) });
  await expect(prepareGeneration(root, kit, createState(kit), { ids: ['ci'], now: '2026-11-01', request })).rejects.toThrow();
});
