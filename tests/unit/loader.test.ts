import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { DataError, loadKit, loadYamlFile, parseYaml } from '../../src/data/loader.js';
import { identifiers, parse } from '../../src/expressions/index.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const trees = ['question-bank', 'failure-modes', 'rules', 'beginner-course', 'knowledge-packs', 'outputs'];

test('loads every authoritative YAML file exactly once using portable sorted paths', async () => {
  const kit = await loadKit(root);
  const expected = globSync(trees.map((tree) => `${tree}/**/*.{yaml,yml}`), { cwd: root })
    .map((path) => path.replaceAll('\\', '/')).sort();
  expect(kit.documents.map((document) => document.path)).toEqual(expected);
  expect(new Set(kit.documents.map((document) => document.path)).size).toBe(expected.length);
  for (const document of kit.documents) {
    expect(document.data).toEqual(parseYaml(readFileSync(new URL(document.path,
      new URL('../../', import.meta.url)), 'utf8'), document.path));
  }
});

test('keeps YAML scalar types and reads supplied content rather than cached answers', () => {
  const first = parseYaml('enabled: false\ncount: 3\nverified: 2026-10-31\nitems: [one, two]', 'sample.yaml');
  expect(first).toEqual({ enabled: false, count: 3, verified: '2026-10-31', items: ['one', 'two'] });
  expect(parseYaml('enabled: true', 'sample.yaml').enabled).toBe(true);
});

test.each([
  'a: [unterminated',
  'a: 1\na: 2',
  'value: !unrecognized content',
  '---\na: 1\n---\nb: 2',
  '',
  'null',
  '- item',
  'text',
])('rejects malformed, ambiguous, or non-mapping documents without echoing input', (source) => {
  expect(() => parseYaml(source, 'bad.yaml')).toThrow(DataError);
  try { parseYaml(source, 'bad.yaml'); } catch (error) {
    expect((error as Error).message).toBe('Invalid YAML document: bad.yaml');
  }
});

test('rejects excessive alias expansion using the parser limit', () => {
  const source = `anchor: &anchor [value]\nexpanded: [${Array(101).fill('*anchor').join(', ')}]`;
  expect(() => parseYaml(source, 'aliases.yaml')).toThrow(DataError);
});

test.each(['../AGENTS.md', '/outside.yaml', 'C:\\outside.yaml', '..\\outside.yaml', ''])(
  'rejects paths outside the requested root: %s', async (path) => {
    await expect(loadYamlFile(root, path)).rejects.toThrow(DataError);
  });

test('fails explicitly on a missing file or a root without the required data directories', async () => {
  await expect(loadYamlFile(root, 'question-bank/absent.yaml')).rejects.toThrow(DataError);
  await expect(loadKit(fileURLToPath(new URL('.', import.meta.url)))).rejects.toThrow(DataError);
});

test('parses all real expressions and validates their identifiers against loaded questions and flags', async () => {
  const kit = await loadKit(root);
  const known = new Set<string>();
  const expressions: { path: string; source: string }[] = [];
  const expressionFields = new Set(['when', 'load_when', 'required_when', 'ask_when', 'applies_when']);
  function visit(value: unknown, path: string): void {
    if (Array.isArray(value)) {
      for (const item of value) visit(item, path);
    } else if (value !== null && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      for (const [key, item] of Object.entries(record)) {
        if ((key === 'questions' || key === 'flags') && Array.isArray(item)) {
          for (const question of item as Record<string, unknown>[]) {
            if (typeof question.id === 'string') known.add(question.id);
          }
        }
        if (expressionFields.has(key) && typeof item === 'string') expressions.push({ path, source: item });
        visit(item, path);
      }
    }
  }
  for (const document of kit.documents) visit(document.data, document.path);
  expect(known.size).toBeGreaterThan(0);
  expect(expressions.length).toBeGreaterThan(0);
  for (const expression of expressions) {
    for (const identifier of identifiers(parse(expression.source))) {
      expect(known.has(identifier), `${expression.path}: unknown identifier ${identifier}`).toBe(true);
    }
  }
});
