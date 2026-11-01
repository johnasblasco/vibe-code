import assert from 'node:assert/strict';
import { readFile, mkdtemp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, URL } from 'node:url';
import test from 'node:test';
import { parseDocument } from 'yaml';
import { createRelease, packMetadata, publishManifest, verifyPackList, verifyRuntimePackage } from '../../tools/create-release.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const manifest = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
const scenario = parseDocument(await readFile(new URL('../security-scenarios/npm-release.yaml', import.meta.url), 'utf8')).toJS();

test('staged public metadata exposes vibecode while the workspace retains its publication guard', () => {
  assert.equal(manifest.private, true); assert.equal(manifest.bin, undefined);
  const release = publishManifest(manifest, 'vibecode');
  assert.equal(release.name, '@johnasblasco/vibecode'); assert.equal(release.version, '0.1.0');
  assert.equal(release.license, 'MIT'); assert.equal(release.private, false);
  assert.deepEqual(release.bin, { vibecode: 'dist/cli/main.js' });
  assert.deepEqual(release.dependencies, manifest.dependencies);
  assert.deepEqual(release.bundleDependencies, Object.keys(manifest.dependencies));
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
  for (const input of Object.values(scenario.pack_metadata)) assert.deepEqual(packMetadata(input, manifest.name), row);
  for (const data of [[row, row], {}, { wrong: row }, { [manifest.name]: row, extra: row }, null]) {
    assert.throws(() => packMetadata(data, manifest.name));
  }
});

test('runtime bundles refuse version drift, altered dependencies, install hooks and missing licenses', () => {
  const row = { version: '1.0.0', license: 'MIT', dependencies: { child: '^2.0.0' } };
  const installed = { name: 'sample', ...row };
  assert.doesNotThrow(() => verifyRuntimePackage('node_modules/sample', row, installed, ['package.json', 'LICENSE']));
  for (const changed of [{ ...installed, version: '1.0.1' }, { ...installed, dependencies: { child: '*' } },
    { ...installed, scripts: { postinstall: 'unexpected' } }]) {
    assert.throws(() => verifyRuntimePackage('node_modules/sample', row, changed, ['package.json', 'LICENSE']));
  }
  assert.throws(() => verifyRuntimePackage('node_modules/sample', row, installed, ['package.json']));
  assert.throws(() => verifyRuntimePackage('node_modules/../escape', row, installed, ['LICENSE']));
});

test('native release pack includes the launcher, complete assets and only locked production dependencies', async () => {
  const result = await createRelease(root);
  const receipt = JSON.parse(await readFile(result.receipt, 'utf8'));
  assert.equal(receipt.name, '@johnasblasco/vibecode'); assert.equal(receipt.version, '0.1.0');
  assert.match(receipt.sha256, /^[a-f0-9]{64}$/); assert.match(receipt.integrity, /^sha512-/);
  const files = receipt.files;
  for (const path of ['dist/cli/main.js', 'LICENSE', 'release-lock.json', 'integrity/assets.json',
    'templates/project/.env.example.tmpl', 'templates/project/.gitignore.tmpl',
    'templates/project/.github/workflows/ci.yml.tmpl', 'skills/project-templates/deploy-checklist/SKILL.md']) assert.ok(files.includes(path), `missing ${path}`);
  assert.ok(!files.some((path) => /^(?:tests|tools|src|\.scaffolder|\.git)\//.test(path) || path === '.env' || path === 'package-lock.json'));
  const cli = await readFile(new URL('package/dist/cli/main.js', result.directoryUrl), 'utf8');
  assert.ok(cli.startsWith('#!/usr/bin/env node\n'));
  const lock = JSON.parse(await readFile(new URL('package/release-lock.json', result.directoryUrl), 'utf8'));
  assert.equal(lock.name, manifest.name); assert.equal(lock.version, manifest.version);
  assert.equal(lock.packages[''].devDependencies, undefined);
  assert.ok(Object.entries(lock.packages).every(([path, row]) => !path || !row.dev));
  assert.ok(!Object.keys(lock.packages).some((path) => /(?:vitest|eslint|typescript)/.test(path)));
  const workspaceLock = JSON.parse(await readFile(new URL('../../package-lock.json', import.meta.url), 'utf8'));
  const production = Object.entries(workspaceLock.packages).filter(([path, row]) => path && !row.dev);
  assert.equal(production.length, 8);
  assert.deepEqual(Object.keys(lock.packages).filter(Boolean).sort(), production.map(([path]) => path).sort());
  for (const [path, row] of production) {
    assert.deepEqual(lock.packages[path], row);
    const installed = JSON.parse(await readFile(new URL(`package/${path}/package.json`, result.directoryUrl), 'utf8'));
    assert.equal(installed.version, row.version);
    assert.ok(files.includes(`${path}/package.json`));
    assert.ok(files.some((file) => new RegExp(`^${path}/licen[cs]e(?:\\.[^/]+)?$`, 'i').test(file)), `license for ${path}`);
  }
  for (const file of files.filter((path) => path.startsWith('node_modules/'))) {
    assert.ok(production.some(([path]) => file.startsWith(`${path}/`)), `unlocked dependency: ${file}`);
  }
  assert.ok(!files.includes(scenario.removed_lockfile));
  assert.ok(files.includes(scenario.bundled_lock_record));
  // Extract into the OS temp directory, outside the checkout's ancestor resolution chain.
  const isolated = await mkdtemp(join(tmpdir(), 'vibecode-release-'));
  const unpacked = spawnSync('tar', ['-xzf', result.tarball, '-C', isolated], { shell: false, windowsHide: true, encoding: 'utf8', timeout: 30000 });
  assert.equal(unpacked.error, undefined); assert.equal(unpacked.status, 0, unpacked.stderr);
  for (const [path, hash] of Object.entries(receipt.bundledFiles)) {
    assert.equal(createHash('sha256').update(await readFile(join(isolated, 'package', path))).digest('hex'), hash);
  }
  const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    ['path', 'pathext', 'systemroot', 'windir', 'comspec', 'temp', 'tmp'].includes(key.toLowerCase())));
  for (const { args, status, output } of [
    { args: ['--help'], status: 0, output: /vibecode/ },
    { args: ['doctor', '--dry-run'], status: 3, output: /Planned check only/ },
  ]) {
    const smoke = spawnSync(process.execPath, [join(isolated, 'package/dist/cli/main.js'), ...args], {
      cwd: isolated, env: environment, shell: false, windowsHide: true, encoding: 'utf8', timeout: 30000,
    });
    assert.equal(smoke.error, undefined); assert.equal(smoke.status, status, smoke.stdout + smoke.stderr);
    assert.match(smoke.stdout, output);
  }
  process.stdout.write(`Extracted artifact smoke checks: --help and doctor --dry-run passed (${files.length} files).\n`);
});
