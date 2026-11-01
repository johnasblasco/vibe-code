import assert from 'node:assert/strict';
import { globSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../../', import.meta.url));

test('the lockfile excludes minimatch versions affected by GHSA-g3hv-75wg-m249', () => {
  const lock = JSON.parse(readFileSync(new URL('../../package-lock.json', import.meta.url), 'utf8'));
  for (const [path, entry] of Object.entries(lock.packages)) {
    if (!/(?:^|\/)node_modules\/minimatch$/.test(path)) continue;
    const version = entry.version;
    const match = /^(\d+)\.(\d+)\.(\d+)(?:\+.*)?$/.exec(version);
    assert.ok(match, `Unverified minimatch version in ${path}: ${version}`);
    const [, major, minor, patch] = match.map(Number);
    const patched = major > 11 || (major === 11 && (minor > 0 || (minor === 0 && patch >= 1)));
    assert.ok(patched, `${path} uses affected minimatch ${version}; advisory patched floor is 11.0.1`);
  }
});

test('lint still discovers every source and unit-test TypeScript file', () => {
  const cli = fileURLToPath(new URL('../../node_modules/eslint/bin/eslint.js', import.meta.url));
  const result = spawnSync(process.execPath, [cli, 'src', 'tests/unit', '--format', 'json'], {
    cwd: root, encoding: 'utf8', timeout: 30000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const actual = JSON.parse(result.stdout).map((entry) => resolve(entry.filePath)).sort();
  const expected = globSync(['src/**/*.ts', 'tests/unit/**/*.ts'], { cwd: root })
    .map((path) => resolve(root, path)).sort();
  assert.ok(expected.length > 0);
  assert.deepEqual(actual, expected);
});
