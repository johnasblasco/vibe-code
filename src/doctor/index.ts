import type { LoadedKit } from '../data/types.js';
import { evaluateGate } from '../gates/index.js';
import type { Deferral, GateCheck, Verification } from '../gates/index.js';
import { noSecrets } from '../state/index.js';
import type { State } from '../state/index.js';
import { CANCELLED } from '../interview/index.js';
import { runProcess, validateReadCommand } from './process.js';
import type { ProcessRunner } from './process.js';

type Row = Readonly<Record<string, unknown>>;
export interface ManualRecord { check_id: string; description: string; confirmed: boolean; recorded_on: string }
export interface Evidence { status: Verification; detail: string; version?: string }
export interface DoctorOptions {
  project: string; process?: ProcessRunner; signal?: AbortSignal; dryRun?: boolean;
  probeAllowed?: boolean; probe?: () => Promise<{ blocked: boolean; cleaned: boolean; unverified?: boolean; detail?: string }>;
  remoteAllowed?: boolean; nonProduction?: boolean; previewUrl?: string; expectedVersion?: string; repository?: string;
  page?: (url: string) => Promise<{ status: number; body: string }>;
  ci?: (url: string) => Promise<unknown>;
  attest?: (check: GateCheck) => Promise<boolean | typeof CANCELLED>;
  onManual?: (record: ManualRecord) => Promise<void>;
  deferrals?: Readonly<Record<string, Deferral>>;
}
export class DoctorError extends Error { override name = 'DoctorError'; }
export function policy(kit: LoadedKit): Row {
  const value = kit.documents.find((document) => document.path === 'beginner-course/verification.yaml')?.data;
  if (!value) throw new DoctorError('Missing verification policy');
  return value;
}
export function previewUrl(value: string): URL {
  noSecrets(value);
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.port && url.port !== '443' ||
      !/^[A-Za-z0-9.-]+$/.test(url.hostname) || !url.hostname.includes('.') ||
      /(?:^|\.)(localhost|local|internal|invalid|test)$/.test(url.hostname) || /^\d+(?:\.\d+){3}$/.test(url.hostname)) {
    throw new DoctorError('Expected designated nonproduction public HTTPS preview');
  }
  return url;
}
function object(value: unknown): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DoctorError('Invalid check metadata');
  return value as Row;
}
export async function doctor(kit: LoadedKit, state: State, stage: string, options: DoctorOptions) {
  if (!['stage-0', 'stage-1', 'stage-2'].includes(stage)) throw new DoctorError('Unsupported doctor stage');
  noSecrets({ previewUrl: options.previewUrl, expectedVersion: options.expectedVersion, repository: options.repository });
  const data = policy(kit); const commands = object(data.commands);
  for (const [id, definition] of Object.entries(commands)) validateReadCommand(id, definition);
  const versions = object(kit.documents.find((document) => document.data.id === 'tool-versions')?.data.values);
  const execute = options.process ?? runProcess;
  const evidence: Record<string, Evidence> = {};
  const manualRecords: ManualRecord[] = [];
  const cached = new Map<string, Promise<unknown>>();
  let cancelled = false;
  const once = <T>(id: string, action: () => Promise<T>): Promise<T> => {
    if (!cached.has(id)) cached.set(id, action());
    return cached.get(id)! as Promise<T>;
  };
  const command = async (id: string, extra: { prefix?: string[]; input?: string } = {}) => {
    const definition = object(commands[id]);
    if (typeof definition.command !== 'string' || !Array.isArray(definition.args) || !definition.args.every((part) => typeof part === 'string')) throw new DoctorError('Invalid command definition');
    return execute({ id, command: definition.command, args: [...(extra.prefix ?? []), ...definition.args], cwd: options.project,
      timeoutMs: Number(data.process_timeout_ms), maxBytes: Number(data.process_max_bytes),
      ...(options.signal ? { signal: options.signal } : {}), ...(extra.input !== undefined ? { input: extra.input } : {}) });
  };
  const head = () => once('head', async () => {
    const result = await command('git_head');
    return result.code === 0 && /^[a-f0-9]{40,64}$/.test(result.stdout.trim()) ? result.stdout.trim() : null;
  });
  const page = () => once('page', async () => {
    if (!options.remoteAllowed || !options.nonProduction || !options.previewUrl || !options.page) return null;
    return options.page(previewUrl(options.previewUrl).href);
  });
  const probe = () => once('probe', async () => options.probeAllowed && options.probe ? options.probe() : null);
  const verify = async (check: GateCheck): Promise<Verification> => {
    const result = (status: Verification, detail: string, version?: string) => {
      evidence[check.id] = { status, detail, ...(version ? { version } : {}) }; return status;
    };
    if (options.signal?.aborted || cancelled) { cancelled = true; return result('unverified', 'cancelled'); }
    if (options.dryRun) return result('unverified', 'dry_run');
    if (check.kind === 'manual') {
      if (!options.attest) return result('unverified', 'manual_needed');
      const answer = await options.attest(check);
      if (answer === CANCELLED) { cancelled = true; return result('unverified', 'cancelled'); }
      const record = { check_id: check.id, description: check.description, confirmed: answer, recorded_on: new Date().toISOString() };
      manualRecords.push(record);
      await options.onManual?.(record);
      return result(answer ? 'manual' : 'failed', answer ? 'attested' : 'manual_needed');
    }
    try {
      switch (check.runner) {
        case 'node_version': case 'git_version': {
          const output = await command(check.runner);
          const pattern = check.runner === 'node_version' ? /^v(\d+\.\d+\.\d+)\s*$/ : /^git version (\d+\.\d+\.\d+)(?:[.\w-]*)\s*$/;
          const match = pattern.exec(output.stdout.trim());
          if (output.code !== 0 || !match) return result('failed', 'missing_tool');
          if (check.runner === 'node_version') {
            const node = object(versions.node); const major = Number(match[1]!.split('.')[0]);
            if (![node.recommended_major, node.previous_lts_major].includes(major) || major < Number(node.minimum_supported_major)) return result('failed', 'unsupported_version', match[1]);
          }
          return result('passed', 'detected', match[1]);
        }
        case 'docker_local': {
          const client = await command('docker_version');
          if (client.code !== 0 || !/^Docker version \d+\.\d+\.\d+/.test(client.stdout.trim())) return result('failed', 'missing_tool');
          const context = await command('docker_context');
          if (context.code !== 0) return result('unverified', 'docker_context');
          const endpoint: unknown = JSON.parse(context.stdout);
          if (typeof endpoint !== 'string' || !(/^(?:unix:\/\/\/[^\r\n]+|npipe:\/\/\/\/\.\/pipe\/[A-Za-z0-9_.-]+)$/.test(endpoint))) return result('unverified', 'remote_docker');
          const server = await command('docker_info', { prefix: ['--host', endpoint] });
          const version = server.stdout.trim().replace(/^"|"$/g, '');
          return server.code === 0 && /^\d+\.\d+\.\d+(?:[\w.-]*)$/.test(version) ? result('passed', 'local_engine', version) : result('failed', 'docker_stopped');
        }
        case 'git_head': return await head() ? result('passed', 'head_present') : result('failed', 'head_missing');
        case 'git_ignore': {
          const probes = data.ignore_probes as string[]; const expected = data.expected_ignored as string[];
          const ignored = await command('git_ignore', { input: probes.join('\n') + '\n' });
          const paths = ignored.stdout.trim().split(/\r?\n/).filter(Boolean).sort();
          const tracked = await command('git_tracked');
          const secretTracked = tracked.stdout.split('\0').filter((path) => path && path !== data.example_file);
          return ignored.code === 0 && tracked.code === 0 && JSON.stringify(paths) === JSON.stringify([...expected].sort()) && !secretTracked.length
            ? result('passed', 'ignored') : result('failed', 'ignore_failed');
        }
        case 'secret_commit': case 'probe_cleanup': {
          const proof = await probe();
          if (!proof) return result('unverified', 'probe_needed');
          if (proof.unverified) return result('unverified', proof.detail ?? 'probe_needed');
          const passed = check.runner === 'secret_commit' ? proof.blocked && proof.cleaned : proof.cleaned;
          return result(passed ? 'passed' : 'failed', passed ? 'probe_passed' : 'probe_failed');
        }
        case 'preview_http': case 'preview_version': {
          const response = await page();
          if (!response) return result('unverified', 'network_needed');
          if (response.status !== 200) return result('failed', 'http_failed');
          if (check.runner === 'preview_version') {
            if (!options.expectedVersion?.trim()) return result('unverified', 'version_needed');
            noSecrets(options.expectedVersion);
            if (!response.body.includes(options.expectedVersion)) return result('failed', 'version_mismatch');
          }
          return result('passed', 'preview_checked');
        }
        case 'ci_head': {
          if (!options.remoteAllowed || !options.nonProduction || !options.ci || !options.repository) return result('unverified', 'network_needed');
          const repo = options.repository;
          if (!/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/.test(repo) || repo.split('/').some((part) => part === '.' || part === '..')) return result('failed', 'ci_mismatch');
          const sha = await head(); const branch = await command('git_branch');
          if (!sha || sha.length !== 40 || branch.code !== 0 || !branch.stdout.trim()) return result('unverified', 'head_missing');
          const workflow = String(data.ci_workflow); if (!/^[A-Za-z0-9_.-]+\.ya?ml$/.test(workflow)) throw new DoctorError('Invalid workflow policy');
          let payload: unknown;
          try { payload = await options.ci(`https://api.github.com/repos/${repo}/actions/workflows/${workflow}/runs?head_sha=${sha}&per_page=${Number(data.ci_page_size)}`); }
          catch { return result('unverified', 'ci_unavailable'); }
          const response = object(payload);
          if (!Array.isArray(response.workflow_runs)) return result('unverified', 'ci_mismatch');
          const runs = response.workflow_runs.map(object).filter((run) => run.head_sha === sha && run.head_branch === branch.stdout.trim() &&
            String(object(run.head_repository).full_name).toLowerCase() === repo.toLowerCase());
          if (!runs.every((run) => typeof run.run_number === 'number' && Number.isSafeInteger(run.run_number) && run.run_number > 0 &&
              typeof run.run_attempt === 'number' && Number.isSafeInteger(run.run_attempt) && run.run_attempt > 0)) return result('unverified', 'ci_mismatch');
          runs.sort((a, b) => Number(b.run_number) - Number(a.run_number) || Number(b.run_attempt) - Number(a.run_attempt));
          const latest = runs[0];
          return latest?.status === 'completed' && latest.conclusion === 'success' ? result('passed', 'ci_current') : result('failed', 'ci_not_green');
        }
        default: return result('unverified', 'unknown_runner');
      }
    } catch { return result('failed', 'check_failed'); }
  };
  const gate = await evaluateGate(kit, state, `stage-${Number(stage.slice(-1)) + 1}`, { verify,
    ...(options.deferrals ? { deferrals: options.deferrals } : {}) });
  return { gate, evidence, manualRecords, cancelled: cancelled || Boolean(options.signal?.aborted) };
}
