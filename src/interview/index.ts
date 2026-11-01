import type { LoadedKit } from '../data/types.js';
import { check } from '../expressions/index.js';
import type { Value } from '../expressions/index.js';
import { createState, resume, setAnswer, StateError } from '../state/index.js';
import type { State } from '../state/index.js';

type Row = Readonly<Record<string, unknown>>;
export const CANCELLED = Symbol('interview-cancelled');
export interface Proposal {
  id: string; question: Row; value: Value; source: string; why: string; verified: string | null;
}
export interface InterviewEvent { kind: 'contradiction' | 'stop' | 'bank-change'; id: string; data: Row }
export interface InterviewPort {
  ask(question: Row): Promise<unknown | typeof CANCELLED>;
  review(proposals: Proposal[]): Promise<string[] | typeof CANCELLED>;
  report(event: InterviewEvent): void;
  invalid(): void;
  isCancelled?(): boolean;
}
function proposals(kit: LoadedKit, state: State): Proposal[] {
  const session = resume(state, kit);
  const result = new Map<string, Proposal>();
  const available = new Map(session.pending.map((item) => [item.id, item.question]));
  const add = (id: string, value: unknown, source: string, why: string, verified: string | null) => {
    const question = available.get(id);
    if (!question || value === 'pick_for_me' || value === 'auto_detect') return;
    try {
      setAnswer(state, kit, id, { state: 'answered', value });
      result.set(id, { id, question, value: value as Value, source, why, verified });
    } catch (error) { if (!(error instanceof StateError)) throw error; }
  };
  for (const [id, question] of available) {
    if (Object.hasOwn(question, 'default')) add(id, question.default, 'question', String(question.why ?? ''), null);
  }
  const recommendations = kit.documents.find((document) => document.path === 'rules/recommendations.yaml')?.data;
  for (const profile of (recommendations?.profiles ?? []) as Row[]) {
    if (!check(String(profile.when), session.environment)) continue;
    const verified = typeof recommendations?.last_verified === 'string' ? recommendations.last_verified : null;
    const apply = (rule: Row) => {
      for (const [id, value] of Object.entries((rule.sets ?? {}) as Row)) {
        add(id, value, String(profile.id), String(rule.why ?? profile.why ?? ''), verified);
      }
    };
    apply(profile);
    for (const conditional of (profile.conditional ?? []) as Row[]) {
      if (check(String(conditional.when), session.environment)) apply(conditional);
    }
  }
  return [...result.values()];
}

/** Terminal-independent idea interview. The caller supplies an awaited persistence operation. */
export async function interview(kit: LoadedKit, initial: State, port: InterviewPort,
  save: (state: State) => Promise<void>) {
  if (initial.progress.stage !== 'idea') throw new StateError('Interview requires the idea stage');
  let state = structuredClone(initial);
  let announced = new Set<string>();
  let driftAnnounced = false;
  const persistAnswer = async (id: string, input: unknown): Promise<boolean> => {
    let next: State;
    try { next = setAnswer(state, kit, id, input); }
    catch (error) {
      if (!(error instanceof StateError)) throw error;
      port.invalid();
      return false;
    }
    if (id === 'product.depth' && next.answers[id]?.state === 'answered') {
      next.progress.depth = next.answers[id].value as State['progress']['depth'];
    }
    await save(next);
    state = next;
    return true;
  };
  const ask = async (question: Row): Promise<boolean> => {
    const id = String(question.id);
    if (!Object.hasOwn(state.questions, id)) {
      const definition = createState(kit).questions[id];
      if (!definition) throw new StateError('Unknown interview question');
      state = { ...state, questions: { ...state.questions, [id]: definition } };
    }
    state = { ...state, progress: { ...state.progress, current_question: String(question.id) } };
    await save(state);
    while (!port.isCancelled?.()) {
      const input = await port.ask(question);
      if (input === CANCELLED || port.isCancelled?.()) return false;
      if (await persistAnswer(String(question.id), input)) return true;
    }
    return false;
  };
  while (!port.isCancelled?.()) {
    const session = resume(state, kit);
    if ((session.bankChanged || session.changedPacks.length > 0) && !driftAnnounced) {
      port.report({ kind: 'bank-change', id: state.bank_version, data: {
        bankChanged: session.bankChanged, changedPacks: session.changedPacks } });
      driftAnnounced = true;
    }
    const active = new Set(session.decision.contradictions.map((rule) => rule.id));
    for (const rule of session.decision.contradictions) {
      if (!announced.has(rule.id)) port.report({ kind: 'contradiction', id: rule.id, data: rule.data });
    }
    announced = active;
    if (session.decision.stop) {
      for (const rule of session.decision.stopRules) port.report({ kind: 'stop', id: rule.id, data: rule.data });
      return { status: 'stop' as const, state };
    }
    const flag = session.pendingFlags[0];
    if (flag) {
      if (!await ask(flag)) return { status: 'cancelled' as const, state };
      continue;
    }
    const recommended = proposals(kit, state);
    const proposedIds = new Set(recommended.map((proposal) => proposal.id));
    const next = session.pending.find((item) => !proposedIds.has(item.id));
    if (next) {
      if (!await ask(next.question)) return { status: 'cancelled' as const, state };
      continue;
    }
    if (recommended.length > 0) {
      const accepted = await port.review(recommended);
      if (accepted === CANCELLED || port.isCancelled?.()) return { status: 'cancelled' as const, state };
      if (!accepted.every((id) => proposedIds.has(id))) throw new StateError('Unknown reviewed question');
      for (const proposal of recommended) {
        const current = resume(state, kit);
        if (current.decision.stop || port.isCancelled?.()) break;
        if (!current.pending.some((item) => item.id === proposal.id)) continue;
        if (accepted.includes(proposal.id)) await persistAnswer(proposal.id, { state: 'answered', value: proposal.value });
        else if (!await ask(proposal.question)) return { status: 'cancelled' as const, state };
      }
      continue;
    }
    state = { ...state, progress: { ...state.progress, current_question: null } };
    await save(state);
    return { status: session.decision.contradictions.some((rule) => rule.severity === 'block')
      ? 'blocked' as const : 'completed' as const, state };
  }
  return { status: 'cancelled' as const, state };
}
