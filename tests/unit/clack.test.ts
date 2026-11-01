import * as clack from '@clack/prompts';
import { fileURLToPath } from 'node:url';
import { expect, test, vi } from 'vitest';
import { loadKit } from '../../src/data/loader.js';
import { CANCELLED } from '../../src/interview/index.js';
import { createClackPort } from '../../src/interview/clack.js';

vi.mock('@clack/prompts', async (original) => ({
  ...await original<typeof import('@clack/prompts')>(),
  select: vi.fn(), password: vi.fn(), multiselect: vi.fn(), note: vi.fn(),
  log: { warn: vi.fn(), info: vi.fn() },
}));
const kit = await loadKit(fileURLToPath(new URL('../../', import.meta.url)));
const makePort = () => createClackPort(kit, new AbortController().signal);

test('maps cancellation at the state selector and value prompt', async () => {
  vi.mocked(clack.select).mockResolvedValueOnce(clack.CANCEL_SYMBOL);
  expect(await makePort().ask({ id: 'test', ask: 'Question', type: 'text' })).toBe(CANCELLED);
  vi.mocked(clack.select).mockResolvedValueOnce('answered');
  vi.mocked(clack.password).mockResolvedValueOnce(clack.CANCEL_SYMBOL);
  expect(await makePort().ask({ id: 'test', ask: 'Question', type: 'text' })).toBe(CANCELLED);
});

test('cancellation in either deferral field never returns a partial answer', async () => {
  const cases: (string | typeof clack.CANCEL_SYMBOL)[][] = [[clack.CANCEL_SYMBOL], ['Owner', clack.CANCEL_SYMBOL]];
  for (const replies of cases) {
    vi.mocked(clack.select).mockResolvedValueOnce('deferred');
    for (const reply of replies) vi.mocked(clack.password).mockResolvedValueOnce(reply);
    expect(await makePort().ask({ id: 'test', ask: 'Question', type: 'text' })).toBe(CANCELLED);
  }
});

test('supports false answers and excludes disallowed not-applicable states', async () => {
  vi.mocked(clack.select).mockResolvedValueOnce('answered').mockResolvedValueOnce(false);
  expect(await makePort().ask({ id: 'test', ask: 'Question', type: 'boolean', states_allowed: ['answered', 'deferred'] }))
    .toEqual({ state: 'answered', value: false });
  const options = vi.mocked(clack.select).mock.calls.at(-2)?.[0].options;
  expect(options?.some((option) => option.value === 'not_applicable')).toBe(false);
});

test('reviews defaults in one multiselect screen and maps cancellation', async () => {
  vi.mocked(clack.multiselect).mockResolvedValueOnce(clack.CANCEL_SYMBOL);
  expect(await makePort().review([{ id: 'a', question: { ask: 'Question' }, value: false,
    source: 'profile', why: 'Explanation', verified: '2026-10-31' }])).toBe(CANCELLED);
  const options = vi.mocked(clack.multiselect).mock.calls.at(-1)?.[0];
  expect(options?.initialValues).toEqual(['a']);
  expect(JSON.stringify(options)).toContain('2026-10-31');
});

test('aborted signals cancel before starting another prompt', async () => {
  const abort = new AbortController(); abort.abort();
  const calls = vi.mocked(clack.select).mock.calls.length;
  expect(await createClackPort(kit, abort.signal).ask({ ask: 'Question', type: 'text' })).toBe(CANCELLED);
  expect(vi.mocked(clack.select).mock.calls.length).toBe(calls);
});

test('direct boolean answers use one menu while retaining explicit defer actions', async () => {
  const before = vi.mocked(clack.select).mock.calls.length;
  vi.mocked(clack.select).mockResolvedValueOnce(false);
  const port = createClackPort(kit, new AbortController().signal, { directAnswers: true });
  expect(await port.ask({ ask: 'Question', type: 'boolean' })).toEqual({ state: 'answered', value: false });
  expect(vi.mocked(clack.select).mock.calls.length - before).toBe(1);
  const values = vi.mocked(clack.select).mock.calls.at(-1)?.[0].options.map((item) => item.value);
  expect(values).toEqual([true, false, 'deferred', 'not_applicable']);
});

test('direct text has no state menu; an explicit defer command still collects its metadata', async () => {
  const before = vi.mocked(clack.select).mock.calls.length;
  const port = createClackPort(kit, new AbortController().signal, { directAnswers: true });
  vi.mocked(clack.password).mockResolvedValueOnce('Small project');
  expect(await port.ask({ ask: 'Describe it', type: 'text' })).toEqual({ state: 'answered', value: 'Small project' });
  vi.mocked(clack.password).mockResolvedValueOnce('/defer').mockResolvedValueOnce('Owner').mockResolvedValueOnce('Before planning');
  expect(await port.ask({ ask: 'Describe it', type: 'text' })).toEqual({ state: 'deferred', owner: 'Owner', revisit_when: 'Before planning' });
  expect(vi.mocked(clack.select).mock.calls.length).toBe(before);
});

test('answered-only capability checklist uses readable labels without a redundant state menu', async () => {
  const before = vi.mocked(clack.select).mock.calls.length;
  vi.mocked(clack.multiselect).mockResolvedValueOnce([0]);
  const port = createClackPort(kit, new AbortController().signal, { directAnswers: true });
  expect(await port.ask({ ask: 'Features', type: 'multi_select', states_allowed: ['answered'], options: ['user_accounts'],
    option_labels: { user_accounts: 'People sign in' } })).toEqual({ state: 'answered', value: ['user_accounts'] });
  expect(vi.mocked(clack.select).mock.calls.length).toBe(before);
  expect(vi.mocked(clack.multiselect).mock.calls.at(-1)?.[0].options[0]?.label).toBe('People sign in');
});
