import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { loadKit, loadYamlFile } from '../../src/data/loader.js';
import { decide, EngineError } from '../../src/engine/index.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const kit = await loadKit(root);
const software = (await loadYamlFile(root, 'tests/scenarios/02-todo-app-with-accounts.yaml')).data;
const hardware = (await loadYamlFile(root, 'tests/scenarios/05-plant-waterer-iot.yaml')).data;
const safety = (await loadYamlFile(root, 'tests/scenarios/06-medical-device-beginner.yaml')).data;
type Answers = Parameters<typeof decide>[1];

test('schedules only the requested stage and preserves the full inspection snapshot', () => {
  const result = decide(kit, software.answers as Answers, { stage: 'idea' });
  expect(result.schedule.length).toBeGreaterThan(0);
  expect(result.schedule.every((item) => item.stage === 'idea')).toBe(true);
  expect(result.depths.full.length).toBeGreaterThan(result.schedule.length);
  expect(result.counts.idea).toBe(result.schedule.length + result.routerFlags.length);
});

test('quick and full use their own depth sets; hardware quick requests have a standard floor', () => {
  const quick = decide(kit, software.answers as Answers, { depth: 'quick' });
  const full = decide(kit, software.answers as Answers, { depth: 'full' });
  expect(quick.schedule).toEqual(quick.depths.quick);
  expect(full.schedule).toEqual(full.depths.full);
  expect(quick.schedule.length).toBeLessThan(full.schedule.length);
  const device = decide(kit, hardware.answers as Answers, { depth: 'quick' });
  expect(device.depth).toBe('standard');
  expect(device.depths.quick).toEqual(device.depths.standard);
});

test('stop rules retain their evidence but suppress actionable queues', () => {
  const result = decide(kit, safety.answers as Answers, { stage: 'idea' });
  expect(result.stop).toBe(true);
  expect(result.stopRules.length).toBeGreaterThan(0);
  expect(result.contradictions.some((rule) => rule.severity === 'stop')).toBe(true);
  expect(result.questionIds.length).toBeGreaterThan(0);
  expect(result.schedule).toEqual([]);
});

test('does not mutate answers or kit data and recomputes decisions after answer changes', () => {
  const answers = structuredClone(software.answers) as Answers;
  const before = JSON.stringify({ answers, kit });
  decide(kit, answers);
  expect(JSON.stringify({ answers, kit })).toBe(before);
  expect(decide(kit, {}).tier).toBe('T1');
  expect(decide(kit, { user_accounts: true }).tier).toBe('T2');
});

test('fails explicitly on missing core data and unsupported caller options', () => {
  expect(() => decide({ documents: [] }, {})).toThrow(EngineError);
  expect(() => decide(kit, {}, { depth: 'invalid' as 'quick' })).toThrow(EngineError);
  expect(() => decide(kit, {}, { stage: 'invalid' as 'idea' })).toThrow(EngineError);
});

test('refuses to classify a protected question as full_only', () => {
  const modified = structuredClone(kit);
  const depth = modified.documents.find((document) => document.path === 'question-bank/depth-profiles.yaml');
  const protectedQuestion = decide(kit, hardware.answers as Answers).depths.full
    .find((item) => typeof item.question.required_when === 'string');
  expect(protectedQuestion).toBeDefined();
  Object.assign(depth?.data ?? {}, { full_only: [protectedQuestion?.id] });
  expect(() => decide(modified, hardware.answers as Answers)).toThrow(/protected/);
});

test('counts a false recommended default as a default without accepting it as an answer', () => {
  const modified = structuredClone(kit);
  const answers = software.answers as Answers;
  const before = decide(modified, answers);
  const candidate = before.depths.standard.find((item) => item.stage === 'idea' &&
    !Object.hasOwn(item.question, 'default'));
  expect(candidate).toBeDefined();
  Object.assign(candidate?.question ?? {}, { default: false });
  const after = decide(modified, answers);
  expect(after.counts.idea).toBe(before.counts.idea);
  expect(after.counts.ideaNeedingInput).toBe(before.counts.ideaNeedingInput - 1);
  expect(Object.hasOwn(answers, candidate?.id ?? '')).toBe(false);
});
