import { fileURLToPath } from 'node:url';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, vi } from 'vitest';
import { loadKit, loadYamlFile } from '../../src/data/loader.js';
import { createState, setAnswer, resume, saveState, loadState } from '../../src/state/index.js';
import { CANCELLED, interview } from '../../src/interview/index.js';
import type { InterviewPort, Proposal } from '../../src/interview/index.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const kit = await loadKit(root);
const persona = (await loadYamlFile(root, 'tests/scenarios/01-static-site-beginner.yaml')).data;
const answers = persona.answers as Record<string, unknown>;

function fakePort(): InterviewPort {
  return {
    ask: vi.fn(async (question) => {
      const id = String(question.id);
      const value = Object.hasOwn(answers, id) ? answers[id] : question.type === 'boolean' ? false
        : question.type === 'number' ? 1 : question.type === 'single_select' ? (question.options as unknown[])[0]
          : question.type === 'multi_select' ? [] : 'Example project answer';
      return { state: 'answered', value };
    }),
    review: vi.fn(async (proposals: Proposal[]) => proposals.map((proposal) => proposal.id)),
    report: vi.fn(),
    invalid: vi.fn(),
  };
}

test('asks only the idea queue, reviews defaults together, and saves every accepted answer', async () => {
  const port = fakePort();
  const save = vi.fn(async () => undefined);
  const result = await interview(kit, createState(kit), port, save);
  expect(result.status).toBe('completed');
  const session = resume(result.state, kit);
  expect(session.pending).toEqual([]);
  expect(session.pendingFlags).toEqual([]);
  expect(port.review).toHaveBeenCalledTimes(1);
  const asked = vi.mocked(port.ask).mock.calls.map(([question]) => String(question.id));
  const allowed = new Set([...session.decision.depths.full.filter((item) => item.stage === 'idea').map((item) => item.id),
    ...session.decision.routerFlags.map((question) => String(question.id))]);
  expect(asked.every((id) => allowed.has(id))).toBe(true);
  expect(save.mock.calls.length).toBeGreaterThanOrEqual(Object.keys(result.state.answers).length);
});

test('Ctrl+C before a prompt answer preserves existing answers and does not save the sentinel', async () => {
  const initial = setAnswer(createState(kit), kit, 'product.name', { state: 'answered', value: 'Keep me' });
  const port = fakePort();
  vi.mocked(port.ask).mockResolvedValueOnce(CANCELLED);
  const result = await interview(kit, initial, port, vi.fn(async () => undefined));
  expect(result.status).toBe('cancelled');
  expect(result.state.answers).toEqual(initial.answers);
});

test('cancellation on the defaults screen never accepts proposed defaults', async () => {
  const port = fakePort();
  vi.mocked(port.review).mockResolvedValueOnce(CANCELLED);
  const result = await interview(kit, createState(kit), port, vi.fn(async () => undefined));
  expect(result.status).toBe('cancelled');
  const proposals = vi.mocked(port.review).mock.calls[0]?.[0] ?? [];
  expect(proposals.length).toBeGreaterThan(0);
  expect(proposals.every((proposal) => !Object.hasOwn(result.state.answers, proposal.id))).toBe(true);
});

test('displays contradictions from YAML and stops immediately on a safety stop', async () => {
  const safety = (await loadYamlFile(root, 'tests/scenarios/06-medical-device-beginner.yaml')).data;
  let state = createState(kit);
  for (const [id, value] of Object.entries(safety.answers as Record<string, unknown>)) {
    state = setAnswer(state, kit, id, { state: 'answered', value });
  }
  const port = fakePort();
  const result = await interview(kit, state, port, vi.fn(async () => undefined));
  expect(result.status).toBe('stop');
  expect(port.ask).not.toHaveBeenCalled();
  expect(port.report).toHaveBeenCalledWith(expect.objectContaining({ kind: 'contradiction', id: 'C-011' }));
});

test('an invalid answer is rejected and retried without discarding the previous save', async () => {
  const port = fakePort();
  vi.mocked(port.ask).mockResolvedValueOnce({ state: 'answered', value: 'not a boolean' });
  const result = await interview(kit, createState(kit), port, vi.fn(async () => undefined));
  expect(result.status).toBe('completed');
  expect(port.invalid).toHaveBeenCalledTimes(1);
  expect(vi.mocked(port.ask).mock.calls[0]?.[0].id).toBe(vi.mocked(port.ask).mock.calls[1]?.[0].id);
});

test('an interrupted disk-backed interview resumes without re-asking an accepted router answer', async () => {
  const path = join(await mkdtemp(join(tmpdir(), 'scaffolder-interview-')), 'state.json');
  const port = fakePort();
  vi.mocked(port.ask).mockResolvedValueOnce({ state: 'answered', value: false }).mockResolvedValueOnce(CANCELLED);
  const first = await interview(kit, createState(kit), port, (state) => saveState(path, state));
  expect(first.status).toBe('cancelled');
  const restored = await loadState(path);
  expect(restored.answers).toEqual(first.state.answers);
  const nextPort = fakePort();
  vi.mocked(nextPort.ask).mockResolvedValueOnce(CANCELLED);
  await interview(kit, restored, nextPort, (state) => saveState(path, state));
  expect(vi.mocked(nextPort.ask).mock.calls[0]?.[0].id).not.toBe(vi.mocked(port.ask).mock.calls[0]?.[0].id);
});

test('unselected defaults are edited individually, never silently accepted', async () => {
  const port = fakePort();
  const ask = port.ask;
  port.ask = vi.fn(async (question) => question.id === 'product.depth'
    ? { state: 'answered', value: 'standard' } : ask(question));
  vi.mocked(port.review).mockResolvedValueOnce([]);
  const result = await interview(kit, createState(kit), port, vi.fn(async () => undefined));
  expect(result.status).toBe('completed');
  const reviewed = vi.mocked(port.review).mock.calls[0]?.[0] ?? [];
  const asked = new Set(vi.mocked(port.ask).mock.calls.map(([question]) => String(question.id)));
  const active = new Set(resume(result.state, kit).decision.questionIds);
  expect(reviewed.filter((proposal) => active.has(proposal.id)).every((proposal) => asked.has(proposal.id))).toBe(true);
});

test('can persist the cursor for a newly added bank question before asking it', async () => {
  const first = await interview(kit, createState(kit), fakePort(), vi.fn(async () => undefined));
  const updated = structuredClone(kit);
  const document = updated.documents.find((entry) => entry.path === 'question-bank/software/01-product-users-data.yaml');
  const modules = document?.data.modules as { questions: Record<string, unknown>[] }[];
  modules[0]?.questions.push({ id: 'product.interview_test', type: 'text', ask: 'Test new question', covers: ['project:scope'] });
  const path = join(await mkdtemp(join(tmpdir(), 'scaffolder-new-question-')), 'state.json');
  const port = fakePort();
  const result = await interview(updated, first.state, port, (state) => saveState(path, state));
  expect(result.status).toBe('completed');
  expect((await loadState(path)).answers['product.interview_test']).toBeDefined();
});
