import type { LoadedKit } from '../data/types.js';
import { noSecrets, resume } from '../state/index.js';
import type { State } from '../state/index.js';

type Row = Readonly<Record<string, unknown>>;
export type Verification = 'passed' | 'manual' | 'failed' | 'unverified';
export interface Deferral { owner: string; reason: string; revisit_when: string }
export interface GateCheck {
  id: string; kind: 'auto' | 'manual' | 'question' | 'review'; description: string; card?: string; runner?: string;
}
export interface GateResult {
  id: string; allowed: boolean; stop: boolean;
  checks: (GateCheck & { status: Verification | 'answered' | 'deferred' | 'not_applicable' | 'unanswered'; deferral?: Deferral })[];
  contradictions: { id: string; severity: string; data: Row }[];
}
export class GateError extends Error { override name = 'GateError'; }
function records(value: unknown): Row[] {
  if (!Array.isArray(value) || !value.every((item) => item && typeof item === 'object' && !Array.isArray(item))) {
    throw new GateError('Invalid gate definitions');
  }
  return value as Row[];
}
function nonempty(value: unknown): value is string { return typeof value === 'string' && Boolean(value.trim()); }
function validateDeferral(value: unknown): Deferral {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new GateError('Invalid gate deferral');
  const row = value as Row;
  if (Object.keys(row).length !== 3 || !['owner', 'reason', 'revisit_when'].every((key) => nonempty(row[key]))) {
    throw new GateError('Invalid gate deferral');
  }
  noSecrets(row);
  return { owner: row.owner as string, reason: row.reason as string, revisit_when: row.revisit_when as string };
}

export async function evaluateGate(kit: LoadedKit, state: State, id: string, options: {
  verify?: (check: GateCheck) => Promise<Verification>;
  deferrals?: Readonly<Record<string, Deferral>>;
} = {}): Promise<GateResult> {
  const session = resume(state, kit);
  const checks: GateCheck[] = [];
  const stages = records(kit.documents.find((document) => document.path === 'beginner-course/golden-path.yaml')?.data.stages);
  const target = stages.findIndex((stage) => stage.id === id);
  if (target >= 0) {
    for (const stage of stages.slice(0, target)) {
      if (stage.card === undefined) continue;
      if (typeof stage.card !== 'string' || !kit.documents.some((document) =>
        document.path === `beginner-course/${stage.card}` && records(document.data.cards).length > 0)) {
        throw new GateError('Missing required course card');
      }
    }
    for (const document of kit.documents) {
      if (!document.path.startsWith('beginner-course/step-cards/')) continue;
      for (const card of records(document.data.cards)) {
        const match = typeof card.gate === 'string' ? /^blocks\((stage-\d+)\)$/.exec(card.gate) : null;
        if (!match) throw new GateError('Invalid card gate');
        const boundary = stages.findIndex((stage) => stage.id === match[1]);
        if (boundary < 0) throw new GateError('Unknown card boundary');
        if (boundary > target) continue;
        const verification = records(card.verify);
        if (!verification.length) throw new GateError('Empty gate verification group');
        verification.forEach((check, index) => {
          const kind = check.auto !== undefined ? 'auto' : 'manual';
          const description = check[kind];
          if (!nonempty(card.id) || !nonempty(description) || (kind === 'manual' && check.record !== true)) {
            throw new GateError('Invalid gate check');
          }
          checks.push({ id: `${card.id}/${index}`, card: card.id, kind, description,
            ...(typeof check.runner === 'string' ? { runner: check.runner } : {}) });
        });
      }
    }
    // Later course stages without cards still have obligations, never an empty automatic pass.
    for (const stage of stages.slice(0, target)) {
      if (stage.card !== undefined) continue;
      if (!Array.isArray(stage.unlocks_when) || !stage.unlocks_when.every(nonempty)) throw new GateError('Invalid stage checks');
      stage.unlocks_when.forEach((description, index) => checks.push({ id: `${String(stage.id)}/${index}`, kind: 'auto', description }));
    }
    if (target > 0 && !checks.length) throw new GateError('Missing course checks');
  } else {
    if (!session.decision.gates.includes(id)) throw new GateError('Gate does not apply');
    for (const item of session.decision.depths.full) {
      if (item.question.gate === id || item.moduleData.gate === id) checks.push({ id: item.id, kind: 'question',
        description: String(item.question.ask) });
    }
    // Completing an interview is not verification of a physical design or production readiness.
    checks.push({ id, kind: 'review', description: id });
  }
  if (new Set(checks.map((check) => check.id)).size !== checks.length) throw new GateError('Duplicate gate checks');
  const deferrals: Record<string, Deferral> = Object.create(null) as Record<string, Deferral>;
  for (const [key, value] of Object.entries(options.deferrals ?? {})) {
    if (!checks.some((check) => check.id === key)) throw new GateError('Unknown deferred gate check');
    deferrals[key] = validateDeferral(value);
  }
  const result: GateResult = { id, allowed: false, stop: session.decision.stop, checks: [],
    contradictions: session.decision.contradictions };
  for (const check of checks) {
    let status: GateResult['checks'][number]['status'] = 'unverified';
    const deferral = deferrals[check.id];
    if (deferral && !result.stop) { result.checks.push({ ...check, status: 'deferred', deferral }); continue; }
    if (check.kind === 'question') {
      status = session.reask.includes(check.id) ? 'unanswered' : state.answers[check.id]?.state ?? 'unanswered';
    } else if (options.verify && !result.stop) {
      try {
        const fresh = await options.verify({ ...check });
        if (fresh === 'failed' || fresh === 'unverified' ||
            (check.kind === 'auto' && fresh === 'passed') || (check.kind !== 'auto' && fresh === 'manual')) status = fresh;
      } catch { status = 'failed'; }
    }
    result.checks.push({ ...check, status });
  }
  result.allowed = !result.stop && !result.contradictions.some((rule) => rule.severity === 'block') &&
    result.checks.every((check) => ['passed', 'manual', 'answered', 'deferred', 'not_applicable'].includes(check.status));
  return result;
}
