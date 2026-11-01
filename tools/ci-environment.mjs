import { appendFile, mkdtemp, realpath } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Keep strict state-path checks; use physical runner-owned temporary folders instead. */
export async function configureCiEnvironment(env) {
  if (!env.RUNNER_TEMP || !env.GITHUB_ENV) throw new Error('Missing CI environment');
  const base = await realpath(env.RUNNER_TEMP);
  const directory = await mkdtemp(join(base, 'vibecode-'));
  if (/[\r\n]/.test(directory)) throw new Error('Invalid CI temporary path');
  await appendFile(env.GITHUB_ENV, ['TMPDIR', 'TEMP', 'TMP'].map((key) => `${key}=${directory}\n`).join(''));
  return directory;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await configureCiEnvironment(process.env);
    process.stdout.write('Configured a physical runner-owned temporary directory.\n');
  } catch { process.stderr.write('Unable to configure CI temporary paths.\n'); process.exitCode = 1; }
}
