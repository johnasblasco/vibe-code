import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, vi } from 'vitest';
import { loadKit } from '../../src/data/loader.js';
import { createState } from '../../src/state/index.js';
import { createCourse, loadCourse, saveCourse } from '../../src/course/state.js';
import { guideCourse } from '../../src/course/index.js';
import type { ProcessRequest } from '../../src/doctor/process.js';
import { evaluateGate } from '../../src/gates/index.js';

const root = fileURLToPath(new URL('../../', import.meta.url)); const kit = await loadKit(root);
const tools = vi.fn(async (request: ProcessRequest) => ({ code: 0, stderr: '', stdout:
  ({ node_version: 'v26.13.0', git_version: 'git version 2.50.1', docker_version: 'Docker version 28.0.0',
    docker_context: '"unix:///var/run/docker.sock"', docker_info: '28.0.0' } as Record<string, string>)[request.id] ?? '' }));

test('stage 0 shows current YAML cards without executing their do/undo commands', async () => {
  const calls = tools.mock.calls.length;
  const result = await guideCourse(kit, createState(kit), createCourse(), { project: root, process: tools });
  expect(result.cards.map((card) => card.id)).toEqual(['env.install_tools', 'env.accounts_2fa']);
  expect(tools.mock.calls.length).toBe(calls);
  expect(result.nextStage).toBeNull();
});

test('advances only after current checks and persists a resumable cursor, not pass claims', async () => {
  const result = await guideCourse(kit, createState(kit), createCourse(), { project: root, process: tools, advance: true });
  expect(result.nextStage).toBe('stage-1');
  const project = await mkdtemp(join(tmpdir(), 'scaffolder-course-'));
  const state = { ...createCourse(), current_stage: result.nextStage! };
  await saveCourse(project, state);
  expect((await loadCourse(project)).current_stage).toBe('stage-1');
  expect(await readFile(join(project, '.scaffolder/course.json'), 'utf8')).not.toContain('passed');
});

test('editing the cursor to a later stage cannot skip entry verification', async () => {
  const process = vi.fn(async () => ({ code: 127, stdout: '', stderr: 'synthetic-private-diagnostic' }));
  const edited = { ...createCourse(), current_stage: 'stage-2' };
  const result = await guideCourse(kit, createState(kit), edited, { project: root, process, advance: true });
  expect(result.cards).toEqual([]); expect(result.verification?.gate.allowed).toBe(false);
  expect(result.nextStage).toBeNull();
  expect(JSON.stringify(result)).not.toContain('synthetic-private-diagnostic');
});

test('unknown pass fields or malformed existing course files are never accepted or overwritten', async () => {
  const project = await mkdtemp(join(tmpdir(), 'scaffolder-course-claims-'));
  await saveCourse(project, createCourse());
  await writeFile(join(project, '.scaffolder/course.json'), JSON.stringify({ ...createCourse(), passed: true }));
  await expect(loadCourse(project)).rejects.toThrow();
  await expect(saveCourse(project, createCourse())).rejects.toThrow();
  expect(JSON.parse(await readFile(join(project, '.scaffolder/course.json'), 'utf8')).passed).toBe(true);
});

test('an explicit exit-boundary deferral file also satisfies the subset of earlier entry checks', async () => {
  const state = createState(kit);
  const exit = await evaluateGate(kit, state, 'stage-2');
  const deferrals = Object.fromEntries(exit.checks.map((check) => [check.id,
    { owner: 'Builder', reason: 'Waiting for local setup', revisit_when: 'Before development' }]));
  const result = await guideCourse(kit, state, { ...createCourse(), current_stage: 'stage-1' },
    { project: root, advance: true, deferrals, process: tools });
  expect(result.nextStage).toBe('stage-2');
});
