import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, realpath, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { URL } from 'node:url';
import test from 'node:test';
import { parseDocument } from 'yaml';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
const workflow = async (path) => parseDocument(await read(path)).toJS();

test('CI prepares Python and physical temporary paths before application/reference tests', async () => {
  const ci = await workflow('.github/workflows/ci.yml'); const steps = ci.jobs.checks.steps;
  const tests = steps.findIndex((step) => step.run === 'npm test');
  const yaml = steps.findIndex((step) => step.run?.includes('pip install') && step.run.includes('PyYAML==6.0.3'));
  assert.ok(yaml >= 0 && yaml < tests, 'PyYAML must be installed before npm test');
  const temp = steps.findIndex((step) => step.run === 'node tools/ci-environment.mjs');
  assert.ok(temp >= 0 && temp < tests);
  assert.equal(steps[tests].env.SCAFFOLDER_PYTHON, '${{ steps.python.outputs.python-path }}');
  assert.equal(steps.find((step) => step.uses?.startsWith('actions/setup-python@')).id, 'python');
  assert.ok(Object.hasOwn(ci.on, 'workflow_call'));
  assert.ok(steps.some((step) => step.run === 'npm run test:publishing'));
});

test('publishing requires release checks, limits OIDC to its publisher and uses only pinned actions', async () => {
  const publish = await workflow('.github/workflows/publish.yml');
  assert.deepEqual(publish.on, { release: { types: ['published'] } });
  assert.deepEqual(publish.permissions, {});
  assert.equal(publish.jobs.checks.uses, './.github/workflows/ci.yml');
  assert.equal(publish.jobs.checks.permissions['id-token'], undefined);
  const job = publish.jobs.publish;
  assert.equal(job.needs, 'checks'); assert.equal(job['runs-on'], 'ubuntu-latest');
  assert.deepEqual(job.permissions, { contents: 'read', 'id-token': 'write' });
  assert.match(job.if, /johnasblasco\/vibe-code/);
  assert.match(job.if, /prerelease/);
  assert.equal(publish.concurrency['cancel-in-progress'], false);
  for (const step of job.steps) {
    if (step.uses) assert.match(step.uses, /^actions\/[a-z-]+@[a-f0-9]{40}$/);
    assert.ok(!step.run?.includes('${{'), 'event data belongs in environment, never in shell programs');
  }
  const checkout = job.steps.find((step) => step.uses?.startsWith('actions/checkout@'));
  assert.equal(checkout.with['persist-credentials'], false);
  assert.equal(checkout.with.ref, '${{ github.sha }}');
  const prepare = job.steps.findIndex((step) => step.run === 'npm run release:prepare');
  const upload = job.steps.findIndex((step) => step.run?.startsWith('npm publish '));
  assert.ok(prepare >= 0 && upload > prepare);
  assert.match(job.steps[upload].run, /"\$RELEASE_TARBALL"/);
  for (const flag of ['--access public', '--provenance', '--ignore-scripts', '--registry=https://registry.npmjs.org/']) {
    assert.ok(job.steps[upload].run.includes(flag));
  }
  const text = await read('.github/workflows/publish.yml');
  assert.ok(!/NPM_TOKEN|NODE_AUTH_TOKEN|secrets:|pull_request_target/.test(text));
});

test('release identity accepts the next version and refuses wrong tags, repositories, commits and lock metadata', async () => {
  const { validateRelease } = await import('../../tools/prepare-publish.mjs');
  const source = JSON.parse(await read('package.json'));
  for (const version of ['0.1.0', '0.1.1']) {
    const manifest = { ...source, version };
    const lock = { name: manifest.name, version, packages: { '': { name: manifest.name, version } } };
    const context = { event: 'release', repository: 'johnasblasco/vibe-code', tag: `v${version}`,
      ref: `refs/tags/v${version}`, sha: 'a'.repeat(40), head: 'a'.repeat(40), draft: false, prerelease: false };
    assert.doesNotThrow(() => validateRelease(manifest, lock, context));
    for (const changed of [{ tag: 'v9.9.9' }, { tag: 'v0.1.1;unexpected' }, { repository: 'other/vibe-code' },
      { sha: 'b'.repeat(40) }, { event: 'pull_request' }, { prerelease: true }, { draft: true }, { ref: 'refs/heads/main' }]) {
      assert.throws(() => validateRelease(manifest, lock, { ...context, ...changed }));
    }
    assert.throws(() => validateRelease(manifest, { ...lock, version: '9.9.9' }, context));
  }
});

test('CI environment creates a physical owned temp directory and passes no executable shell text', async () => {
  const { configureCiEnvironment } = await import('../../tools/ci-environment.mjs');
  const base = await mkdtemp(join(tmpdir(), 'vibecode-ci-env-'));
  const output = join(base, 'github-env'); await writeFile(output, '');
  const directory = await configureCiEnvironment({ RUNNER_TEMP: base, GITHUB_ENV: output });
  assert.equal(directory, await realpath(directory));
  assert.ok(directory.startsWith(await realpath(base)));
  const values = await readFile(output, 'utf8');
  for (const key of ['TMPDIR', 'TEMP', 'TMP']) assert.ok(values.includes(`${key}=${directory}\n`));
  const physical = join(base, 'physical'); await mkdir(physical);
  const alias = join(base, 'alias'); await symlink(await realpath(physical), alias, 'junction');
  const viaAlias = await configureCiEnvironment({ RUNNER_TEMP: alias, GITHUB_ENV: output });
  assert.equal(viaAlias, await realpath(viaAlias));
  assert.ok(viaAlias.startsWith(await realpath(physical)));
  await assert.rejects(configureCiEnvironment({ RUNNER_TEMP: base }));
});

test('published metadata links to the exact source repository for provenance', async () => {
  const { publishManifest } = await import('../../tools/create-release.mjs');
  const source = JSON.parse(await read('package.json'));
  assert.deepEqual(publishManifest(source, 'vibecode').repository,
    { type: 'git', url: 'git+https://github.com/johnasblasco/vibe-code.git' });
});
