import { expect, test } from 'vitest';

test('intentional failure used to verify the runner exit status', () => {
  expect(true).toBe(false);
});
