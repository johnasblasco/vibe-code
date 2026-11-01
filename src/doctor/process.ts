import { spawn } from 'node:child_process';
import { devNull } from 'node:os';

export interface ProcessRequest {
  id: string; command: string; args: string[]; cwd: string; input?: string; signal?: AbortSignal;
  timeoutMs?: number; maxBytes?: number; env?: NodeJS.ProcessEnv;
}
export interface ProcessResult { code: number | null; stdout: string; stderr: string }
export type ProcessRunner = (request: ProcessRequest) => Promise<ProcessResult>;
/** Technical operation grammar is allowlisted; YAML supplies descriptors, never arbitrary executable programs. */
export function validateReadCommand(id: string, value: unknown): { command: string; args: string[] } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid read-only descriptor');
  const row = value as Record<string, unknown>;
  if (Object.keys(row).length !== 2 || typeof row.command !== 'string' || !Array.isArray(row.args) || !row.args.every((item) => typeof item === 'string')) throw new Error('Invalid read-only descriptor');
  const args = row.args as string[];
  const same = (...expected: string[]) => args.length === expected.length && args.every((value, index) => value === expected[index]);
  const versions: Record<string, string> = { node_version: 'node', git_version: 'git', docker_version: 'docker', scanner_version: 'gitleaks' };
  let allowed = Object.hasOwn(versions, id) && row.command === versions[id] && same('--version');
  if (row.command === 'git') {
    if (id === 'git_head') allowed = same('rev-parse', '--verify', 'HEAD');
    if (id === 'git_branch') allowed = same('symbolic-ref', '--short', 'HEAD');
    if (id === 'git_ignore') allowed = same('check-ignore', '--no-index', '--stdin');
    if (id === 'git_tracked') allowed = args.length >= 5 && args[0] === 'ls-files' && args[1] === '--cached' && args[2] === '-z' && args[3] === '--' && args.slice(4).every((path) => /^\.env(?:\.\*)?$/.test(path));
    if (id === 'git_hooks') allowed = same('config', '--get', 'core.hooksPath');
  }
  if (row.command === 'docker') {
    if (id === 'docker_context') allowed = args.length === 4 && args[0] === 'context' && args[1] === 'inspect' && args[2] === '--format' && /^\{\{json \.[A-Za-z.]+\}\}$/.test(args[3]!);
    if (id === 'docker_info') allowed = args.length === 3 && args[0] === 'info' && args[1] === '--format' && /^\{\{json \.[A-Za-z.]+\}\}$/.test(args[2]!);
  }
  if (!allowed) throw new Error('Unsupported read-only operation');
  return { command: row.command, args: [...args] };
}
export function safeEnvironment(additions: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  const allowed = new Set(['path', 'pathext', 'systemroot', 'windir', 'temp', 'tmp', 'home', 'userprofile', 'lang', 'lc_all']);
  for (const [key, value] of Object.entries(process.env)) if (allowed.has(key.toLowerCase())) env[key] = value;
  const gitNull = process.platform === 'win32' ? 'NUL' : devNull;
  return { ...env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: gitNull, GIT_CONFIG_SYSTEM: gitNull,
    GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0', ...additions };
}
export const runProcess: ProcessRunner = async (request) => {
  if (!['node', 'git', 'docker', 'gitleaks'].includes(request.command) ||
      !request.args.every((argument) => typeof argument === 'string' && !argument.includes('\0')) || request.signal?.aborted) {
    return { code: null, stdout: '', stderr: '' };
  }
  const timeout = request.timeoutMs; const limit = request.maxBytes;
  if (typeof timeout !== 'number' || !Number.isSafeInteger(timeout) || timeout < 1 || typeof limit !== 'number' || !Number.isSafeInteger(limit) || limit < 1) throw new Error('Invalid process bounds');
  return new Promise((resolve) => {
    let stdout = ''; let stderr = ''; let bytes = 0; let invalid = false;
    const args = request.command === 'git' ? ['-c', 'core.fsmonitor=false', '-c', 'core.attributesFile=' + (process.platform === 'win32' ? 'NUL' : devNull), ...request.args] : request.args;
    const child = spawn(request.command === 'node' ? process.execPath : request.command, args,
      { cwd: request.cwd, env: safeEnvironment(request.env), shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const stop = () => { invalid = true; child.kill(); };
    const timer = setTimeout(stop, timeout);
    request.signal?.addEventListener('abort', stop, { once: true });
    const collect = (chunk: Buffer, error: boolean) => {
      bytes += chunk.length;
      if (bytes > limit) { stop(); return; }
      if (error) stderr += chunk.toString('utf8'); else stdout += chunk.toString('utf8');
    };
    child.stdout.on('data', (chunk: Buffer) => collect(chunk, false));
    child.stderr.on('data', (chunk: Buffer) => collect(chunk, true));
    child.on('error', () => { invalid = true; });
    child.on('close', (code) => {
      clearTimeout(timer); request.signal?.removeEventListener('abort', stop);
      resolve(invalid ? { code: null, stdout: '', stderr: '' } : { code, stdout, stderr });
    });
    child.stdin.on('error', () => { /* Early child exit must not expose input in an exception. */ });
    child.stdin.end(request.input);
  });
};
