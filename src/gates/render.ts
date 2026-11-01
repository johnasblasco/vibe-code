import { basename, dirname, resolve } from 'node:path';
import { loadYamlFile } from '../data/loader.js';
import type { LoadedKit } from '../data/types.js';
import { interfaceText, display } from '../interview/ui.js';
import { GateError } from './index.js';
import type { Deferral, GateResult } from './index.js';

export async function readDeferrals(path: string, gate: string): Promise<Record<string, Deferral>> {
  const absolute = resolve(path);
  const { data } = await loadYamlFile(dirname(absolute), basename(absolute));
  if (Object.keys(data).length !== 3 || data.schema !== 'gate-deferrals/v1' || data.gate !== gate ||
      !data.checks || typeof data.checks !== 'object' || Array.isArray(data.checks)) {
    throw new GateError('Invalid explicit deferrals');
  }
  // evaluateGate validates every check ID and every field; nothing here grants a pass.
  return data.checks as Record<string, Deferral>;
}

export function renderGate(kit: LoadedKit, gate: GateResult): string {
  const ui = interfaceText(kit, 'beginner-course/gates-ui.yaml');
  const lines = [display(gate.id), ui[gate.stop ? 'stop' : gate.allowed ? 'allowed' : 'blocked']!, ''];
  for (const check of gate.checks) {
    lines.push(`[${ui[check.status]}] ${display(check.id)}: ${display(check.description)}`);
    if (check.deferral) for (const field of ['owner', 'reason', 'revisit_when'] as const) {
      lines.push(`  ${ui[field]}: ${display(check.deferral[field])}`);
    }
  }
  for (const rule of gate.contradictions) {
    lines.push(`${display(rule.severity)}: ${display(rule.id)}`, display(rule.data.message), display(rule.data.fix));
  }
  lines.push('', ui.limitations!);
  return lines.join('\n') + '\n';
}
