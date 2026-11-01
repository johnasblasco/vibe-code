import { createHash, randomUUID } from 'node:crypto';
import { lstat, open, readFile, realpath, rename, unlink } from 'node:fs/promises';
import { dirname, join, parse as parsePath, resolve } from 'node:path';
import type { LoadedKit } from '../data/types.js';
import { decide } from '../engine/index.js';
import type { Depth, Stage } from '../engine/index.js';
import type { Environment, Value } from '../expressions/index.js';

type Row = Record<string, unknown>;
type Answer = { state: 'answered'; value: Value } |
  { state: 'deferred'; owner: string; revisit_when: string } |
  { state: 'not_applicable'; reason: string };
interface Definition { type: string; options?: Value[]; states_allowed?: string[] }
interface PackSnapshot { hash: string; affects_questions: string[] }
export interface State {
  schema: 'scaffolder-state/v1';
  bank_version: string;
  answers: Record<string, Answer>;
  progress: { stage: Stage; depth: Depth; current_question: string | null };
  questions: Record<string, Definition>;
  packs: Record<string, PackSnapshot>;
}
export class StateError extends Error { override name = 'StateError'; }
const stages = ['idea', 'plan', 'design', 'build', 'production', 'prelaunch', 'operate'];
const states = ['answered', 'deferred', 'not_applicable'];
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
function fail(): never { throw new StateError('Invalid state data'); }
function record(value: unknown): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail();
  return value as Row;
}
function nonempty(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }
function exact(value: Row, keys: string[]): void {
  if (Object.keys(value).some((key) => !keys.includes(key)) || keys.some((key) => !Object.hasOwn(value, key))) fail();
}
export function noSecrets(value: unknown): void {
  if (typeof value === 'string') {
    const patterns = [
      /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{16,}/,
      /\b(?:gh[pousr]_|github_pat_|xox[baprs]-)[A-Za-z0-9_-]{16,}/,
      /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
      /\bsk-[A-Za-z0-9_-]{20,}/,
      /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/,
      /\b(?:password|api[_ -]?key|secret|token)\s*[:=]\s*\S+/i,
      /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s@]+@/i,
      /\b[a-z][a-z0-9+.-]*:\/\/[^\s/?#]*@/i,
      /\bauthorization\s*:\s*(?:bearer|basic)\s+\S+/i,
      /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
    ];
    if (patterns.some((pattern) => pattern.test(value))) throw new StateError('State cannot contain secret-shaped values');
  } else if (Array.isArray(value)) value.forEach(noSecrets);
  else if (value && typeof value === 'object') Object.values(value).forEach(noSecrets);
}
function validValue(value: unknown): value is Value {
  return typeof value === 'string' || typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value)) ||
    (Array.isArray(value) && value.every(validValue));
}
function definition(value: unknown): Definition {
  const source = record(value);
  const types = ['text', 'number', 'boolean', 'single_select', 'multi_select', 'rank_priorities'];
  if (typeof source.type !== 'string' || !types.includes(source.type)) fail();
  const result: Definition = { type: source.type };
  if (source.options !== undefined) {
    if (!Array.isArray(source.options) || !source.options.every(validValue)) fail();
    result.options = structuredClone(source.options);
  }
  if (source.states_allowed !== undefined) {
    if (!Array.isArray(source.states_allowed) || !source.states_allowed.every((item) => typeof item === 'string' && states.includes(item))) fail();
    result.states_allowed = [...source.states_allowed];
  }
  return result;
}
function validateAnswer(input: unknown, question: Definition): Answer {
  const answer = record(input);
  if (!states.includes(String(answer.state)) ||
      !(question.states_allowed ?? states).includes(String(answer.state))) fail();
  if (answer.state === 'answered') {
    exact(answer, ['state', 'value']);
    if (!validValue(answer.value)) fail();
    const value = answer.value;
    if (question.type === 'text' && typeof value !== 'string') fail();
    if (question.type === 'boolean' && typeof value !== 'boolean') fail();
    if (question.type === 'number' && typeof value !== 'number') fail();
    if (question.type === 'single_select' && !question.options?.includes(value)) fail();
    if (['multi_select', 'rank_priorities'].includes(question.type) &&
        (!Array.isArray(value) || new Set(value).size !== value.length ||
          !value.every((item) => question.options?.includes(item)))) fail();
  } else if (answer.state === 'deferred') {
    exact(answer, ['state', 'owner', 'revisit_when']);
    if (!nonempty(answer.owner) || !nonempty(answer.revisit_when)) fail();
  } else {
    exact(answer, ['state', 'reason']);
    if (!nonempty(answer.reason)) fail();
  }
  noSecrets(answer);
  return structuredClone(answer) as Answer;
}

/** Validate an offered value only. This grants no acceptance, persistence or gate status. */
export function validateAnswerForQuestion(question: unknown, answer: unknown): Answer {
  return validateAnswer(answer, definition(question));
}

export function createState(kit: LoadedKit): State {
  const version = kit.documents.find((document) => document.path === 'question-bank/manifest.yaml')?.data.bank_version;
  if (typeof version !== 'string' || !semver.test(version)) fail();
  const questions: Record<string, Definition> = Object.create(null) as Record<string, Definition>;
  const packs: Record<string, PackSnapshot> = Object.create(null) as Record<string, PackSnapshot>;
  for (const document of kit.documents) {
    if (document.path.startsWith('question-bank/')) {
      const groups = [document.data, ...((document.data.modules ?? []) as unknown[]).map(record)];
      for (const group of groups) {
        for (const input of [...((group.flags ?? []) as unknown[]), ...((group.questions ?? []) as unknown[])]) {
          const question = record(input);
          if (!nonempty(question.id) || Object.hasOwn(questions, question.id)) fail();
          questions[question.id] = definition(question);
        }
      }
    } else if (document.path.startsWith('knowledge-packs/')) {
      const id = document.data.id;
      if (!nonempty(id)) fail();
      packs[id] = { hash: createHash('sha256').update(JSON.stringify(document.data)).digest('hex'),
        affects_questions: (document.data.affects_questions ?? []) as string[] };
    }
  }
  return { schema: 'scaffolder-state/v1', bank_version: version, answers: {},
    progress: { stage: 'idea', depth: 'standard', current_question: null }, questions, packs };
}

function validated(input: unknown): State {
  const value = record(input);
  exact(value, ['schema', 'bank_version', 'answers', 'progress', 'questions', 'packs']);
  if (value.schema !== 'scaffolder-state/v1' || typeof value.bank_version !== 'string' ||
      !semver.test(value.bank_version)) fail();
  const progress = record(value.progress);
  exact(progress, ['stage', 'depth', 'current_question']);
  if (!stages.includes(String(progress.stage)) || !['quick', 'standard', 'full'].includes(String(progress.depth)) ||
      !(progress.current_question === null || nonempty(progress.current_question))) fail();
  const questions = record(value.questions);
  if (typeof progress.current_question === 'string' && !Object.hasOwn(questions, progress.current_question)) fail();
  for (const question of Object.values(questions)) definition(question);
  const answers = record(value.answers);
  for (const [id, answer] of Object.entries(answers)) {
    if (!Object.hasOwn(questions, id)) fail();
    validateAnswer(answer, definition(questions[id]));
  }
  for (const pack of Object.values(record(value.packs))) {
    const snapshot = record(pack);
    exact(snapshot, ['hash', 'affects_questions']);
    if (typeof snapshot.hash !== 'string' || !/^[a-f0-9]{64}$/.test(snapshot.hash) ||
        !Array.isArray(snapshot.affects_questions) || !snapshot.affects_questions.every(nonempty)) fail();
  }
  noSecrets(value);
  return structuredClone(value) as unknown as State;
}

export function setAnswer(state: State, kit: LoadedKit, id: string, answer: unknown): State {
  const next = validated(state);
  const current = createState(kit);
  if (!Object.hasOwn(current.questions, id)) fail();
  const question = current.questions[id];
  if (!question) fail();
  next.questions[id] = question;
  next.answers[id] = validateAnswer(answer, question);
  return validated(next);
}

export function resume(state: State, kit: LoadedKit) {
  const saved = validated(state);
  const current = createState(kit);
  const reask: string[] = [];
  const environment: Record<string, Value> = Object.create(null) as Record<string, Value>;
  for (const [id, answer] of Object.entries(saved.answers)) {
    const question = current.questions[id];
    if (!question) continue; // Historical/retired answers remain in saved state for inspection.
    if (JSON.stringify(question) !== JSON.stringify(saved.questions[id])) { reask.push(id); continue; }
    validateAnswer(answer, question);
    if (answer.state === 'answered') environment[id] = answer.value;
  }
  const decision = decide(kit, environment as Environment, saved.progress);
  const packIds = new Set([...Object.keys(saved.packs), ...Object.keys(current.packs)]);
  const changedPacks = [...packIds].filter((id) => {
    const before = saved.packs[id];
    const after = current.packs[id];
    return before?.hash !== after?.hash && [...(before?.affects_questions ?? []), ...(after?.affects_questions ?? [])]
      .some((question) => Object.hasOwn(saved.answers, question) && saved.answers[question]?.state === 'answered');
  });
  return { state: saved, environment, decision, reask, changedPacks,
    bankChanged: saved.bank_version !== current.bank_version,
    newQuestions: Object.keys(current.questions).filter((id) => !Object.hasOwn(saved.questions, id)),
    pendingFlags: decision.routerFlags.filter((flag) => typeof flag.id === 'string' &&
      (!Object.hasOwn(saved.answers, flag.id) || reask.includes(flag.id))),
    pending: decision.schedule.filter((question) => !Object.hasOwn(saved.answers, question.id) || reask.includes(question.id)),
    requiresGateVerification: true as const };
}

async function checkedPath(path: string): Promise<string> {
  const absolute = resolve(path);
  const root = parsePath(absolute).root;
  let current = root;
  for (const part of absolute.slice(root.length).split(/[\\/]/)) {
    current = join(current, part);
    try { if ((await lstat(current)).isSymbolicLink()) throw new StateError('Symlink state paths are not supported'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  await realpath(dirname(absolute)); // Parent must exist; this operation never creates project folders.
  return absolute;
}

export async function saveState(path: string, state: State): Promise<void> {
  const safe = validated(state);
  let temporary: string | undefined;
  try {
    const target = await checkedPath(path);
    try { validated(JSON.parse(await readFile(target, 'utf8'))); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    const candidate = `${target}.${randomUUID()}.tmp`;
    const file = await open(candidate, 'wx', 0o600);
    temporary = candidate;
    try { await file.writeFile(JSON.stringify(safe, null, 2) + '\n', 'utf8'); await file.sync(); }
    finally { await file.close(); }
    await checkedPath(target);
    await rename(temporary, target);
    temporary = undefined;
  } catch { throw new StateError('Unable to save state'); }
  finally { if (temporary) await unlink(temporary).catch(() => undefined); }
}

export async function loadState(path: string): Promise<State> {
  try { return validated(JSON.parse(await readFile(await checkedPath(path), 'utf8'))); }
  catch { throw new StateError('Unable to load valid state'); }
}

export async function answerAndSave(path: string, state: State, kit: LoadedKit, id: string, answer: unknown): Promise<State> {
  const next = setAnswer(state, kit, id, answer);
  await saveState(path, next);
  return next;
}
