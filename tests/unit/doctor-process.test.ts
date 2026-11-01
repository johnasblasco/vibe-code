import { fileURLToPath } from 'node:url';
import { expect, test, vi } from 'vitest';
import { runProcess as nativeProcess, safeEnvironment } from '../../src/doctor/process.js';
import type { ProcessRequest } from '../../src/doctor/process.js';
import { loadKit, loadYamlFile } from '../../src/data/loader.js';
const cwd = fileURLToPath(new URL('../../', import.meta.url));
const kit = await loadKit(cwd);
const policy = kit.documents.find((document) => document.path === 'beginner-course/verification.yaml')!.data;
const runProcess = (request: ProcessRequest) => nativeProcess({ timeoutMs: Number(policy.process_timeout_ms), maxBytes: Number(policy.process_max_bytes), ...request });

test('native verification requires explicit bounds rather than copying source-policy defaults into code', async () => {
  await expect(nativeProcess({ id: 'missing-bounds', command: 'node', args: ['--version'], cwd })).rejects.toThrow();
});

test('native requests have bounded output/time and support pre-aborted cancellation', async () => {
  expect((await runProcess({ id: 'version', command: 'node', args: ['--version'], cwd })).stdout).toMatch(/^v\d+\.\d+\.\d+/);
  const large = await runProcess({ id: 'large', command: 'node', args: ['-e', "process.stdout.write('x'.repeat(4096))"], cwd, maxBytes: 16 });
  expect(large).toEqual({ code: null, stdout: '', stderr: '' });
  const slow = await runProcess({ id: 'slow', command: 'node', args: ['-e', 'setInterval(()=>{},1000)'], cwd, timeoutMs: 30 });
  expect(slow.code).toBeNull();
  const abort = new AbortController(); abort.abort();
  expect((await runProcess({ id: 'cancel', command: 'node', args: ['--version'], cwd, signal: abort.signal })).code).toBeNull();
});

test('child processes do not inherit credentials or hostile Git/Docker overrides', async () => {
  vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'synthetic-private-value');
  vi.stubEnv('GIT_DIR', 'unrelated-repository'); vi.stubEnv('DOCKER_HOST', 'tcp://production.invalid:2376');
  try {
    const result = await runProcess({ id: 'env', command: 'node', cwd,
      args: ['-e', "process.stdout.write(JSON.stringify([process.env.AWS_SECRET_ACCESS_KEY,process.env.GIT_DIR,process.env.DOCKER_HOST]))"] });
    expect(result.stdout).toBe('[null,null,null]');
  } finally { vi.unstubAllEnvs(); }
});

test('Git receives its platform-compatible null configuration path', async () => {
  const scenario = (await loadYamlFile(cwd, 'tests/security-scenarios/doctor-integrity.yaml')).data.native_git_null as Record<string, string>;
  expect(safeEnvironment().GIT_CONFIG_GLOBAL).toBe(scenario[process.platform === 'win32' ? 'win32' : 'posix']);
});
