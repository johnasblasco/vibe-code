import { expect, test } from 'vitest';
import { check, evaluate, ExprError, identifiers, parse } from '../../src/expressions/index.js';

test('extracts the same identifiers as the Python test without treating strings as identifiers', () => {
  expect(identifiers(parse("a and b.c == 'x' or d in ['y']"))).toEqual(new Set(['a', 'b.c', 'd']));
});

test.each([
  ['1 < 2 and 3 <= 3 and 4 > 2 and 4 >= 4', true],
  ["'cat' contains 'at'", true],
  ['[1, [2]] == [1, [2]]', true],
  ['[1, 2] != [1, 3]', true],
  ['true == 1 and false == 0', true],
  ['not not true or false and false', true],
  ["not 'false'", true],
  ["'0' and 0", false],
  ['1.5 > 1', true],
  ['false and missing', false],
  ['true or missing', true],
  ['not (false or true) and true', false],
])('supports reference evaluation semantics: %s', (source, expected) => {
  expect(check(source, {})).toBe(expected);
});

test('returns raw values from evaluate and treats an empty answered list as false', () => {
  expect(evaluate(parse('item'), { item: [] })).toEqual([]);
  expect(check('item', { item: [] })).toBe(false);
  expect(check('item', { item: Number.NaN })).toBe(true);
});

test('unanswered operands cannot trigger a comparison, including membership', () => {
  expect(check("'text' contains missing", {})).toBe(false);
  expect(check('a < b', { a: 'one', b: 2 })).toBe(false);
});

test('does not resolve inherited keys or traverse a dotted identifier', () => {
  expect(check('constructor', {})).toBe(false);
  expect(check('toString', {})).toBe(false);
  expect(check('a.b', {})).toBe(false);
});

test.each(['[]', '-1', '1e2', 'true == false == true', 'a.b()', 'a; process.exit()', 'a + 1'])(
  'rejects syntax outside the reference grammar: %s', (source) => {
    expect(() => parse(source)).toThrow(ExprError);
  });

test('preserves Python list ordering and Unicode code point ordering', () => {
  expect(check('[1, 2] < [1, 3]', {})).toBe(true);
  expect(check('[1] <= [1, 0]', {})).toBe(true);
  expect(check("'😀' > '\uE000'", {})).toBe(true);
});

test('accepts trailing whitespace and exposes every identifier in nested lists', () => {
  expect(check(' true \n ', {})).toBe(true);
  expect(identifiers(parse('[a, [b.c], not_valid]'))).toEqual(new Set(['a', 'b.c', 'not_valid']));
});
