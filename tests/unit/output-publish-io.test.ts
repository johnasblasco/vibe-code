import { link, mkdtemp, open, readFile, readdir, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, expect, test, vi } from 'vitest';
import { publishPlan, PublishError } from '../../src/outputs/publish.js';

vi.mock('node:fs/promises', async (original) => {
  const actual = await original<typeof import('node:fs/promises')>();
  return { ...actual, link: vi.fn(actual.link), open: vi.fn(actual.open), unlink: vi.fn(actual.unlink) };
});
beforeEach(() => { vi.clearAllMocks(); });
const files = [{ id: 'first', path: 'first.md', content: 'First complete file\n' },
  { id: 'second', path: 'second.md', content: 'Second complete file\n' }];

test('an exclusive-open failure never deletes a path the operation did not create', async () => {
  const root = await mkdtemp(join(tmpdir(), 'scaffolder-publish-open-'));
  vi.mocked(open).mockRejectedValueOnce(new Error('Synthetic open failure'));
  await expect(publishPlan(root, files)).rejects.toBeInstanceOf(PublishError);
  expect(unlink).not.toHaveBeenCalled();
  expect(await readdir(root)).toEqual([]);
});

test('reports a partially published batch without removing or overwriting the completed file', async () => {
  const root = await mkdtemp(join(tmpdir(), 'scaffolder-publish-partial-'));
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  vi.mocked(link).mockImplementationOnce(actual.link).mockRejectedValueOnce(new Error('Synthetic publish failure'));
  try { await publishPlan(root, files); throw new Error('Expected publication failure'); }
  catch (error) {
    expect(error).toBeInstanceOf(PublishError);
    expect((error as PublishError).written).toEqual(['first.md']);
  }
  expect(await readFile(join(root, 'first.md'), 'utf8')).toBe(files[0]!.content);
  expect(await readdir(root)).toEqual(['first.md']);
});
