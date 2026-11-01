import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import test from 'node:test';
import { createRelease, packMetadata, publishManifest, verifyPackList } from '../../tools/create-release.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const manifest = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));

test('staged public metadata exposes vibecode while the workspace retains its publication guard', () => {
  assert.equal(manifest.private, true); assert.equal(manifest.bin, undefined);
  const release = publishManifest(manifest, 'vibecode');
  assert.equal(release.name, '@johnasblasco/vibecode'); assert.equal(release.version, '0.1.0');
  assert.equal(release.license, 'MIT'); assert.equal(release.private, false);
  assert.deepEqual(release.bin, { vibecode: 'dist/cli/main.js' });
  assert.deepEqual(release.dependencies, manifest.dependencies);
  assert.equal(release.devDependencies, undefined); assert.equal(release.scripts, undefined);
  assert.deepEqual(release.publishConfig, { access: 'public', registry: 'https://registry.npmjs.org/' });
  assert.throws(() => publishManifest(manifest));
  assert.throws(() => publishManifest({ ...manifest, version: 'latest' }, 'vibecode'));
  assert.throws(() => publishManifest({ ...manifest, private: false }, 'vibecode'));
});

test('packed inventory rejects omissions, additions and duplicate paths', () => {
  const expected = ['package.json', 'templates/project/.env.example.tmpl'];
  assert.doesNotThrow(() => verifyPackList(expected.map((path) => ({ path })), expected));
  for (const paths of [[expected[0]], [...expected, '.env'], [...expected, expected[0]], [...expected, '../escape']]) {
    assert.throws(() => verifyPackList(paths.map((path) => ({ path })), expected));
  }
});

test('npm pack metadata accepts one named package in both supported JSON layouts', () => {
  const row = { name: manifest.name, version: manifest.version };
  assert.deepEqual(packMetadata([row], manifest.name), row);
  assert.deepEqual(packMetadata({ [manifest.name]: row }, manifest.name), row);
  for (const data of [[row, row], {}, { wrong: row }, { [manifest.name]: row, extra: row }, null]) {
    assert.throws(() => packMetadata(data, manifest.name));
  }
});

test('native release pack includes the launcher, complete assets and only locked production dependencies', async () => {
  const result = await createRelease(root);
  const receipt = JSON.parse(await readFile(result.receipt, 'utf8'));
  assert.equal(receipt.name, '@johnasblasco/vibecode'); assert.equal(receipt.version, '0.1.0');
  assert.match(receipt.sha256, /^[a-f0-9]{64}$/); assert.match(receipt.integrity, /^sha512-/);
  const files = receipt.files;
  for (const path of ['dist/cli/main.js', 'LICENSE', 'npm-shrinkwrap.json', 'integrity/assets.json',
    'templates/project/.env.example.tmpl', 'templates/project/.gitignore.tmpl',
    'templates/project/.github/workflows/ci.yml.tmpl', 'skills/project-templates/deploy-checklist/SKILL.md']) assert.ok(files.includes(path), `missing ${path}`);
  assert.ok(!files.some((path) => /^(?:tests|tools|src|node_modules|\.scaffolder|\.git)\//.test(path) || path === '.env' || path === 'package-lock.json'));
  const cli = await readFile(new URL('package/dist/cli/main.js', result.directoryUrl), 'utf8');
  assert.ok(cli.startsWith('#!/usr/bin/env node\n'));
  const shrinkwrap = JSON.parse(await readFile(new URL('package/npm-shrinkwrap.json', result.directoryUrl), 'utf8'));
  assert.equal(shrinkwrap.name, manifest.name); assert.equal(shrinkwrap.version, manifest.version);
  assert.equal(shrinkwrap.packages[''].devDependencies, undefined);
  assert.ok(Object.entries(shrinkwrap.packages).every(([path, row]) => !path || !row.dev));
  assert.ok(!Object.keys(shrinkwrap.packages).some((path) => /(?:vitest|eslint|typescript)/.test(path)));
});
