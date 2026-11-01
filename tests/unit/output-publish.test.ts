import { mkdtemp, mkdir, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { publishPlan } from '../../src/outputs/publish.js';

const files = [{ id: 'first', path: 'AGENTS.md', content: 'A complete instruction file\n' },
  { id: 'nested', path: '.github/workflows/ci.yml', content: 'name: sample\n' }];
const project = () => mkdtemp(join(tmpdir(), 'scaffolder-output-'));

test('preview validates every destination without creating directories; publish writes complete files', async () => {
  const root = await project();
  await publishPlan(root, files, { dryRun: true });
  expect(await readdir(root)).toEqual([]);
  expect((await publishPlan(root, files)).written).toEqual(files.map((file) => file.path));
  for (const file of files) expect(await readFile(join(root, file.path), 'utf8')).toBe(file.content);
});

test('an existing later destination rejects the whole preflight without writing an earlier file', async () => {
  const root = await project();
  await mkdir(join(root, '.github/workflows'), { recursive: true });
  await writeFile(join(root, files[1]!.path), 'Existing workflow');
  await expect(publishPlan(root, files)).rejects.toThrow();
  await expect(readFile(join(root, 'AGENTS.md'))).rejects.toThrow();
  expect(await readFile(join(root, files[1]!.path), 'utf8')).toBe('Existing workflow');
});

test('rejects traversal, absolute paths, Git internals, Windows device names, and colliding paths', async () => {
  const root = await project();
  for (const path of ['../outside', '/absolute', 'C:/absolute', '.git/config', 'folder/../outside', 'CON.txt', 'a:stream', 'ends.']) {
    await expect(publishPlan(root, [{ id: 'bad', path, content: 'x' }])).rejects.toThrow();
  }
  await expect(publishPlan(root, [{ id: 'a', path: 'A.md', content: 'x' }, { id: 'b', path: 'a.md', content: 'x' }])).rejects.toThrow();
  await expect(publishPlan(root, [{ id: 'a', path: 'docs', content: 'x' }, { id: 'b', path: 'docs/a', content: 'x' }])).rejects.toThrow();
  expect(await readdir(root)).toEqual([]);
});

test('linked destination components cannot redirect generated files', async () => {
  const root = await project(); const elsewhere = await project();
  await symlink(elsewhere, join(root, '.github'), process.platform === 'win32' ? 'junction' : 'dir');
  await expect(publishPlan(root, files)).rejects.toThrow();
  expect(await readdir(elsewhere)).toEqual([]);
  await expect(readFile(join(root, 'AGENTS.md'))).rejects.toThrow();
});

test('refuses unresolved content while preserving GitHub expressions and competing publication', async () => {
  const root = await project();
  await expect(publishPlan(root, [{ id: 'bad', path: 'bad.md', content: '{{leftover}}' }])).rejects.toThrow();
  const contenders = await Promise.allSettled([publishPlan(root, [files[0]!]), publishPlan(root, [files[0]!])]);
  expect(contenders.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(await readFile(join(root, 'AGENTS.md'), 'utf8')).toBe(files[0]!.content);
  expect(await readdir(root)).toEqual(['AGENTS.md']);
  await publishPlan(root, [{ id: 'expression', path: 'expression.yml', content: 'value: ${{ github.ref }}\n' }]);
});
