import { lstat, rename, open, unlink, mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, vi } from 'vitest';
import { loadKit } from '../../src/data/loader.js';
import { createState, loadState, saveState } from '../../src/state/index.js';

vi.mock('node:fs/promises', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:fs/promises')>();
  return { ...original, lstat: vi.fn(original.lstat), rename: vi.fn(original.rename),
    open: vi.fn(original.open), unlink: vi.fn(original.unlink) };
});

test('does not delete a temporary path when exclusive creation fails', async () => {
  vi.mocked(open).mockRejectedValueOnce(new Error('Synthetic open failure'));
  await expect(saveState(join(root, 'state.json'), createState(kit))).rejects.toThrow();
  expect(unlink).not.toHaveBeenCalled();
});

test('rename failure retains the previous complete file and cleans only its own temporary file', async () => {
  const path = join(await mkdtemp(join(tmpdir(), 'scaffolder-state-atomic-')), 'state.json');
  const state = createState(kit);
  await saveState(path, state);
  const before = await readFile(path, 'utf8');
  vi.mocked(rename).mockRejectedValueOnce(new Error('Synthetic rename failure'));
  await expect(saveState(path, state)).rejects.toThrow();
  expect(await readFile(path, 'utf8')).toBe(before);
  expect(unlink).toHaveBeenCalledTimes(1);
});
const root = fileURLToPath(new URL('../../', import.meta.url));
const kit = await loadKit(root);

test('rejects a symlink state path before reading or writing', async () => {
  const link = { isSymbolicLink: () => true } as Awaited<ReturnType<typeof lstat>>;
  vi.mocked(lstat).mockResolvedValueOnce(link);
  await expect(saveState(`${root}/state.json`, createState(kit))).rejects.toThrow();
  vi.mocked(lstat).mockResolvedValueOnce(link);
  await expect(loadState(`${root}/state.json`)).rejects.toThrow();
  expect(rename).not.toHaveBeenCalled();
});
