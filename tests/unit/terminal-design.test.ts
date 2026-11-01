import * as clack from '@clack/prompts';
import { fileURLToPath } from 'node:url';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, expect, test, vi } from 'vitest';
import { loadKit } from '../../src/data/loader.js';
import { createClackPort } from '../../src/interview/clack.js';
import { banner } from '../../src/interview/ui.js';
import { CANCELLED } from '../../src/interview/index.js';
import { EXIT, runCli } from '../../src/cli/program.js';

vi.mock('@clack/prompts', async (original) => ({
  ...await original<typeof import('@clack/prompts')>(),
  intro: vi.fn(), outro: vi.fn(), select: vi.fn(), password: vi.fn(), multiselect: vi.fn(), note: vi.fn(),
  updateSettings: vi.fn(), log: { message: vi.fn(), info: vi.fn(), step: vi.fn(), warn: vi.fn() },
}));
const root = fileURLToPath(new URL('../../', import.meta.url));
const kit = await loadKit(root);
const make = () => createClackPort(kit, new AbortController().signal, { directAnswers: true });
beforeEach(() => vi.clearAllMocks());

test('fresh and resumed sessions welcome the user without forcing accessibility off or on', () => {
  const port = make();
  expect(port.start).toEqual(expect.any(Function));
  port.start?.({ resuming: false });
  expect(JSON.stringify(vi.mocked(clack.intro).mock.calls)).toContain('vibecode');
  expect(JSON.stringify(vi.mocked(clack.log.info).mock.calls)).toContain('From idea');
  expect(vi.mocked(clack.updateSettings).mock.calls[0]?.[0]).not.toHaveProperty('accessible');
  vi.clearAllMocks();
  make().start?.({ resuming: true });
  expect(JSON.stringify(vi.mocked(clack.log.info).mock.calls)).toContain('Welcome back');
});

test('banner comes from YAML and falls back to a compact wordmark in narrow terminals', () => {
  const wide = banner(kit, 90); const narrow = banner(kit, 30);
  expect(wide.split('\n').length).toBeGreaterThan(2);
  expect(narrow).toBe('vibecode');
  expect(wide.split('\n').every((line) => line.length <= 86)).toBe(true);
  const modified = { ...kit, documents: kit.documents.map((document) => document.path === 'beginner-course/interview-ui.yaml'
    ? { ...document, data: { ...document.data, banner: 'CUSTOM BANNER' } } : document) };
  expect(banner(modified, 90)).toBe('CUSTOM BANNER');
});

test('questions use section headings, stable prompt numbers, concise help and one privacy notice', async () => {
  const port = make(); port.start?.({ resuming: false });
  for (const [id, ask] of [['product.name', 'Name?'], ['product.summary', 'Description?']]) {
    vi.mocked(clack.password).mockResolvedValueOnce('Safe project information');
    await port.ask({ id, ask, why: 'Helpful explanation.', type: 'text' });
  }
  expect(clack.note).not.toHaveBeenCalled();
  expect(vi.mocked(clack.log.step).mock.calls).toHaveLength(1);
  expect(vi.mocked(clack.log.step).mock.calls[0]?.[0]).toContain('Your project');
  const messages = vi.mocked(clack.password).mock.calls.map(([options]) => options.message);
  expect(messages[0]).toContain('1. Name?'); expect(messages[1]).toContain('2. Description?');
  const privacy = vi.mocked(clack.log.info).mock.calls.filter(([message]) => message.includes('never enter credentials'));
  expect(privacy).toHaveLength(1);
  expect(vi.mocked(clack.password).mock.calls.every(([options]) => options.mask === '*')).toBe(true);
});

test('default review uses friendly values while keeping reasons, sources and verification dates', async () => {
  vi.mocked(clack.multiselect).mockResolvedValueOnce(['sample']);
  await make().review([{ id: 'sample', question: { ask: 'Need storage?' }, value: false,
    source: 'reviewed-profile', why: 'No stored data needed.', verified: '2026-11-01' }]);
  const prompt = vi.mocked(clack.multiselect).mock.calls[0]?.[0];
  expect(prompt?.options[0]?.label).toContain('No');
  expect(prompt?.options[0]?.label).not.toContain('false');
  expect(prompt?.options[0]?.hint).toContain('2026-11-01');
  expect(prompt?.options[0]?.hint).toContain('reviewed-profile');
  expect(prompt?.initialValues).toEqual(['sample']);
});

test('review uses brief YAML labels and describes built-in defaults without empty provenance punctuation', async () => {
  vi.mocked(clack.multiselect).mockResolvedValueOnce(['product.depth']);
  await make().review([{ id: 'product.depth', question: { ask: 'How thorough should setup be?' }, value: 'standard',
    source: 'question', why: '', verified: null }]);
  const option = vi.mocked(clack.multiselect).mock.calls[0]?.[0].options[0];
  expect(option?.label).toBe('Setup depth: standard');
  expect(option?.hint).toBe('Source: Built-in default');
});

test('text prompts keep action hints outside their primary line so Clack guide bars align', async () => {
  vi.mocked(clack.password).mockResolvedValueOnce('Demo');
  await make().ask({ id: 'product.name', ask: 'Name?', type: 'text' });
  expect(vi.mocked(clack.password).mock.calls[0]?.[0].message).not.toContain('\n');
  expect(JSON.stringify(vi.mocked(clack.log.message).mock.calls)).toContain('/defer');
});

test('long question continuations retain a guide instead of wrapping into an unlabelled line', async () => {
  vi.mocked(clack.password).mockResolvedValueOnce('Demo');
  await make().ask({ id: 'sample', ask: 'A question with context that needs several lines in a normal terminal. '.repeat(3), type: 'text' });
  expect(vi.mocked(clack.password).mock.calls[0]?.[0].message).toContain(`\n${clack.S_BAR}  `);
});

test('completion shows next commands; cancellation never claims completion', () => {
  const port = make(); expect(port.finish).toEqual(expect.any(Function));
  port.finish?.('completed');
  expect(JSON.stringify(vi.mocked(clack.note).mock.calls)).toContain('vibecode generate');
  vi.clearAllMocks(); port.finish?.('cancelled');
  expect(clack.note).not.toHaveBeenCalled();
  expect(JSON.stringify(vi.mocked(clack.outro).mock.calls)).toContain('resume');
  expect(JSON.stringify(vi.mocked(clack.outro).mock.calls)).not.toContain('complete');
});

test('long menus scroll while preserving every available answer', async () => {
  const options = Array.from({ length: 20 }, (_, index) => `option_${index}`);
  vi.mocked(clack.select).mockResolvedValueOnce(14);
  expect(await make().ask({ id: 'sample', ask: 'Choose one', type: 'single_select', options }))
    .toEqual({ state: 'answered', value: 'option_14' });
  const menu = vi.mocked(clack.select).mock.calls[0]?.[0];
  expect(menu?.maxItems).toBe(7);
  expect(menu?.options).toHaveLength(22);
});

test('CLI starts and closes fresh/resumed sessions once, preserving cancellation exit codes', async () => {
  const path = join(await mkdtemp(join(tmpdir(), 'vibecode-design-')), 'state.json');
  const start = vi.fn(); const finish = vi.fn();
  const io = { kitRoot: root, tty: true, out: vi.fn(), err: vi.fn(), portFactory: () => ({ start, finish,
    ask: async () => CANCELLED, review: async (): Promise<typeof CANCELLED> => CANCELLED, report: vi.fn(), invalid: vi.fn() }) };
  expect(await runCli(['init', '--state', path], io)).toBe(EXIT.CANCELLED);
  expect(start).toHaveBeenLastCalledWith({ resuming: false });
  expect(finish).toHaveBeenLastCalledWith('cancelled');
  expect(await runCli(['next', '--state', path], io)).toBe(EXIT.CANCELLED);
  expect(start).toHaveBeenLastCalledWith({ resuming: true });
  expect(start).toHaveBeenCalledTimes(2); expect(finish).toHaveBeenCalledTimes(2);
  expect(io.out).not.toHaveBeenCalled();
});
