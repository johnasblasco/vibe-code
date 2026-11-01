import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';

const root = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const run = (path, args, input) => spawnSync(process.execPath,
  [fileURLToPath(new URL(path, root)), ...args],
  { cwd: fileURLToPath(root), input, encoding: 'utf8', timeout: 30000 });

test('lint rejects an unused variable through the real CLI', () => {
  const result = run('node_modules/eslint/bin/eslint.js',
    ['--stdin', '--stdin-filename', 'src/probe.ts'], 'const unused = 1;');
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /@typescript-eslint\/no-unused-vars/);
});

test('typecheck rejects incorrect types using the project compiler settings', () => {
  const result = run('node_modules/typescript/bin/tsc',
    ['--project', 'tests/tooling/fixtures/tsconfig.json']);
  assert.equal(result.error, undefined);
  assert.equal(result.status, 2, result.stdout + result.stderr);
  assert.match(result.stdout + result.stderr, /TS2322/);
});

test('Vitest returns failure for a deliberately failing assertion', () => {
  const result = run('node_modules/vitest/vitest.mjs',
    ['run', '--config', 'tests/tooling/fixtures/vitest.config.mjs']);
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout + result.stderr, /expected true to be false/);
});

test('root package exposes independent checks without application features', () => {
  const manifest = JSON.parse(read('package.json'));
  assert.equal(manifest.type, 'module');
  assert.equal(manifest.private, true);
  assert.equal(manifest.scripts.lint, 'eslint . --max-warnings 0');
  assert.equal(manifest.scripts.typecheck, 'tsc --noEmit');
  assert.equal(manifest.scripts.test, 'vitest run');
  assert.equal(manifest.scripts.postinstall, undefined);
  assert.equal(manifest.bin, undefined);
});

test('CI pins every action and runs the local checks on all supported platforms', () => {
  const workflow = read('.github/workflows/ci.yml');
  const actions = [...workflow.matchAll(/uses:\s*(\S+)/g)].map((match) => match[1]);
  assert.equal(actions.length, 3);
  for (const action of actions) assert.match(action, /^actions\/[a-z-]+@[a-f0-9]{40}$/);
  for (const platform of ['ubuntu-latest', 'windows-latest', 'macos-latest']) {
    assert.ok(workflow.includes(platform), `missing platform: ${platform}`);
  }
  for (const command of ['npm ci', 'npm run lint', 'npm run typecheck', 'npm test']) {
    assert.ok(workflow.includes(command), `missing command: ${command}`);
  }
  assert.match(workflow, /permissions: \{\}/);
  assert.match(workflow, /persist-credentials: false/);
  assert.ok(!workflow.includes('pull_request_target'));
});
