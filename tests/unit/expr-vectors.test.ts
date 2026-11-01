import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { loadYamlFile } from '../../src/data/loader.js';
import { check, ExprError, parse } from '../../src/expressions/index.js';
import type { Environment } from '../../src/expressions/index.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const document = await loadYamlFile(root, 'tests/expr-vectors.yaml');
const vectors = document.data as {
  schema: string;
  cases: { expr: string; env: Environment; expect: boolean }[];
  errors: string[];
};

test('loads the shared conformance file without changing its schema', () => {
  expect(vectors.schema).toBe('expr-vectors/v1');
});
test.each(vectors.cases)('shared vector: $expr with $env', (vector) => {
  expect(check(vector.expr, vector.env)).toBe(vector.expect);
});
test.each(vectors.errors)('shared parse rejection: %s', (source) => {
  expect(() => parse(source)).toThrow(ExprError);
});
