import { chmod, mkdtemp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { loadKit } from '../../src/data/loader.js';
import { runProcess as nativeProcess } from '../../src/doctor/process.js';
import type { ProcessRequest } from '../../src/doctor/process.js';
import { probeSecretHook } from '../../src/doctor/probe.js';
const kit = await loadKit(fileURLToPath(new URL('../../', import.meta.url)));
const policy = kit.documents.find((document) => document.path === 'beginner-course/verification.yaml')!.data;
const runProcess = (request: ProcessRequest) => nativeProcess({ timeoutMs: Number(policy.process_timeout_ms), maxBytes: Number(policy.process_max_bytes), ...request });

test('unsupported hooks are not executed and cannot be reported as scanner proof', async () => {
  const project = await mkdtemp(join(tmpdir(), 'scaffolder-unknown-hook-'));
  await mkdir(join(project, '.git/hooks'), { recursive: true });
  await writeFile(join(project, '.git/hooks/pre-commit'), '#!/bin/sh\nexit 0\n');
  const result = await probeSecretHook(kit, project, { process: async () => ({ code: 1, stdout: '', stderr: '' }) });
  expect(result.blocked).toBe(false); expect(result.unverified).toBe(true);
});

test('real Git controls produce no commit and leave the original index untouched', async () => {
  const project = await mkdtemp(join(tmpdir(), 'scaffolder-hook-project-'));
  const bin = join(project, 'bin'); await mkdir(bin);
  const scanner = join(bin, 'gitleaks');
  // Controlled detector fixture exercises Git/hook plumbing; it is not a real Gitleaks result.
  await writeFile(scanner, "#!/usr/bin/env node\nconst cp=require('node:child_process');const text=cp.execFileSync('git',['diff','--cached','--no-ext-diff'],{encoding:'utf8'});process.exit(text.includes('api_key')?42:0);\n");
  await chmod(scanner, 0o700);
  const env = { PATH: `${bin}${delimiter}${process.env.PATH ?? process.env.Path ?? ''}` };
  expect((await runProcess({ id: 'setup', command: 'git', args: ['init', '--template='], cwd: project, env })).code).toBe(0);
  await mkdir(join(project, '.githooks'));
  const hook = String((policy.probe as Record<string, unknown>).hook);
  await writeFile(join(project, '.githooks/pre-commit'), hook); await chmod(join(project, '.githooks/pre-commit'), 0o700);
  expect((await runProcess({ id: 'setup', command: 'git', args: ['config', 'core.hooksPath', '.githooks'], cwd: project, env })).code).toBe(0);
  const before = await readdir(join(project, '.git'));
  const result = await probeSecretHook(kit, project, { env, process: async (request) => request.id === 'scanner_version'
    ? { code: 0, stdout: 'gitleaks version 8.30.1', stderr: '' } : runProcess({ ...request, env }) });
  expect(result).toMatchObject({ blocked: true, cleaned: true });
  expect(await readdir(join(project, '.git'))).toEqual(before);
  expect(await readFile(join(project, '.githooks/pre-commit'), 'utf8')).toBe(hook);
  expect((await runProcess({ id: 'head', command: 'git', args: ['rev-parse', '--verify', 'HEAD'], cwd: project, env })).code).not.toBe(0);
});
