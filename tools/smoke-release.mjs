import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const fail = () => { throw new Error('Release artifact smoke check failed'); };
function run(executable, args, cwd, expected) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    ['path', 'pathext', 'systemroot', 'windir', 'comspec', 'temp', 'tmp', 'tmpdir'].includes(key.toLowerCase())));
  const result = spawnSync(executable, args, { cwd, env, shell: false, windowsHide: true,
    encoding: 'utf8', timeout: 30000, maxBuffer: 2_000_000 });
  if (result.error || result.signal || result.status !== expected) fail();
  return result.stdout;
}

/** The input is the fresh trusted createRelease result, never a user-provided archive. */
export async function smokeRelease(result) {
  const bytes = await readFile(result.tarball);
  if (createHash('sha256').update(bytes).digest('hex') !== result.sha256) fail();
  const isolated = await mkdtemp(join(tmpdir(), 'vibecode-publish-'));
  run('tar', ['-xzf', result.tarball, '-C', isolated], isolated, 0);
  for (const [path, hash] of Object.entries(result.bundledFiles)) {
    if (createHash('sha256').update(await readFile(join(isolated, 'package', path))).digest('hex') !== hash) fail();
  }
  const cli = join(isolated, 'package/dist/cli/main.js');
  if (!run(process.execPath, [cli, '--help'], isolated, 0).includes('vibecode')) fail();
  if (!run(process.execPath, [cli, 'doctor', '--dry-run'], isolated, 3).includes('Planned check only')) fail();
  return isolated;
}
