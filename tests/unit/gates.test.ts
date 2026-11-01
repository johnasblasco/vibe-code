import { fileURLToPath } from 'node:url';
import { expect, test, vi } from 'vitest';
import { loadKit, loadYamlFile } from '../../src/data/loader.js';
import { createState, setAnswer } from '../../src/state/index.js';
import { evaluateGate } from '../../src/gates/index.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const kit = await loadKit(root);

test('course gates load all earlier blocking cards and fail closed without verifiers', async () => {
  const result = await evaluateGate(kit, createState(kit), 'stage-2');
  expect(result.allowed).toBe(false);
  expect(result.checks.map((check) => check.card)).toContain('env.install_tools');
  expect(result.checks.map((check) => check.card)).toContain('env.accounts_2fa');
  expect(result.checks.map((check) => check.card)).toContain('git.secret_scanner');
  expect(result.checks.every((check) => check.status === 'unverified')).toBe(true);
  expect(result.checks.map((check) => check.card)).not.toContain('deploy.hello_world');
});

test('fresh checks run on every evaluation; saved progress grants no passage', async () => {
  const state = createState(kit); state.progress.stage = 'operate';
  const verify = vi.fn(async (): Promise<'passed' | 'failed'> => 'passed');
  expect((await evaluateGate(kit, state, 'stage-1', { verify })).allowed).toBe(true);
  const calls = verify.mock.calls.length;
  expect((await evaluateGate(kit, state, 'stage-1', { verify })).allowed).toBe(true);
  expect(verify.mock.calls.length).toBe(calls * 2);
  verify.mockResolvedValueOnce('failed');
  expect((await evaluateGate(kit, state, 'stage-1', { verify })).allowed).toBe(false);
});

test('manual checks stay explicitly manual and cannot be passed as automatic results', async () => {
  const result = await evaluateGate(kit, createState(kit), 'stage-2', {
    verify: async (check) => check.kind === 'manual' ? 'manual' : 'passed',
  });
  expect(result.allowed).toBe(true);
  expect(result.checks.filter((check) => check.kind === 'manual').every((check) => check.status === 'manual')).toBe(true);
  expect((await evaluateGate(kit, createState(kit), 'stage-2', { verify: async () => 'passed' })).allowed).toBe(false);
});

test('explicit deferrals need owner, reason, and revisit trigger, and are never labelled passed', async () => {
  const initial = await evaluateGate(kit, createState(kit), 'stage-1');
  const deferrals = Object.fromEntries(initial.checks.map((check) => [check.id,
    { owner: 'Builder', reason: 'Waiting for installation', revisit_when: 'Before starting stage 1' }]));
  const result = await evaluateGate(kit, createState(kit), 'stage-1', { deferrals });
  expect(result.allowed).toBe(true);
  expect(result.checks.every((check) => check.status === 'deferred')).toBe(true);
  deferrals[initial.checks[0]!.id]!.reason = '';
  await expect(evaluateGate(kit, createState(kit), 'stage-1', { deferrals })).rejects.toThrow();
});

test('hardware gates require current answers and a fresh review, independent of depth', async () => {
  const fixture = (await loadYamlFile(root, 'tests/scenarios/05-plant-waterer-iot.yaml')).data;
  let state = createState(kit);
  for (const [id, value] of Object.entries(fixture.answers as Record<string, unknown>)) {
    state = setAnswer(state, kit, id, { state: 'answered', value });
  }
  const result = await evaluateGate(kit, state, 'before-hardware-design-freeze');
  expect(result.allowed).toBe(false);
  expect(result.checks.some((check) => check.kind === 'question' && check.status === 'unanswered')).toBe(true);
  expect(result.checks.some((check) => check.kind === 'review' && check.status === 'unverified')).toBe(true);
  await expect(evaluateGate(kit, createState(kit), 'before-hardware-design-freeze')).rejects.toThrow();
});

test('stop rules cannot be bypassed by fresh successes or deferrals', async () => {
  const fixture = (await loadYamlFile(root, 'tests/scenarios/06-medical-device-beginner.yaml')).data;
  let state = createState(kit);
  for (const [id, value] of Object.entries(fixture.answers as Record<string, unknown>)) {
    state = setAnswer(state, kit, id, { state: 'answered', value });
  }
  const verify = vi.fn(async () => 'passed' as const);
  const result = await evaluateGate(kit, state, 'stage-1', { verify });
  expect(result.allowed).toBe(false); expect(result.stop).toBe(true);
  expect(verify).not.toHaveBeenCalled();
});

test('unknown gates are rejected; check exceptions fail closed without revealing their contents', async () => {
  await expect(evaluateGate(kit, createState(kit), 'unknown')).rejects.toThrow();
  const result = await evaluateGate(kit, createState(kit), 'stage-1', {
    verify: async () => { throw new Error('synthetic-private-diagnostic'); },
  });
  expect(result.allowed).toBe(false);
  expect(JSON.stringify(result)).not.toContain('synthetic-private-diagnostic');
});

const integrity = (await loadYamlFile(root, 'tests/security-scenarios/gate-integrity.yaml')).data;
for (const scenario of integrity.cases as Record<string, string>[]) {
  test(`malformed gate regression: ${scenario.id}`, async () => {
    const cloned = structuredClone(kit);
    const changed = { documents: [...cloned.documents] };
    const document = changed.documents.find((item) => item.path === scenario.file)!;
    if (scenario.change === 'empty_verify') {
      (document.data.cards as Record<string, unknown>[]).find((card) => card.id === scenario.card)!.verify = [];
    } else if (scenario.change === 'remove_file') changed.documents.splice(changed.documents.indexOf(document), 1);
    else throw new Error('Unknown security scenario mutation');
    expect(scenario.expected).toBe('rejected');
    await expect(evaluateGate(changed, createState(changed), scenario.gate!, { verify: async () => 'passed' })).rejects.toThrow();
  });
}
