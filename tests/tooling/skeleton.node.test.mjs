import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

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
