import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { chmod, lstat, mkdir, mkdtemp, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { parseDocument } from 'yaml';
import { assetRoots, collectAssets, digest, inventoryPath, readAsset, readInventory } from '../src/security/assets.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const registry = 'https://registry.npmjs.org/';
function fail() { throw new Error('Release packaging refused'); }
const exact = (value) => typeof value === 'string' && /^\d+\.\d+\.\d+$/.test(value);

export function publishManifest(workspace, commandName) {
  if (!workspace || workspace.private !== true || typeof workspace.name !== 'string' || !/^@[a-z0-9_-]+\/[a-z0-9_-]+$/.test(workspace.name) ||
      !exact(workspace.version) || workspace.license !== 'MIT' || typeof commandName !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(commandName) ||
      !workspace.dependencies || !Object.values(workspace.dependencies).every(exact)) fail();
  return { name: workspace.name, version: workspace.version, description: workspace.description,
    author: workspace.author, license: workspace.license, type: 'module', private: false,
    repository: workspace.repository, homepage: workspace.homepage, bugs: workspace.bugs,
    engines: workspace.engines, bin: { [commandName]: 'dist/cli/main.js' },
    files: ['dist', ...assetRoots, inventoryPath, 'README.md', 'LICENSE', 'release-lock.json'],
    dependencies: workspace.dependencies, bundleDependencies: Object.keys(workspace.dependencies),
    publishConfig: { access: 'public', registry } };
}
export function verifyPackList(files, expected) {
  if (!Array.isArray(files) || !files.every((file) => file && typeof file.path === 'string')) fail();
  const actual = files.map((file) => file.path).sort(); const wanted = [...expected].sort();
  if (new Set(actual).size !== actual.length || actual.length !== wanted.length || actual.some((path, index) => path !== wanted[index])) fail();
}
export function packMetadata(data, name) {
  if (Array.isArray(data) && data.length === 1 && data[0]?.name === name) return data[0];
  if (data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 1 &&
      Object.hasOwn(data, name) && data[name]?.name === name) return data[name];
  fail();
}
async function walk(directory, prefix = '') {
  if ((await lstat(directory)).isSymbolicLink()) fail();
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) fail();
    const path = prefix + entry.name;
    if (entry.isDirectory()) files.push(...await walk(join(directory, entry.name), `${path}/`));
    else if (entry.isFile()) files.push(path);
    else fail();
  }
  return files.sort();
}
async function ownedParents(base, path) {
  let current = base;
  for (const part of path.split('/')) {
    if (!/^@?[A-Za-z0-9._-]+$/.test(part) || part === '.' || part === '..') fail();
    current = join(current, part);
    try { await mkdir(current, { mode: 0o700 }); } catch (error) { if (error.code !== 'EEXIST') throw error; }
    const info = await lstat(current); if (!info.isDirectory() || info.isSymbolicLink()) fail();
  }
  return current;
}
async function put(base, path, text) {
  const parts = path.split('/'); const name = parts.pop();
  const directory = parts.length ? await ownedParents(base, parts.join('/')) : base;
  await writeFile(join(directory, name), text, { encoding: 'utf8', flag: 'wx', mode: 0o644 });
}
function childEnv() {
  const names = new Set(['path', 'pathext', 'systemroot', 'windir', 'comspec', 'temp', 'tmp', 'home', 'userprofile', 'appdata', 'localappdata']);
  return Object.fromEntries(Object.entries(process.env).filter(([key]) => names.has(key.toLowerCase())));
}
function nodeRun(script, args, cwd) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd, env: childEnv(),
    encoding: 'utf8', shell: false, windowsHide: true, timeout: 30000, maxBuffer: 2_000_000 });
  if (result.error || result.status !== 0 || result.signal) fail();
  return result.stdout;
}
function productionLock(lock, manifest) {
  if (lock.lockfileVersion !== 3 || lock.name !== manifest.name || lock.version !== manifest.version ||
      JSON.stringify(lock.packages?.['']?.dependencies) !== JSON.stringify(manifest.dependencies)) fail();
  const packages = { '': { name: manifest.name, version: manifest.version, license: manifest.license,
    dependencies: manifest.dependencies, engines: manifest.engines } };
  for (const [path, row] of Object.entries(lock.packages)) {
    if (!path || row.dev) continue;
    if (!path.startsWith('node_modules/') || row.link || !row.resolved?.startsWith(registry) ||
        !/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(row.integrity)) fail();
    packages[path] = row;
  }
  for (const [name, version] of Object.entries(manifest.dependencies)) if (packages[`node_modules/${name}`]?.version !== version) fail();
  return { name: manifest.name, version: manifest.version, lockfileVersion: 3, requires: true, packages };
}

export function verifyRuntimePackage(path, row, installed, files) {
  const dependencies = Object.entries(row.dependencies ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const actualDependencies = Object.entries(installed.dependencies ?? {}).sort(([a], [b]) => a.localeCompare(b));
  if (!/^node_modules\/(?:@[a-z0-9_-]+\/)?[a-z0-9_-]+$/.test(path) ||
      !exact(row.version) || installed.name !== path.slice('node_modules/'.length) || installed.version !== row.version ||
      JSON.stringify(actualDependencies) !== JSON.stringify(dependencies) ||
      !['MIT', 'ISC'].includes(installed.license) || installed.license !== row.license ||
      ['preinstall', 'install', 'postinstall'].some((hook) => Object.hasOwn(installed.scripts ?? {}, hook)) ||
      !files.some((file) => /^licen[cs]e(?:\.[^/]+)?$/i.test(file)) || files.some((file) => file.startsWith('node_modules/'))) fail();
}

async function bundleRuntime(base, stage, lock) {
  const hashes = {};
  for (const [path, row] of Object.entries(lock.packages)) {
    if (!path) continue;
    const source = join(base, path); const files = await walk(source);
    const installed = JSON.parse(await readFile(join(source, 'package.json'), 'utf8'));
    verifyRuntimePackage(path, row, installed, files);
    for (const file of files) {
      const bytes = await readFile(join(source, file)); const target = `${path}/${file}`;
      await put(stage, target, bytes);
      hashes[target] = createHash('sha256').update(bytes).digest('hex');
    }
  }
  return hashes;
}

/** Offline packing only: never installs, publishes, runs hooks, or removes a release directory. */
export async function createRelease(workspaceRoot = root) {
  const base = await realpath(workspaceRoot);
  const workspace = JSON.parse(await readAsset(base, 'package.json'));
  const inventory = await readInventory(base); const assets = await collectAssets(base);
  if (assets.size !== Object.keys(inventory.files).length || [...assets].some(([path, text]) => digest(text) !== inventory.files[path])) fail();
  const ui = parseDocument(assets.get('beginner-course/interview-ui.yaml')).toJS();
  const manifest = publishManifest(workspace, ui.command_name);
  const lock = productionLock(JSON.parse(await readAsset(base, 'package-lock.json')), manifest);
  const license = await readAsset(base, 'LICENSE'); const readme = await readAsset(base, 'release/README.md');
  const sourceFiles = await walk(join(base, 'src'));
  const javascript = sourceFiles.filter((path) => path.endsWith('.ts') && !path.endsWith('.d.ts')).map((path) => `dist/${path.slice(0, -3)}.js`);
  if (!javascript.includes(manifest.bin[ui.command_name])) fail();
  const releases = await ownedParents(base, '.tooling-build/releases');
  const directory = await mkdtemp(join(releases, 'vibecode-')); const stage = await ownedParents(directory, 'package');
  const relation = relative(base, await realpath(directory));
  if (!relation.startsWith(`.tooling-build${sep}releases${sep}`)) fail();
  nodeRun(join(base, 'node_modules/typescript/bin/tsc'), ['--project', join(base, 'tsconfig.build.json'),
    '--outDir', join(stage, 'dist'), '--newLine', 'lf'], base);
  verifyPackList((await walk(join(stage, 'dist'), 'dist/')).map((path) => ({ path })), javascript);
  for (const [path, text] of assets) await put(stage, path, text);
  await put(stage, inventoryPath, JSON.stringify(inventory, null, 2) + '\n');
  await put(stage, 'package.json', JSON.stringify(manifest, null, 2) + '\n');
  await put(stage, 'release-lock.json', JSON.stringify(lock, null, 2) + '\n');
  const bundledFiles = await bundleRuntime(base, stage, lock);
  await put(stage, 'README.md', readme); await put(stage, 'LICENSE', license);
  const entry = join(stage, manifest.bin[ui.command_name]);
  if (!(await readFile(entry, 'utf8')).startsWith('#!/usr/bin/env node\n')) fail();
  await chmod(entry, 0o755);
  const userconfig = join(directory, 'pack-user.npmrc'); const globalconfig = join(directory, 'pack-global.npmrc');
  await writeFile(userconfig, '', { flag: 'wx', mode: 0o600 }); await writeFile(globalconfig, '', { flag: 'wx', mode: 0o600 });
  const npm = join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
  // npm may be installed separately from Node; npm run supplies its already installed JS entry.
  const npmScript = process.env.npm_execpath && /npm-cli\.js$/i.test(process.env.npm_execpath) ? process.env.npm_execpath : npm;
  const cache = await ownedParents(base, '.npm-cache');
  const output = nodeRun(npmScript, ['pack', '--offline', '--ignore-scripts', '--json', '--pack-destination', directory,
    '--cache', cache, '--userconfig', userconfig, '--globalconfig', globalconfig], stage);
  const packed = packMetadata(JSON.parse(output), manifest.name);
  if (!packed || packed.name !== manifest.name || packed.version !== manifest.version ||
      !/^[A-Za-z0-9._-]+\.tgz$/.test(packed.filename) || !/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(packed.integrity)) fail();
  const expected = [...javascript, ...assets.keys(), inventoryPath, 'package.json', 'release-lock.json', 'README.md', 'LICENSE', ...Object.keys(bundledFiles)];
  verifyPackList(packed.files, expected);
  const tarball = join(directory, packed.filename); const bytes = await readFile(tarball);
  if (`sha512-${createHash('sha512').update(bytes).digest('base64')}` !== packed.integrity) fail();
  const receipt = join(directory, 'receipt.json');
  const record = { name: manifest.name, version: manifest.version, license: manifest.license,
    tarball: packed.filename, sha256: createHash('sha256').update(bytes).digest('hex'), integrity: packed.integrity,
    files: packed.files.map((file) => file.path).sort(), bundledFiles };
  await writeFile(receipt, JSON.stringify(record, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return { ...record, directory, directoryUrl: pathToFileURL(directory + sep), tarball, receipt };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 2) fail();
    const result = await createRelease();
    process.stdout.write(`Packed ${result.name}@${result.version} (${result.files.length} files, ${result.license})\n`);
    process.stdout.write(`Tarball: ${relative(root, result.tarball)}\nSHA-256: ${result.sha256}\nReceipt: ${relative(root, result.receipt)}\n`);
    process.stdout.write('No installation or publication was performed. Review the package before proceeding.\n');
  } catch { process.stderr.write('Release packaging failed. No install or publish was attempted.\n'); process.exitCode = 1; }
}
