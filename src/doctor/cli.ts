import { password, select, isCancel } from '@clack/prompts';
import type { Command } from 'commander';
import type { LoadedKit } from '../data/types.js';
import { createState, loadState, noSecrets } from '../state/index.js';
import { CANCELLED } from '../interview/index.js';
import { display, interfaceText } from '../interview/ui.js';
import { readDeferrals } from '../gates/render.js';
import type { GateCheck } from '../gates/index.js';
import { loadCourse, saveCourse } from '../course/state.js';
import type { CourseState } from '../course/state.js';
import { guideCourse } from '../course/index.js';
import { doctor, DoctorError, policy, previewUrl } from './index.js';
import type { DoctorOptions, ManualRecord } from './index.js';
import { probeSecretHook } from './probe.js';
import { requestCi, requestPreview } from './network.js';
import { lstat } from 'node:fs/promises';
import { resolve } from 'node:path';

export interface DoctorPort {
  confirm(kind: 'probe' | 'network'): Promise<boolean | typeof CANCELLED>;
  attest(check: GateCheck): Promise<boolean | typeof CANCELLED>;
}
export interface DoctorCliIO {
  tty?: boolean;
  doctorAdapters?: Pick<DoctorOptions, 'process' | 'probe' | 'page' | 'ci'>;
  doctorPortFactory?: (kit: LoadedKit, signal: AbortSignal) => DoctorPort;
}
export interface DoctorFlags {
  stage?: string; project?: string; state?: string; dryRun?: boolean; probeSecrets?: boolean; attest?: boolean;
  previewUrl?: string; expectedVersion?: string; repository?: string; nonProduction?: boolean; deferrals?: string;
  advance?: boolean; course?: boolean;
}
export function addDoctorFlags(command: Command, ui: Record<string, string>, includeDryRun = true): Command {
  command.option('--project <directory>', ui.doctor_project_option!, '.')
    .option('--probe-secrets', ui.probe_option!).option('--attest', ui.attest_option!)
    .option('--preview-url <url>', ui.preview_url_option!).option('--expected-version <text>', ui.expected_version_option!)
    .option('--repository <owner/name>', ui.repository_option!).option('--non-production', ui.nonproduction_option!);
  if (includeDryRun) command.option('--dry-run', ui.doctor_dry_run_option!);
  return command;
}
export function createDoctorPort(kit: LoadedKit, signal: AbortSignal): DoctorPort {
  const ui = interfaceText(kit, 'beginner-course/doctor-ui.yaml');
  return {
    async confirm(kind) {
      if (signal.aborted) return CANCELLED;
      const result = await password({ message: ui[`${kind}_confirm`]!, signal, mask: '*' });
      return signal.aborted || isCancel(result) ? CANCELLED : result === ui[`${kind}_word`];
    },
    async attest(check) {
      if (signal.aborted) return CANCELLED;
      const result = await select({ message: `${display(check.description)}\n${ui.attest_prompt}`, signal,
        options: [{ value: false, label: ui.no! }, { value: true, label: ui.yes! }] });
      return signal.aborted || isCancel(result) ? CANCELLED : result;
    },
  };
}
async function answers(kit: LoadedKit, path?: string) {
  const selected = resolve(path ?? '.scaffolder/state.json');
  if (path === undefined) {
    try { await lstat(selected); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return createState(kit); throw error; }
  }
  return loadState(selected);
}
function renderDoctor(kit: LoadedKit, result: Awaited<ReturnType<typeof doctor>>): string {
  const ui = interfaceText(kit, 'beginner-course/doctor-ui.yaml');
  const lines = [ui.title!, ui[result.gate.stop ? 'stop' : result.gate.allowed ? 'allowed' : 'blocked']!, ''];
  for (const check of result.gate.checks) {
    lines.push(`[${ui[check.status]}] ${display(check.id)}: ${display(check.description)}`);
    const evidence = result.evidence[check.id];
    if (evidence) lines.push(`  ${ui[evidence.detail]}${evidence.version ? ` (${display(evidence.version)})` : ''}`);
    if (check.deferral) lines.push(`  ${display(check.deferral.owner)}; ${display(check.deferral.reason)}; ${display(check.deferral.revisit_when)}`);
  }
  for (const rule of result.gate.contradictions) lines.push(`${display(rule.severity)}: ${display(rule.id)}`, display(rule.data.message), display(rule.data.fix));
  return lines.join('\n') + '\n';
}
function renderCards(kit: LoadedKit, result: Awaited<ReturnType<typeof guideCourse>>): string {
  const ui = interfaceText(kit, 'beginner-course/doctor-ui.yaml');
  if (!result.cards.length) return '';
  const lines = [`${ui.stage}: ${display(result.stage)}`, ui.instructions!, ''];
  const label = (value: unknown) => typeof value === 'string' && Object.hasOwn(ui, value) ? ui[value]! : display(value);
  for (const card of result.cards) {
    lines.push(display(card.id), `${ui.teach}:`, display(card.teach));
    if (card.choose && typeof card.choose === 'object') {
      const choice = card.choose as Record<string, unknown>;
      lines.push(`${ui.choose}: ${display(choice.ask ?? '')}`);
      if (Array.isArray(choice.options)) lines.push(`${ui.options}: ${choice.options.map(label).join(', ')}`);
      if (Object.hasOwn(choice, 'default')) lines.push(`${ui.recommended}: ${label(choice.default)}`);
      if (choice.show) lines.push(display(choice.show));
    }
    lines.push(`${ui.do}:`);
    for (const step of (card.do ?? []) as Record<string, unknown>[]) {
      if (typeof step.say === 'string') lines.push(`- ${display(step.say)}`);
      if (typeof step.run === 'string') lines.push(`- ${ui.command_label}: ${display(step.run)}`);
      if (typeof step.write === 'string') lines.push(`- ${ui.write_label}: ${display(step.write)}`);
      if (Array.isArray(step.tools)) lines.push(`- ${ui.tools_label}: ${step.tools.map(label).join(', ')}`);
    }
    lines.push(`${ui.verify}:`);
    for (const check of (card.verify ?? []) as Record<string, unknown>[]) {
      if (typeof check.auto === 'string') lines.push(`- ${ui.automatic_label}: ${display(check.auto)}`);
      if (typeof check.manual === 'string') lines.push(`- ${ui.manual_label}: ${display(check.manual)}`);
    }
    if (Array.isArray(card.if_fails)) {
      lines.push(`${ui.if_fails}:`);
      for (const item of card.if_fails as Record<string, unknown>[]) lines.push(`- ${display(item.match)}: ${display(item.say)}`);
    }
    lines.push(`${ui.undo}:`, display(card.undo), '');
  }
  return lines.join('\n') + '\n';
}
export type DoctorOutcome = 'success' | 'blocked' | 'stop' | 'cancelled';

/** Consent exists only in this invocation; no stored pass or previous approval enables a capability. */
export async function runDoctorCli(kit: LoadedKit, flags: DoctorFlags, io: DoctorCliIO, out: (text: string) => void,
  courseMode = false): Promise<DoctorOutcome> {
  const project = resolve(flags.project ?? '.');
  if (!(await lstat(project)).isDirectory() || (await lstat(project)).isSymbolicLink()) throw new DoctorError('Expected local project directory');
  const state = await answers(kit, flags.state);
  noSecrets({ previewUrl: flags.previewUrl, expectedVersion: flags.expectedVersion, repository: flags.repository });
  const ui = interfaceText(kit, 'beginner-course/doctor-ui.yaml');
  const tty = io.tty ?? Boolean(process.stdin.isTTY && process.stdout.isTTY);
  const controller = new AbortController(); const cancel = () => controller.abort();
  process.on('SIGINT', cancel);
  let saved: CourseState | undefined;
  try {
    if (courseMode) saved = await loadCourse(project);
    const port = tty && !flags.dryRun ? (io.doctorPortFactory ?? createDoctorPort)(kit, controller.signal) : undefined;
    const context: DoctorOptions = { project, signal: controller.signal, dryRun: flags.dryRun ?? false,
      ...(io.doctorAdapters ?? {}),
      probe: io.doctorAdapters?.probe ?? (() => probeSecretHook(kit, project, { signal: controller.signal })),
      page: io.doctorAdapters?.page ?? ((url) => requestPreview(url, kit, controller.signal)),
      ci: io.doctorAdapters?.ci ?? ((url) => requestCi(url, kit, controller.signal)),
      ...(flags.previewUrl !== undefined ? { previewUrl: flags.previewUrl } : {}),
      ...(flags.expectedVersion !== undefined ? { expectedVersion: flags.expectedVersion } : {}),
      ...(flags.repository !== undefined ? { repository: flags.repository } : {}), nonProduction: flags.nonProduction ?? false };
    if (flags.previewUrl) previewUrl(flags.previewUrl);
    if (flags.expectedVersion) noSecrets(flags.expectedVersion);
    if (!flags.dryRun) {
      if (flags.probeSecrets) {
        if (!port) out(`${ui.consent_required}\n`);
        else {
          out(`${String((policy(kit).probe as Record<string, unknown>).hook_setup)}\n`);
          out(`${ui.supported_hook}:\n${String((policy(kit).probe as Record<string, unknown>).hook)}\n`);
          const consent = await port.confirm('probe');
          if (consent === CANCELLED) { out(`${ui.cancelled}\n`); return 'cancelled'; }
          context.probeAllowed = consent;
        }
      }
      if (flags.previewUrl || flags.repository) {
        if (!port || !flags.nonProduction) out(`${ui.consent_required}\n`);
        else {
          if (flags.previewUrl) out(`${ui.preview_target}: ${previewUrl(flags.previewUrl).origin}\n`);
          if (flags.repository) out(`${ui.ci_target}: ${display(flags.repository)}\n`);
          const consent = await port.confirm('network');
          if (consent === CANCELLED) { out(`${ui.cancelled}\n`); return 'cancelled'; }
          context.remoteAllowed = consent;
        }
      }
      if (flags.attest && port) {
        context.attest = (check) => port.attest(check);
        context.onManual = async (record: ManualRecord) => {
          saved ??= await loadCourse(project);
          saved = { ...saved, manual_records: [...saved.manual_records, record] };
          await saveCourse(project, saved);
        };
      }
    }
    const stage = flags.stage ?? 'stage-0';
    const boundary = courseMode ? `stage-${Math.min(3, Number(saved!.current_stage.slice(-1)) + (flags.advance ? 1 : 0))}` : `stage-${Number(stage.slice(-1)) + 1}`;
    if (flags.deferrals) context.deferrals = await readDeferrals(flags.deferrals, boundary);
    if (courseMode) {
      const result = await guideCourse(kit, state, saved!, { ...context, advance: flags.advance ?? false });
      out(renderCards(kit, result));
      if (result.verification) out(renderDoctor(kit, result.verification));
      if (result.verification?.cancelled || controller.signal.aborted) { out(`${ui.cancelled}\n`); return 'cancelled'; }
      if (result.verification?.gate.stop) return 'stop';
      if (result.verification && !result.verification.gate.allowed) return 'blocked';
      if (result.nextStage && !flags.dryRun) {
        saved = { ...saved!, current_stage: result.nextStage, history: [...saved!.history,
          { from: result.stage, to: result.nextStage, recorded_on: new Date().toISOString(), deferrals: { ...(context.deferrals ?? {}) } }] };
        await saveCourse(project, saved); out(`${ui.advanced}\n`);
      }
      if (result.completed || result.nextStage === 'stage-3') out(`${ui.completed}\n`);
      return 'success';
    }
    const result = await doctor(kit, state, stage, context); out(renderDoctor(kit, result));
    if (result.cancelled) { out(`${ui.cancelled}\n`); return 'cancelled'; }
    return result.gate.stop ? 'stop' : result.gate.allowed ? 'success' : 'blocked';
  } finally { process.removeListener('SIGINT', cancel); }
}
