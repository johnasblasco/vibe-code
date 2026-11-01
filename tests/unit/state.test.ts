import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { loadKit } from '../../src/data/loader.js';
import { createState, setAnswer, resume, saveState, loadState, answerAndSave, StateError } from '../../src/state/index.js';

const kit = await loadKit(fileURLToPath(new URL('../../', import.meta.url)));
const tempFile = async () => join(await mkdtemp(join(tmpdir(), 'scaffolder-state-')), 'state.json');

test('records all three states, saves readable JSON, and resumes only answered values', async () => {
  const path = await tempFile();
  let state = createState(kit);
  state = setAnswer(state, kit, 'product.name', { state: 'answered', value: 'Test project' });
  state = setAnswer(state, kit, 'product.summary', { state: 'deferred', owner: 'Me', revisit_when: 'Before planning' });
  state = setAnswer(state, kit, 'product.audience', { state: 'not_applicable', reason: 'Personal project' });
  await saveState(path, state);
  const restored = await loadState(path);
  expect(restored).toEqual(state);
  expect(JSON.parse(await readFile(path, 'utf8')).bank_version).toBe('1.0.0');
  const session = resume(restored, kit);
  expect(session.environment).toEqual({ 'product.name': 'Test project' });
  expect(session.requiresGateVerification).toBe(true);
  expect(session.pending.some((question) => question.id === 'product.name')).toBe(false);
});

test('validates answer metadata, question types, select options, and state restrictions', () => {
  const state = createState(kit);
  for (const [id, answer] of [
    ['product.name', { state: 'deferred', owner: '', revisit_when: 'later' }],
    ['product.name', { state: 'not_applicable', reason: '' }],
    ['physical', { state: 'answered', value: 'false' }],
    ['product.platform', { state: 'answered', value: 'invented_option' }],
    ['hw.safe.worst_case', { state: 'not_applicable', reason: 'Skip' }],
    ['invented.id', { state: 'answered', value: 'hello' }],
    ['product.name', { state: 'skipped' }],
  ] as const) expect(() => setAnswer(state, kit, id, answer)).toThrow(StateError);
  expect(state.answers).toEqual({});
});

test('refuses secret-shaped data in values and metadata without echoing it', () => {
  const state = createState(kit);
  // Synthetic markers only: no real credentials are used by this test.
  const marker = 'sk_' + 'live_' + 'A'.repeat(28);
  for (const answer of [
    { state: 'answered', value: marker },
    { state: 'deferred', owner: marker, revisit_when: 'later' },
    { state: 'not_applicable', reason: marker },
  ]) {
    expect(() => setAnswer(state, kit, 'product.name', answer)).toThrow(StateError);
    try { setAnswer(state, kit, 'product.name', answer); } catch (error) {
      expect((error as Error).message).not.toContain(marker);
    }
  }
});

test('persists each answer and leaves the old file intact after invalid input', async () => {
  const path = await tempFile();
  const original = createState(kit);
  const saved = await answerAndSave(path, original, kit, 'physical', { state: 'answered', value: false });
  expect((await loadState(path)).answers.physical).toEqual({ state: 'answered', value: false });
  const before = await readFile(path, 'utf8');
  await expect(answerAndSave(path, saved, kit, 'physical', { state: 'answered', value: 'bad' })).rejects.toThrow(StateError);
  expect(await readFile(path, 'utf8')).toBe(before);
});

test('rejects corrupt state and forged gate claims on disk', async () => {
  const path = await tempFile();
  await writeFile(path, '{bad');
  await expect(loadState(path)).rejects.toThrow(StateError);
  const state = createState(kit);
  await writeFile(path, JSON.stringify({ ...state, gates_passed: ['before-launch'] }));
  await expect(loadState(path)).rejects.toThrow(StateError);
});

test('refuses to overwrite unrelated existing files', async () => {
  const path = await tempFile();
  await writeFile(path, 'Unrelated user notes');
  await expect(saveState(path, createState(kit))).rejects.toThrow(StateError);
  expect(await readFile(path, 'utf8')).toBe('Unrelated user notes');
});

test('reports new questions, changed options, and changed packs without losing saved answers', () => {
  const oldKit = structuredClone(kit);
  let state = createState(oldKit);
  state = setAnswer(state, oldKit, 'product.platform', { state: 'answered', value: 'web_app' });
  state = setAnswer(state, oldKit, 'product.name', { state: 'answered', value: 'Keep this' });
  const updated = structuredClone(kit);
  const bank = updated.documents.find((document) => document.path === 'question-bank/manifest.yaml');
  Object.assign(bank?.data ?? {}, { bank_version: '1.1.0' });
  const product = updated.documents.find((document) => document.path === 'question-bank/software/01-product-users-data.yaml');
  const modules = product?.data.modules as { questions: Record<string, unknown>[] }[];
  const platform = modules.flatMap((module) => module.questions).find((question) => question.id === 'product.platform');
  Object.assign(platform ?? {}, { options: ['web_app', 'new_platform'] });
  modules[0]?.questions.push({ id: 'product.new_test', type: 'text', ask: 'Test', covers: ['project:scope'] });
  const pack = updated.documents.find((document) => document.path === 'knowledge-packs/tool-versions.yaml');
  Object.assign(pack?.data ?? {}, { last_verified: '2026-11-01', affects_questions: ['product.name'] });
  const report = resume(state, updated);
  expect(report.bankChanged).toBe(true);
  expect(report.reask).toContain('product.platform');
  expect(report.newQuestions).toContain('product.new_test');
  expect(report.changedPacks).toContain('tool-versions');
  expect(report.environment['product.platform']).toBeUndefined();
  expect(state.answers['product.name']).toEqual({ state: 'answered', value: 'Keep this' });
});

test('preserves an explicit progress cursor across disk resume', async () => {
  const path = await tempFile();
  const state = createState(kit);
  state.progress = { stage: 'build', depth: 'full', current_question: 'product.name' };
  await saveState(path, state);
  const restored = await loadState(path);
  expect(restored.progress).toEqual(state.progress);
  expect(resume(restored, kit).decision.schedule.every((question) => question.stage === 'build')).toBe(true);
  expect(resume(restored, kit).requiresGateVerification).toBe(true);
});

test('failed writes do not return an unsaved answer or alter caller state', async () => {
  const path = join(await mkdtemp(join(tmpdir(), 'scaffolder-state-')), 'missing', 'state.json');
  const state = createState(kit);
  await expect(answerAndSave(path, state, kit, 'physical', { state: 'answered', value: true })).rejects.toThrow(StateError);
  expect(state.answers).toEqual({});
});

test('rejects invalid version metadata and an unknown progress cursor', async () => {
  const modified = structuredClone(kit);
  const manifest = modified.documents.find((document) => document.path === 'question-bank/manifest.yaml');
  Object.assign(manifest?.data ?? {}, { bank_version: '01.0.0' });
  expect(() => createState(modified)).toThrow(StateError);
  const path = await tempFile();
  const state = createState(kit);
  state.progress.current_question = 'invented.id';
  await expect(saveState(path, state)).rejects.toThrow(StateError);
});

test('retired answers remain readable but never enter the current engine environment', () => {
  const state = setAnswer(createState(kit), kit, 'product.name', { state: 'answered', value: 'Historical name' });
  const modified = structuredClone(kit);
  for (const document of modified.documents) {
    const modules = document.data.modules as { questions: {id: string}[] }[] | undefined;
    for (const module of modules ?? []) module.questions = module.questions.filter((question) => question.id !== 'product.name');
  }
  const session = resume(state, modified);
  expect(session.state.answers['product.name']).toEqual(state.answers['product.name']);
  expect(session.environment['product.name']).toBeUndefined();
});

test('flags changed packs even when their new affects_questions list removes the relied-on question', () => {
  const oldKit = structuredClone(kit);
  Object.assign(oldKit.documents.find((document) => document.path === 'knowledge-packs/tool-versions.yaml')?.data ?? {},
    { affects_questions: ['product.name'] });
  const state = setAnswer(createState(oldKit), oldKit, 'product.name', { state: 'answered', value: 'My project' });
  const updated = structuredClone(kit);
  Object.assign(updated.documents.find((document) => document.path === 'knowledge-packs/tool-versions.yaml')?.data ?? {},
    { affects_questions: [] });
  expect(resume(state, updated).changedPacks).toContain('tool-versions');
});
