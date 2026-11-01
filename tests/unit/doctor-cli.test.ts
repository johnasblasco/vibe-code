import { mkdtemp, mkdir, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, vi } from 'vitest';
import { runCli, EXIT } from '../../src/cli/program.js';
import { loadCourse } from '../../src/course/state.js';
import type { ProcessRequest } from '../../src/doctor/process.js';
import { loadYamlFile } from '../../src/data/loader.js';
const kitRoot = fileURLToPath(new URL('../../', import.meta.url));
const tools = () => vi.fn(async (request: ProcessRequest) => ({ code: 0, stderr: '', stdout:
  ({ node_version: 'v26.13.0', git_version: 'git version 2.50.1', docker_version: 'Docker version 28.0.0',
    docker_context: '"unix:///var/run/docker.sock"', docker_info: '28.0.0' } as Record<string, string>)[request.id] ?? '' }));
async function fixture() {
  const project = await mkdtemp(join(tmpdir(), 'scaffolder-doctor-cli-')); let output = '';
  return { project, io: { kitRoot, tty: false, out: (text: string) => { output += text; }, err: (text: string) => { output += text; } }, output: () => output };
}

test('doctor dry run lists checks without processes, network, prompts, or file creation', async () => {
  const f = await fixture(); const process = tools(); const page = vi.fn(async () => ({ status: 200, body: 'unused' }));
  expect(await runCli(['doctor', '--project', f.project, '--dry-run'], { ...f.io, doctorAdapters: { process, page } })).toBe(EXIT.BLOCKED);
  expect(process).not.toHaveBeenCalled(); expect(page).not.toHaveBeenCalled();
  expect(f.output()).toContain('unverified'); expect(await readdir(f.project)).toEqual([]);
});

test('doctor and explicit gates verification use fresh checks; ordinary gates stay inspect-only', async () => {
  const f = await fixture(); const process = tools(); const io = { ...f.io, doctorAdapters: { process } };
  expect(await runCli(['doctor', '--project', f.project], io)).toBe(EXIT.SUCCESS);
  expect(await runCli(['gates', 'stage-1', '--verify', '--project', f.project], io)).toBe(EXIT.SUCCESS);
  expect(process.mock.calls.filter(([request]) => request.id === 'node_version')).toHaveLength(2);
});

test('noninteractive probe/network options cannot grant permission to their adapters', async () => {
  const f = await fixture(); const probe = vi.fn(async () => ({ blocked: true, cleaned: true }));
  const page = vi.fn(async () => ({ status: 200, body: 'version-1' }));
  const args = ['doctor', '--stage', 'stage-2', '--project', f.project, '--probe-secrets', '--non-production',
    '--preview-url', 'https://preview.example.org/', '--expected-version', 'version-1', '--repository', 'owner/project'];
  expect(await runCli(args, { ...f.io, doctorAdapters: { process: tools(), probe, page } })).toBe(EXIT.BLOCKED);
  expect(probe).not.toHaveBeenCalled(); expect(page).not.toHaveBeenCalled();
});

test('course mode views source cards and saves advancement only after the gate passes', async () => {
  const f = await fixture(); const io = { ...f.io, doctorAdapters: { process: tools() } };
  expect(await runCli(['next', '--course', '--project', f.project], io)).toBe(EXIT.SUCCESS);
  expect(f.output()).toContain('Your computer needs');
  expect(f.output()).not.toContain('"runner"');
  expect(f.output()).not.toContain('"record"');
  expect(f.output()).not.toContain('auto_detect');
  expect(await runCli(['next', '--course', '--advance', '--project', f.project], io)).toBe(EXIT.SUCCESS);
  expect((await loadCourse(f.project)).current_stage).toBe('stage-1');
  expect(await runCli(['next', '--course', '--advance', '--project', f.project], io)).toBe(EXIT.BLOCKED);
  expect((await loadCourse(f.project)).current_stage).toBe('stage-1');
});

test('an invalid course file does not leak a SIGINT listener', async () => {
  const f = await fixture(); await mkdir(join(f.project, '.scaffolder'));
  const scenario = (await loadYamlFile(kitRoot, 'tests/security-scenarios/doctor-integrity.yaml')).data.corrupt_course as { payload: string; expected_listener_delta: number };
  await writeFile(join(f.project, '.scaffolder/course.json'), scenario.payload);
  const before = process.listenerCount('SIGINT');
  expect(await runCli(['next', '--course', '--project', f.project], f.io)).toBe(EXIT.ERROR);
  expect(process.listenerCount('SIGINT')).toBe(before + scenario.expected_listener_delta);
});

test('probe consent shows the actual supported hook before any probe is allowed', async () => {
  const f = await fixture(); const probe = vi.fn(async () => ({ blocked: true, cleaned: true }));
  const doctorPortFactory = () => ({ confirm: async () => false, attest: async () => false });
  expect(await runCli(['doctor', '--stage', 'stage-1', '--project', f.project, '--probe-secrets'],
    { ...f.io, tty: true, doctorPortFactory, doctorAdapters: { process: tools(), probe } })).toBe(EXIT.BLOCKED);
  expect(f.output()).toContain('exec gitleaks git --pre-commit');
  expect(probe).not.toHaveBeenCalled();
});

test('remote consent reviews the designated preview origin and CI repository before requesting access', async () => {
  const f = await fixture(); const reviews: string[] = [];
  const page = vi.fn(async () => ({ status: 200, body: 'version-1' }));
  const doctorPortFactory = () => ({ confirm: async () => { reviews.push(f.output()); return false; }, attest: async () => false });
  const args = ['doctor', '--stage', 'stage-2', '--project', f.project, '--preview-url', 'https://preview.example.org/',
    '--repository', 'owner/project', '--non-production'];
  expect(await runCli(args, { ...f.io, tty: true, doctorPortFactory, doctorAdapters: { process: tools(), page } })).toBe(EXIT.BLOCKED);
  expect(reviews[0]).toContain('https://preview.example.org'); expect(reviews[0]).toContain('owner/project');
  expect(page).not.toHaveBeenCalled();
});
