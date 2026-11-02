import * as clack from '@clack/prompts';
import { fileURLToPath } from 'node:url';
import { beforeEach, expect, test, vi } from 'vitest';
import { loadKit, loadYamlFile } from '../../src/data/loader.js';
import { createClackPort } from '../../src/interview/clack.js';
import { interview } from '../../src/interview/index.js';
import { createState, resume, setAnswer } from '../../src/state/index.js';
import type { InterviewPort, Proposal } from '../../src/interview/index.js';

vi.mock('@clack/prompts', async (original) => ({
  ...await original<typeof import('@clack/prompts')>(),
  intro: vi.fn(), outro: vi.fn(), text: vi.fn(), password: vi.fn(), select: vi.fn(), multiselect: vi.fn(), note: vi.fn(),
  log: { message: vi.fn(), info: vi.fn(), step: vi.fn(), warn: vi.fn() },
}));
const root = fileURLToPath(new URL('../../', import.meta.url));
const kit = await loadKit(root);
beforeEach(() => vi.clearAllMocks());

test('project answers use visible text and omit privacy warnings and explanatory paragraphs', async () => {
  const port = createClackPort(kit, new AbortController().signal, { directAnswers: true });
  port.start?.({ resuming: false });
  vi.mocked(clack.text).mockResolvedValueOnce('My portfolio');
  expect(await port.ask({ id: 'product.name', ask: 'Project name?', type: 'text', why: 'Unnecessary explanation.' }))
    .toEqual({ state: 'answered', value: 'My portfolio' });
  expect(clack.text).toHaveBeenCalledTimes(1); expect(clack.password).not.toHaveBeenCalled();
  const output = JSON.stringify([vi.mocked(clack.log.info).mock.calls, vi.mocked(clack.log.message).mock.calls, vi.mocked(clack.note).mock.calls]);
  expect(output).not.toMatch(/privacy|hidden|disclosure|never enter credentials|Unnecessary explanation/i);
});

test('visible text still rejects credential-shaped values with a generic validation message', async () => {
  vi.mocked(clack.text).mockResolvedValueOnce('A portfolio');
  await createClackPort(kit, new AbortController().signal, { directAnswers: true }).ask({ id: 'product.summary', ask: 'What are we building?', type: 'text' });
  const validate = vi.mocked(clack.text).mock.calls[0]?.[0].validate;
  expect(validate).toEqual(expect.any(Function));
  if (typeof validate !== 'function') throw new Error('Missing text validator');
  const rejected = await validate('password=synthetic-example-only');
  expect(rejected).toEqual(expect.any(String)); expect(String(rejected)).not.toContain('synthetic-example-only');
  expect(await validate('A portfolio website')).toBeUndefined();
});

function replies(answers: Record<string, unknown>): InterviewPort {
  return { ask: vi.fn(async (question) => ({ state: 'answered', value: String(question.id).startsWith('interview.')
    ? (question.options as string[]).filter((id) => answers[id] === true)
    : Object.hasOwn(answers, String(question.id)) ? answers[String(question.id)]
      : question.type === 'boolean' ? false : question.type === 'single_select' ? (question.options as unknown[])[0]
        : question.type === 'multi_select' ? [] : question.type === 'number' ? 1 : 'Example project' })),
    review: vi.fn(async (proposals: Proposal[]) => proposals.map((proposal) => proposal.id)), report: vi.fn(), invalid: vi.fn() };
}
test('ordinary software begins with project intent and never asks accident, business-proof or AI-policy questions', async () => {
  for (const [fixture, tier] of [['01-static-site-beginner', 'T1'], ['02-todo-app-with-accounts', 'T2']]) {
    const scenario = (await loadYamlFile(root, `tests/scenarios/${fixture}.yaml`)).data;
    const port = replies(scenario.answers as Record<string, unknown>);
    const result = await interview(kit, createState(kit), port, async () => {}, { guided: true });
    const ids = vi.mocked(port.ask).mock.calls.map(([question]) => String(question.id));
    expect(ids.slice(0, 5)).toEqual(['product.name', 'product.summary', 'product.platform', 'product.audience', 'features.core']);
    expect(ids.length).toBeLessThanOrEqual(7);
    expect(ids).not.toContain('harm_possible');
    expect(ids.some((id) => id.startsWith('val.') || id.startsWith('aic.'))).toBe(false);
    expect(vi.mocked(port.review).mock.calls.flatMap(([proposals]) => proposals).some((proposal) => proposal.id.startsWith('aic.'))).toBe(false);
    expect(result.status).toBe('completed'); expect(resume(result.state, kit).decision.tier).toBe(tier);
    expect(result.state.answers.harm_possible).toBeUndefined();
  }
});

test('hardware, AI decision-making and previously declared serious harm still use safety routing', async () => {
  for (const answers of [
    { 'product.platform': 'hardware_device', physical: true, harm_possible: 'death', 'product.team': 'solo_beginner' },
    { 'product.platform': 'ai_app', ai_decisions: true, harm_possible: 'serious_injury', 'product.team': 'solo_beginner' },
  ]) {
    const port = replies(answers);
    const result = await interview(kit, createState(kit), port, async () => {}, { guided: true });
    expect(result.status).toBe('stop'); expect(result.state.answers.harm_possible).toBeDefined();
  }
  let saved = setAnswer(createState(kit), kit, 'harm_possible', { state: 'answered', value: 'death' });
  saved = setAnswer(saved, kit, 'product.team', { state: 'answered', value: 'solo_beginner' });
  expect((await interview(kit, saved, replies({}), async () => {}, { guided: true })).status).toBe('stop');
});
