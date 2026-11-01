import { fileURLToPath } from 'node:url';
import { expect, test, vi } from 'vitest';
import { loadKit, loadYamlFile } from '../../src/data/loader.js';
import { createState, resume, setAnswer } from '../../src/state/index.js';
import { CANCELLED, interview } from '../../src/interview/index.js';
import type { InterviewPort, Proposal } from '../../src/interview/index.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const kit = await loadKit(root);
const fixture = (await loadYamlFile(root, 'tests/security-scenarios/short-interview.yaml')).data;
const persona = async (path: string) => (await loadYamlFile(root, `tests/scenarios/${path}`)).data;
function portFor(answers: Record<string, unknown>): InterviewPort {
  return { ask: vi.fn(async (question) => {
    const id = String(question.id);
    const value = id.startsWith('interview.') ? (question.options as string[]).filter((id) => answers[id] === true)
      : Object.hasOwn(answers, id) ? answers[id] : question.type === 'boolean' ? false
        : question.type === 'single_select' ? (question.options as unknown[])[0]
          : question.type === 'multi_select' ? [] : question.type === 'number' ? 1 : 'Example project';
    return { state: 'answered', value };
  }), review: vi.fn(async (proposals: Proposal[]) => proposals.map((item) => item.id)), report: vi.fn(), invalid: vi.fn() };
}

for (const path of ['01-static-site-beginner.yaml', '02-todo-app-with-accounts.yaml']) {
  test(`guided opening asks about the project first and reduces unnecessary prompts: ${path}`, async () => {
    const scenario = await persona(path); const port = portFor(scenario.answers as Record<string, unknown>);
    const save = vi.fn(async () => {});
    const result = await interview(kit, createState(kit), port, save, { guided: true });
    const asked = vi.mocked(port.ask).mock.calls.map(([question]) => String(question.id));
    expect(asked.slice(0, 3)).toEqual(fixture.opening);
    expect(asked).not.toContain('user_accounts');
    for (const id of fixture.later_questions as string[]) expect(asked).not.toContain(id);
    expect(asked.some((id) => id.startsWith('aic.'))).toBe(false);
    expect(asked).not.toContain('product.budget'); expect(asked).not.toContain('product.ai_tool');
    expect(asked).not.toContain('data.sensitive'); expect(asked).not.toContain('features.multi_tenant');
    expect(asked.length).toBeLessThanOrEqual(fixture.max_software_prompts as number);
    expect(result.state.answers.user_accounts).toEqual({ state: 'answered', value: (scenario.answers as Record<string, unknown>).user_accounts });
    expect(resume(result.state, kit).decision.tier).toBe((scenario.expect as Record<string, unknown>).tier);
    expect(resume(result.state, kit).pendingFlags).toEqual([]);
    expect(save).toHaveBeenCalled();
    console.log(`GUIDED ${String(scenario.id)}: ${asked.length} prompts + ${vi.mocked(port.review).mock.calls.length} defaults review`);
  });
}

test('cancelling a capability checklist never saves unconfirmed flags', async () => {
  const port = portFor({ 'product.platform': 'web_app' }); const ask = port.ask;
  port.ask = vi.fn(async (question) => String(question.id).startsWith('interview.') ? CANCELLED : ask(question));
  const result = await interview(kit, createState(kit), port, async () => {}, { guided: true });
  expect(result.status).toBe('cancelled');
  expect(result.state.answers['product.name']).toBeDefined(); expect(result.state.answers.user_accounts).toBeUndefined();
});

test('guided hardware still asks safety questions and stops a solo beginner facing serious harm', async () => {
  const scenario = await persona('06-medical-device-beginner.yaml'); const port = portFor(scenario.answers as Record<string, unknown>);
  const result = await interview(kit, createState(kit), port, async () => {}, { guided: true });
  expect(result.status).toBe('stop');
  expect(result.state.answers.harm_possible).toBeDefined();
});

test('invalid checklist values are retried without storing flags', async () => {
  const port = portFor({ 'product.platform': 'web_app' }); const ask = port.ask;
  let attempts = 0;
  port.ask = vi.fn(async (question) => !String(question.id).startsWith('interview.') ? ask(question)
    : ++attempts === 1 ? { state: 'answered', value: ['unknown_flag'] } : CANCELLED);
  const result = await interview(kit, createState(kit), port, async () => {}, { guided: true });
  expect(result.status).toBe('cancelled'); expect(port.invalid).toHaveBeenCalledTimes(1);
  expect(result.state.answers.user_accounts).toBeUndefined();
});

test('guided resume preserves a previously answered login flag without asking it again', async () => {
  const port = portFor({ 'product.platform': 'web_app' });
  const initial = setAnswer(createState(kit), kit, 'user_accounts', { state: 'answered', value: true });
  const result = await interview(kit, initial, port, async () => {}, { guided: true });
  expect(result.state.answers.user_accounts).toEqual(initial.answers.user_accounts);
  const checklists = vi.mocked(port.ask).mock.calls.map(([question]) => question).filter((question) => String(question.id).startsWith('interview.'));
  expect(checklists.every((question) => !(question.options as string[]).includes('user_accounts'))).toBe(true);
});
