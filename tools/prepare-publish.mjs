import { execFileSync } from 'node:child_process';
import { appendFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRelease } from './create-release.mjs';
import { smokeRelease } from './smoke-release.mjs';

const fail = () => { throw new Error('Release identity refused'); };
export function validateRelease(manifest, lock, context) {
  if (manifest.private !== true || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(manifest.version) ||
      context.event !== 'release' || context.draft !== false || context.prerelease !== false ||
      context.tag !== `v${manifest.version}` || context.ref !== `refs/tags/v${manifest.version}` ||
      !/^[a-f0-9]{40}$/.test(context.sha) || context.head !== context.sha ||
      !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(context.repository) ||
      manifest.repository?.type !== 'git' || manifest.repository.url !== `git+https://github.com/${context.repository}.git` ||
      lock.name !== manifest.name || lock.version !== manifest.version ||
      lock.packages?.['']?.name !== manifest.name || lock.packages[''].version !== manifest.version) fail();
}

/** Prepare and check only. npm publish is a separate, explicit workflow step. */
async function prepare() {
  if (!process.env.GITHUB_OUTPUT || !process.env.GITHUB_EVENT_PATH) fail();
  const manifest = JSON.parse(await readFile('package.json', 'utf8'));
  const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
  const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', shell: false,
    windowsHide: true, timeout: 10000, maxBuffer: 1024 }).trim();
  validateRelease(manifest, lock, { event: process.env.GITHUB_EVENT_NAME, repository: process.env.GITHUB_REPOSITORY,
    ref: process.env.GITHUB_REF, sha: process.env.GITHUB_SHA, head, tag: event.release?.tag_name,
    draft: event.release?.draft, prerelease: event.release?.prerelease });
  const result = await createRelease();
  await smokeRelease(result);
  if (/[\r\n]/.test(result.tarball)) fail();
  await appendFile(process.env.GITHUB_OUTPUT, `tarball=${result.tarball}\nsha256=${result.sha256}\n`);
  process.stdout.write(`Verified ${result.name}@${result.version}\nSHA-256: ${result.sha256}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { if (process.argv.length !== 2) fail(); await prepare(); }
  catch { process.stderr.write('Release preparation refused. No publication was attempted.\n'); process.exitCode = 1; }
}
