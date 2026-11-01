import { expect, test } from 'vitest';
import * as skeleton from '../../src/index.js';

test('the ESM skeleton loads without exposing application features', () => {
  expect(Object.keys(skeleton)).toEqual([]);
});
