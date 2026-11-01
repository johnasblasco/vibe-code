import { fileURLToPath } from 'node:url';
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test } from 'vitest';
import { loadKit, parseYaml } from '../../src/data/loader.js';
import { createState, setAnswer } from '../../src/state/index.js';
import type { State } from '../../src/state/index.js';
import { prepareGeneration, MissingAnswers } from '../../src/outputs/generate.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const kit = await loadKit(root);
const options = { offline: true, now: '2026-11-01' };
function complete(): State {
  let state = createState(kit);
  const bindings = kit.documents.find((document) => document.path === 'outputs/bindings.yaml')!.data;
  for (const binding of Object.values(bindings.placeholders as Record<string, Record<string, unknown>>)) {
    if (binding.from !== 'question') continue;
    const id = String(binding.id);
    const definition = state.questions[id]!;
    const value = id === 'data.engine' ? 'postgres' : id === 'data.cache' ? 'redis' :
      definition.type === 'boolean' ? true : definition.type === 'number' ? 1 :
        definition.type === 'single_select' ? definition.options![0] :
          definition.type === 'multi_select' || definition.type === 'rank_priorities' ? [] : 'Recorded project decision';
    state = setAnswer(state, kit, id, { state: 'answered', value });
  }
  return state;
}

test('every shipped template and generated skill is declared in YAML, including dotfiles', () => {
  const manifest = kit.documents.find((document) => document.path === 'outputs/files.yaml')!.data;
  const sources = (manifest.files as Record<string, string>[]).map((item) => item.source);
  const expected = ['templates', 'skills/project-templates'].flatMap((directory) =>
    readdirSync(join(root, directory), { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile())
      .map((entry) => relative(root, join(entry.parentPath, entry.name)).replaceAll('\\', '/')));
  expect(expected).toContain('templates/project/.env.example.tmpl');
  expect(expected).toContain('templates/project/.github/workflows/ci.yml.tmpl');
  expect(new Set(sources)).toEqual(new Set(expected));
});

test('missing values are returned as question IDs rather than guesses or partial files', async () => {
  const state = createState(kit);
  try { await prepareGeneration(root, kit, state, { ...options, ids: ['agents'] }); throw new Error('Expected missing input'); }
  catch (error) {
    expect(error).toBeInstanceOf(MissingAnswers);
    expect((error as MissingAnswers).ids).toContain('product.name');
  }
  const deferred = setAnswer(complete(), kit, 'product.name', { state: 'deferred', owner: 'Builder', revisit_when: 'Before generation' });
  await expect(prepareGeneration(root, kit, deferred, { ...options, ids: ['agents'] })).rejects.toThrow(MissingAnswers);
});

test('renders source content with pinned actions/runtime and intact GitHub expressions', async () => {
  const plan = await prepareGeneration(root, kit, complete(), { ...options, ids: ['agents', 'ci', 'precommit', 'risk-register'] });
  expect(plan.files.every((file) => !/(?<!\$)\{\{/.test(file.content))).toBe(true);
  const ci = plan.files.find((file) => file.id === 'ci')!.content;
  expect(ci).toContain('${{ github.ref }}');
  for (const match of ci.matchAll(/uses:\s*(\S+)/g)) expect(match[1]).toMatch(/@[a-f0-9]{40}$/);
  expect(String((parseYaml(ci, 'generated CI').jobs as Record<string, Record<string, unknown>>).check!.steps)).toBeTruthy();
  expect(ci).toContain('26.13.0');
  expect(plan.files.find((file) => file.id === 'precommit')!.content).toMatch(/rev: [a-f0-9]{40}/);
  expect(plan.files.some((file) => file.id === 'generation-record')).toBe(true);
  expect(plan.pins.every((pin) => pin.mode === 'pack')).toBe(true);
});

test('renders frontmatter as YAML and prevents project text from injecting HTML or template syntax', async () => {
  const state = setAnswer(complete(), kit, 'product.name', { state: 'answered', value: 'Name: <script> | data' });
  const plan = await prepareGeneration(root, kit, state, { ...options, ids: ['deploy-skill', 'env-example'] });
  const skill = plan.files.find((file) => file.id === 'deploy-skill')!.content;
  const frontmatter = /^---\n([\s\S]*?)\n---/.exec(skill)![1]!;
  expect(parseYaml(frontmatter, 'frontmatter').description).toContain('Name: <script> | data');
  expect(skill.split('\n---\n')[1]).not.toContain('<script>');
  const env = plan.files.find((file) => file.id === 'env-example')!.content;
  expect(env).toContain('POSTGRES_USER=name-script-data');
  expect(env).not.toContain('Name: <script>');
});

test('security contact must be supplied and validated; no contact is invented', async () => {
  await expect(prepareGeneration(root, kit, complete(), { ...options, ids: ['security'] })).rejects.toThrow(MissingAnswers);
  for (const contact of ['', 'https://user:password@example.invalid', 'not-a-contact']) {
    await expect(prepareGeneration(root, kit, complete(), { ...options, ids: ['security'], contact })).rejects.toThrow();
  }
  const plan = await prepareGeneration(root, kit, complete(), { ...options, ids: ['security'], contact: 'https://example.invalid/security' });
  expect(plan.files.find((file) => file.id === 'security')!.content).toContain('https://example.invalid/security');
});

test('local PostgreSQL output uses the verified volume layout and command argument arrays', async () => {
  const plan = await prepareGeneration(root, kit, complete(), { ...options, ids: ['compose'] });
  const content = plan.files.find((file) => file.id === 'compose')!.content;
  const db = (parseYaml(content, 'compose').services as Record<string, Record<string, unknown>>).db!;
  expect(db.image).toBe('postgres:18.6');
  expect(db.volumes).toEqual(['./docker-data/postgres:/var/lib/postgresql']);
  expect((db.healthcheck as Record<string, unknown>).test).toEqual(['CMD', 'pg_isready', '-U', '${POSTGRES_USER}', '-d', '${POSTGRES_DB}']);
  expect(db.ports).toEqual(['127.0.0.1:5432:5432']);
});

test('renders the complete applicable software/hardware set, with an optional Redis file', async () => {
  let state = setAnswer(complete(), kit, 'physical', { state: 'answered', value: true });
  state = setAnswer(state, kit, 'data.cache', { state: 'answered', value: 'redis' });
  const plan = await prepareGeneration(root, kit, state, { ...options, contact: 'https://example.invalid/security' });
  expect(plan.files.map((file) => file.id)).toContain('hardware-skill');
  expect(plan.files.map((file) => file.id)).toContain('hardware-readme');
  expect(plan.files.map((file) => file.id)).toContain('cache-compose');
  expect(plan.files).toHaveLength(18);
  const cache = plan.files.find((file) => file.id === 'cache-compose')!.content;
  expect(cache).toContain('redis:8.10.3'); expect(cache).toContain('127.0.0.1:6379:6379');
  expect(plan.files.every((file) => !/(?<!\$)\{\{/.test(file.content))).toBe(true);
});

test('rejects unknown bindings, traversal destinations, unknown outputs and inapplicable hardware', async () => {
  const cloned = structuredClone(kit);
  const bindings = cloned.documents.find((document) => document.path === 'outputs/bindings.yaml')!.data;
  delete (bindings.placeholders as Record<string, unknown>).project_name;
  await expect(prepareGeneration(root, cloned, complete(), { ...options, ids: ['agents'] })).rejects.toThrow();
  const manifest = cloned.documents.find((document) => document.path === 'outputs/files.yaml')!.data;
  (manifest.files as Record<string, unknown>[]).find((file) => file.id === 'gitignore')!.path = '../outside';
  await expect(prepareGeneration(root, cloned, complete(), { ...options, ids: ['gitignore'] })).rejects.toThrow();
  await expect(prepareGeneration(root, kit, complete(), { ...options, ids: ['unknown'] })).rejects.toThrow();
  await expect(prepareGeneration(root, kit, complete(), { ...options, ids: ['hardware-readme'] })).rejects.toThrow();
});
