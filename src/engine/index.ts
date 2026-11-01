import { posix } from 'node:path';
import type { LoadedKit } from '../data/types.js';
import { check } from '../expressions/index.js';
import type { Environment } from '../expressions/index.js';

type Row = Readonly<Record<string, unknown>>;
export type Depth = 'quick' | 'standard' | 'full';
export type Stage = 'idea' | 'plan' | 'design' | 'build' | 'production' | 'prelaunch' | 'operate';
const stages: readonly string[] = ['idea', 'plan', 'design', 'build', 'production', 'prelaunch', 'operate'];
const protectedNamespaces = new Set(['beginner-ops', 'safety', 'en303645', 'cra', 'red']);

export class EngineError extends Error { override name = 'EngineError'; }
export interface ScheduledQuestion {
  readonly id: string;
  readonly file: string;
  readonly module: string;
  readonly stage: Stage;
  readonly question: Row;
  readonly moduleData: Row;
  readonly required: boolean;
}
export interface AppliedEntry { readonly id: string; readonly data: Row }
export interface AppliedRule extends AppliedEntry { readonly severity: string }

function row(value: unknown): Row {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new EngineError('Expected an engine data mapping');
  return value as Row;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value) throw new EngineError('Expected a nonempty engine data string');
  return value;
}
function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new EngineError('Expected an engine data list');
  return value;
}
function rows(value: unknown): Row[] { return array(value).map(row); }
function strings(value: unknown): string[] { return array(value).map(text); }
function applies(value: unknown, answers: Environment): boolean {
  return value === undefined ? true : check(text(value), answers);
}

export function decide(kit: LoadedKit, answers: Environment,
  options: { depth?: Depth; stage?: Stage } = {}) {
  const requestedDepth = options.depth ?? 'standard';
  if (!['quick', 'standard', 'full'].includes(requestedDepth)) throw new EngineError('Unknown depth');
  if (options.stage !== undefined && !stages.includes(options.stage)) throw new EngineError('Unknown stage');
  const documents = new Map<string, Row>();
  for (const document of kit.documents) {
    if (documents.has(document.path)) throw new EngineError('Duplicate engine document');
    documents.set(document.path, document.data);
  }
  const requiredDocument = (path: string): Row => {
    const document = documents.get(path);
    if (!document) throw new EngineError(`Missing engine document: ${path}`);
    return document;
  };
  const router = requiredDocument('question-bank/00-router.yaml');
  const profile = requiredDocument('question-bank/depth-profiles.yaml');
  const tierRules = rows(router.tiers);
  const tierIds = tierRules.map((rule) => text(rule.id));
  if (new Set(tierIds).size !== tierIds.length) throw new EngineError('Duplicate tier');
  const tierIndex = tierRules.findIndex((rule) => check(text(rule.when), answers));
  const tier = tierIds[tierIndex];
  if (tier === undefined) throw new EngineError('No tier matched');
  const allowedTier = (minimum: unknown): boolean => {
    if (minimum === undefined) return true;
    const index = tierIds.indexOf(text(minimum));
    if (index === -1) throw new EngineError('Unknown minimum tier');
    return index >= tierIndex;
  };

  const available = [...documents.keys()].filter((path) => path.startsWith('question-bank/')).sort();
  const files: string[] = [];
  for (const rule of tierRules.slice(tierIndex)) {
    for (const addition of strings(rule.adds)) {
      if (addition.includes('..') || addition.startsWith('/')) throw new EngineError('Invalid module addition');
      const pattern = `question-bank/${addition}${addition.includes('*') ? '' : '.yaml'}`;
      const matches = available.filter((path) => posix.matchesGlob(path, pattern));
      if (matches.length === 0) throw new EngineError('Module addition matched no files');
      for (const path of matches) {
        const id = path.slice('question-bank/'.length, -'.yaml'.length);
        if (id !== 'depth-profiles' && !files.includes(id)) files.push(id);
      }
    }
  }

  const modules: { file: string; data: Row }[] = [];
  const all: ScheduledQuestion[] = [];
  const gates = new Set<string>();
  const seenQuestions = new Set<string>();
  for (const file of files) {
    const document = requiredDocument(`question-bank/${file}.yaml`);
    for (const module of rows(document.modules ?? [])) {
      if (!allowedTier(module.tier_min ?? document.tier_min) || !applies(module.load_when, answers)) continue;
      const stage = text(module.stage);
      if (!stages.includes(stage)) throw new EngineError('Unknown module stage');
      const name = text(module.module);
      modules.push({ file, data: module });
      if (module.gate !== undefined) gates.add(text(module.gate));
      for (const question of rows(module.questions ?? [])) {
        const id = text(question.id);
        if (seenQuestions.has(id)) throw new EngineError('Duplicate question identifier');
        seenQuestions.add(id);
        if (question.gate !== undefined) gates.add(text(question.gate));
        all.push({ id, file, module: name, stage: stage as Stage, question, moduleData: module,
          required: question.required_when === undefined ? false : applies(question.required_when, answers) });
      }
    }
  }

  const fullOnly = new Set(strings(profile.full_only));
  const quickIds = new Set([...strings(profile.quick), ...strings(profile.always)]);
  for (const item of all) {
    const protectedQuestion = item.question.gate !== undefined || item.moduleData.gate !== undefined ||
      item.question.required_when !== undefined || strings(item.question.covers).some((tag) =>
        protectedNamespaces.has(tag.split(':')[0] ?? ''));
    if (fullOnly.has(item.id) && protectedQuestion) throw new EngineError('A protected question cannot be full_only');
  }
  const standard = all.filter((item) => !fullOnly.has(item.id));
  const hardwareFloor = tier === 'T4' || tier === 'T5';
  const depths = { full: all, standard,
    quick: hardwareFloor ? [...standard] : all.filter((item) => quickIds.has(item.id)) };
  const depth: Depth = hardwareFloor && requestedDepth === 'quick' ? 'standard' : requestedDepth;
  const byStage: Partial<Record<Stage, ScheduledQuestion[]>> = {};
  for (const item of depths[depth]) (byStage[item.stage] ??= []).push(item);
  const routerFlags = rows(router.flags).filter((flag) => applies(flag.ask_when, answers));

  const failureModes: AppliedEntry[] = [];
  for (const [path, document] of documents) {
    if (!path.startsWith('failure-modes/')) continue;
    for (const entry of rows(document.entries)) {
      if (check(text(entry.applies_when), answers)) failureModes.push({ id: text(entry.id), data: entry });
    }
  }
  const contradictions: AppliedRule[] = rows(requiredDocument('rules/contradictions.yaml').rules)
    .filter((rule) => check(text(rule.when), answers))
    .map((rule) => ({ id: text(rule.id), severity: text(rule.severity), data: rule }));
  const stopRules: AppliedEntry[] = rows(router.stop_rules ?? [])
    .filter((rule) => check(text(rule.when), answers)).map((rule) => ({ id: text(rule.id), data: rule }));
  const stop = stopRules.length > 0 || contradictions.some((rule) => rule.severity === 'stop');
  const idea = standard.filter((item) => item.stage === 'idea');
  return {
    tier, files, modules, questionIds: all.map((item) => item.id), gates: [...gates],
    depths, depth, byStage, routerFlags, failureModes, contradictions, stopRules, stop,
    schedule: stop ? [] : depths[depth].filter((item) => options.stage === undefined || item.stage === options.stage),
    counts: { idea: idea.length + routerFlags.length,
      ideaNeedingInput: idea.filter((item) => !Object.hasOwn(item.question, 'default')).length + routerFlags.length },
  };
}
