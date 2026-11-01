import { fileURLToPath } from 'node:url';
import { expect, test, vi } from 'vitest';
import { loadKit, loadYamlFile } from '../../src/data/loader.js';
import { createState } from '../../src/state/index.js';
import { doctor } from '../../src/doctor/index.js';
import type { ProcessRequest } from '../../src/doctor/process.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const kit = await loadKit(root);
const head = 'a'.repeat(40);
const integrity = (await loadYamlFile(root, 'tests/security-scenarios/doctor-integrity.yaml')).data;
function processes(overrides: Record<string, string | number> = {}) {
  return vi.fn(async (request: ProcessRequest) => {
    const output = overrides[request.id] ?? ({ node_version: 'v26.13.0', git_version: 'git version 2.50.1',
      docker_version: 'Docker version 28.0.0', docker_context: '"unix:///var/run/docker.sock"', docker_info: '28.0.0',
      git_head: head, git_branch: 'main', git_ignore: '.env\n.env.local\n', git_tracked: '',
    } as Record<string, string>)[request.id] ?? '';
    return { code: typeof output === 'number' ? output : 0, stdout: typeof output === 'string' ? output : '', stderr: '' };
  });
}

test('doctor stage 0 checks current tool versions and only a local Docker engine', async () => {
  const process = processes();
  const result = await doctor(kit, createState(kit), 'stage-0', { project: root, process });
  expect(result.gate.allowed).toBe(true);
  expect(result.gate.checks.map((check) => check.status)).toEqual(['passed', 'passed', 'passed']);
  expect(process.mock.calls.some(([request]) => request.id === 'docker_info')).toBe(true);
});

test('unsupported Node and missing Git block; remote Docker endpoints are never contacted', async () => {
  const process = processes({ node_version: 'v20.0.0', git_version: 127, docker_context: '"tcp://production.invalid:2376"' });
  const result = await doctor(kit, createState(kit), 'stage-0', { project: root, process });
  expect(result.gate.allowed).toBe(false);
  expect(result.gate.checks.every((check) => check.status !== 'passed')).toBe(true);
  expect(process.mock.calls.some(([request]) => request.id === 'docker_info')).toBe(false);
});

test('manual evidence is current and labelled; saved progress does not grant gate passage', async () => {
  const state = createState(kit); state.progress.stage = 'operate';
  const process = processes();
  const probe = vi.fn(async () => ({ blocked: true, cleaned: true }));
  const confirmed = await doctor(kit, state, 'stage-1', { project: root, process, probe, probeAllowed: true, attest: async () => true });
  expect(confirmed.gate.allowed).toBe(true);
  expect(confirmed.manualRecords).toHaveLength(2);
  expect(confirmed.gate.checks.filter((check) => check.kind === 'manual').every((check) => check.status === 'manual')).toBe(true);
  expect(probe).toHaveBeenCalledTimes(1);
  const resumed = await doctor(kit, state, 'stage-1', { project: root, process });
  expect(resumed.gate.allowed).toBe(false);
  expect(resumed.manualRecords).toEqual([]);
});

test('secret ignore checks reject an ignored example or a tracked secret path', async () => {
  for (const overrides of [{ git_ignore: '.env\n.env.local\n.env.example\n' }, { git_tracked: '.env\0' }]) {
    const result = await doctor(kit, createState(kit), 'stage-1', { project: root, process: processes(overrides) });
    expect(result.gate.checks.find((check) => check.id === 'git.init_ignore/1')?.status).toBe('failed');
  }
});

test('dry run and ungranted probe/network capabilities perform no corresponding IO', async () => {
  const process = processes(); const page = vi.fn(async () => ({ status: 200, body: 'version-1' }));
  const probe = vi.fn(async () => ({ blocked: true, cleaned: true }));
  const result = await doctor(kit, createState(kit), 'stage-2', { project: root, process, page, probe, dryRun: true });
  expect(result.gate.allowed).toBe(false); expect(process).not.toHaveBeenCalled();
  expect(page).not.toHaveBeenCalled(); expect(probe).not.toHaveBeenCalled();
});

test('preview requires current version and latest CI success for this HEAD and branch', async () => {
  const page = vi.fn(async () => ({ status: 200, body: '<p>version-1</p>' }));
  const ci = vi.fn<(url: string) => Promise<unknown>>(async () => ({ workflow_runs: [
    { head_sha: head, head_branch: 'main', run_number: 5, run_attempt: 1, status: 'completed', conclusion: 'success', head_repository: { full_name: 'owner/project' } },
  ] }));
  const context = { project: root, process: processes(), page, ci, remoteAllowed: true, nonProduction: true,
    previewUrl: 'https://preview.example.org/', expectedVersion: 'version-1', repository: 'owner/project',
    probeAllowed: true, probe: async () => ({ blocked: true, cleaned: true }), attest: async () => true };
  expect((await doctor(kit, createState(kit), 'stage-2', context)).gate.allowed).toBe(true);
  ci.mockResolvedValueOnce({ workflow_runs: [
    { head_sha: head, head_branch: 'main', run_number: 6, run_attempt: 1, status: 'completed', conclusion: 'failure', head_repository: { full_name: 'owner/project' } },
    { head_sha: head, head_branch: 'main', run_number: 5, run_attempt: 1, status: 'completed', conclusion: 'success', head_repository: { full_name: 'owner/project' } },
  ] });
  expect((await doctor(kit, createState(kit), 'stage-2', context)).gate.allowed).toBe(false);
  ci.mockResolvedValueOnce({ workflow_runs: [
    { head_sha: head, head_branch: 'main', run_number: integrity.malformed_ci_run_number, run_attempt: 1, status: 'completed', conclusion: 'success', head_repository: { full_name: 'owner/project' } },
  ] });
  expect((await doctor(kit, createState(kit), 'stage-2', context)).gate.allowed).toBe(false);
  expect(ci.mock.calls[0]?.[0]).toContain(`/actions/workflows/ci.yml/runs?head_sha=${head}`);
});

test('secret-shaped repository input is rejected before any process or remote request', async () => {
  const process = processes(); const ci = vi.fn(async () => ({ workflow_runs: [] }));
  const repository = `owner/ghp_${'a'.repeat(36)}`; // Synthetic detector fixture, not a real credential.
  await expect(doctor(kit, createState(kit), 'stage-2', { project: root, process, ci,
    remoteAllowed: true, nonProduction: true, repository })).rejects.toThrow();
  expect(process).not.toHaveBeenCalled(); expect(ci).not.toHaveBeenCalled();
});

test('a tampered verification descriptor cannot turn a version check into a mutating command', async () => {
  const cloned = structuredClone(kit);
  const data = cloned.documents.find((document) => document.path === 'beginner-course/verification.yaml')!.data;
  const descriptor = integrity.unsafe_descriptor as { id: string; command: string; args: string[] };
  (data.commands as Record<string, unknown>)[descriptor.id] = { command: descriptor.command, args: descriptor.args };
  const process = processes(); // Mock only: no mutating command is executed by this regression.
  await expect(doctor(cloned, createState(cloned), 'stage-0', { project: root, process })).rejects.toThrow();
  expect(process).not.toHaveBeenCalled();
});
