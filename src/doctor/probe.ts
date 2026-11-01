import { randomUUID } from 'node:crypto';
import { chmod, lstat, mkdtemp, mkdir, readFile, realpath, rm, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import type { LoadedKit } from '../data/types.js';
import { policy } from './index.js';
import { runProcess, validateReadCommand } from './process.js';
import type { ProcessRunner } from './process.js';

export interface ProbeResult { blocked: boolean; cleaned: boolean; unverified?: boolean; detail?: string }
export async function probeSecretHook(kit: LoadedKit, project: string, options: {
  process?: ProcessRunner; signal?: AbortSignal; env?: NodeJS.ProcessEnv;
} = {}): Promise<ProbeResult> {
  const data = policy(kit); const probe = data.probe as Record<string, unknown>;
  const commands = data.commands as Record<string, { command: string; args: string[] }>;
  for (const [id, definition] of Object.entries(commands)) validateReadCommand(id, definition);
  const execute = options.process ?? runProcess;
  const call = (id: string, args: string[], cwd: string) => execute({ id, command: 'git', args, cwd,
    timeoutMs: Number(data.process_timeout_ms), maxBytes: Number(data.process_max_bytes),
    ...(options.signal ? { signal: options.signal } : {}), ...(options.env ? { env: options.env } : {}) });
  const unsupported = (detail: string): ProbeResult => ({ blocked: false, cleaned: false, unverified: true, detail });
  const root = await realpath(project);
  if ((await lstat(project)).isSymbolicLink()) return unsupported('unsupported_hook');
  const config = await call('git_hooks', commands.git_hooks!.args, root);
  const hooks = config.code === 1 ? '.git/hooks' : config.code === 0 ? config.stdout.trim() : '';
  if (!hooks) return unsupported('unsupported_hook');
  const hookPath = resolve(root, hooks, 'pre-commit'); const contained = relative(root, hookPath);
  if (contained.startsWith('..') || contained === '' || contained.includes(':')) return unsupported('unsupported_hook');
  let current = root;
  try {
    for (const part of contained.split(sep)) {
      current = join(current, part); const info = await lstat(current);
      if (info.isSymbolicLink() || info.size > Number(data.process_max_bytes)) return unsupported('unsupported_hook');
    }
  } catch { return unsupported('unsupported_hook'); }
  const hook = String(probe.hook).replaceAll('\r\n', '\n');
  const lines = hook.trim().split('\n'); const parts = lines[1]?.split(' ') ?? [];
  const expectedFlags = new Set(['--pre-commit', '--staged', '--redact', '--no-banner', '--exit-code']);
  if (lines.length !== 2 || lines[0] !== '#!/bin/sh' || parts[0] !== 'exec' || parts[1] !== 'gitleaks' || parts[2] !== 'git' ||
      parts.length !== 9 || !parts.slice(3, 8).every((part) => expectedFlags.has(part)) ||
      new Set(parts.slice(3, 8)).size !== 5 || !/^[1-9]\d?$/.test(parts[8] ?? '')) return unsupported('unsupported_hook');
  if ((await readFile(hookPath, 'utf8')).replaceAll('\r\n', '\n') !== hook) return unsupported('unsupported_hook');
  if (process.platform !== 'win32' && !((await lstat(hookPath)).mode & 0o111)) return unsupported('unsupported_hook');
  const scanner = await execute({ id: 'scanner_version', command: 'gitleaks', args: commands.scanner_version!.args, cwd: root,
    timeoutMs: Number(data.process_timeout_ms), maxBytes: Number(data.process_max_bytes),
    ...(options.signal ? { signal: options.signal } : {}), ...(options.env ? { env: options.env } : {}) });
  const expected = (kit.documents.find((document) => document.data.id === 'tool-versions')!.data.values as Record<string, Record<string, unknown>>).gitleaks!.tag;
  const actualVersion = /^(?:gitleaks(?: version)? )?v?(\d+\.\d+\.\d+)\s*$/.exec(scanner.stdout.trim());
  if (scanner.code !== 0 || `v${actualVersion?.[1] ?? ''}` !== expected) return unsupported('scanner_version');
  const filename = String(probe.filename); const marker = String(probe.marker); const guard = String(probe.guard);
  if (![filename, marker].every((name) => /^[A-Za-z0-9_.-]+$/.test(name) && name !== '.' && name !== '..') ||
      guard !== `#!/bin/sh\nprintf guard > ${marker}\nexit 1\n`) return unsupported('probe_failed');
  const base = await realpath(tmpdir()); const directory = await mkdtemp(join(base, 'scaffolder-probe-'));
  const owned = await realpath(directory);
  let blocked: boolean; let cleaned = false;
  try {
    const empty = join(directory, 'empty-template'); await mkdir(empty);
    const localHooks = join(directory, 'hooks'); await mkdir(localHooks);
    await writeFile(join(localHooks, 'pre-commit'), hook, { mode: 0o700 });
    await writeFile(join(localHooks, 'prepare-commit-msg'), guard, { mode: 0o700 });
    await chmod(join(localHooks, 'pre-commit'), 0o700); await chmod(join(localHooks, 'prepare-commit-msg'), 0o700);
    if ((await call('probe_init', ['init', `--template=${empty}`], directory)).code !== 0) throw new Error('Probe initialization failed');
    // Signing is mandatory and its random program does not exist: no commit can finalize even if a hook is ignored.
    const common = ['-c', `core.hooksPath=${localHooks}`, '-c', 'core.fsmonitor=false', '-c', 'user.name=Scaffolder Probe',
      '-c', 'user.email=probe@example.invalid', '-c', 'commit.gpgSign=true', '-c', 'gpg.format=openpgp',
      '-c', `gpg.program=scaffolder-no-signer-${randomUUID()}`];
    await writeFile(join(directory, filename), String(probe.benign), { mode: 0o600 });
    if ((await call('probe_add', [...common, 'add', '--', filename], directory)).code !== 0) throw new Error('Probe staging failed');
    const benign = await call('probe_control', [...common, 'commit', '-m', 'scaffolder benign control'], directory);
    if (benign.code === 0 || (await readFile(join(directory, marker), 'utf8')) !== 'guard') throw new Error('Benign control did not reach the guard');
    if ((await call('probe_head', ['rev-parse', '--verify', 'HEAD'], directory)).code === 0) throw new Error('Unexpected probe HEAD');
    await unlink(join(directory, marker));
    await writeFile(join(directory, filename), String(probe.synthetic), { mode: 0o600 });
    if ((await call('probe_add', [...common, 'add', '--', filename], directory)).code !== 0) throw new Error('Probe staging failed');
    const synthetic = await call('probe_synthetic', [...common, 'commit', '-m', 'scaffolder synthetic control'], directory);
    let reached = false;
    try { await lstat(join(directory, marker)); reached = true; } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    blocked = synthetic.code !== null && synthetic.code !== 0 && !reached &&
      (await call('probe_head', ['rev-parse', '--verify', 'HEAD'], directory)).code !== 0;
  } catch { blocked = false; }
  finally {
    // Validate the absolute owned target before recursive cleanup; never delete an arbitrary computed path.
    try {
      if (!(await lstat(directory)).isSymbolicLink() && await realpath(directory) === owned && dirname(owned) === base && owned.startsWith(join(base, 'scaffolder-probe-'))) {
        await rm(owned, { recursive: true, force: false });
        try { await lstat(owned); } catch (error) { cleaned = (error as NodeJS.ErrnoException).code === 'ENOENT'; }
      }
    } catch { cleaned = false; }
  }
  return { blocked, cleaned, detail: blocked && cleaned ? 'probe_passed' : 'probe_failed' };
}
