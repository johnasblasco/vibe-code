import { lstat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { expect, test, vi } from 'vitest';
import { DataError, loadKit, loadYamlFile } from '../../src/data/loader.js';

vi.mock('node:fs/promises', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:fs/promises')>();
  return { ...original, lstat: vi.fn(original.lstat) };
});

const root = fileURLToPath(new URL('../../', import.meta.url));

test('refuses symlink components before reading a file', async () => {
  vi.mocked(lstat).mockResolvedValueOnce({
    isSymbolicLink: () => true,
  } as Awaited<ReturnType<typeof lstat>>);
  await expect(loadYamlFile(root, 'question-bank/00-router.yaml')).rejects.toThrow(DataError);
});

test('refuses symlink data directories before discovering their files', async () => {
  vi.mocked(lstat).mockResolvedValueOnce({
    isSymbolicLink: () => true,
  } as Awaited<ReturnType<typeof lstat>>);
  await expect(loadKit(root)).rejects.toThrow('Symlink');
});
