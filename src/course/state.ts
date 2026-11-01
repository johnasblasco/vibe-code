import { randomUUID } from 'node:crypto';
import { lstat, mkdir, open, readFile, realpath, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { noSecrets } from '../state/index.js';
import type { ManualRecord } from '../doctor/index.js';
import type { Deferral } from '../gates/index.js';

export interface CourseState {
  schema: 'course-state/v1'; current_stage: string; manual_records: ManualRecord[];
  history: { from: string; to: string; recorded_on: string; deferrals: Record<string, Deferral> }[];
}
export class CourseError extends Error { override name = 'CourseError'; }
const stages = ['stage-0', 'stage-1', 'stage-2', 'stage-3'];
export function createCourse(): CourseState { return { schema: 'course-state/v1', current_stage: 'stage-0', manual_records: [], history: [] }; }
function row(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new CourseError('Invalid course record');
  return value as Record<string, unknown>;
}
function exact(value: Record<string, unknown>, keys: string[]): void {
  if (Object.keys(value).length !== keys.length || !keys.every((key) => Object.hasOwn(value, key))) throw new CourseError('Invalid course record');
}
function nonempty(value: unknown): value is string { return typeof value === 'string' && Boolean(value.trim()); }
function timestamp(value: unknown): boolean { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)); }
export function validatedCourse(input: unknown): CourseState {
  const value = row(input); exact(value, ['schema', 'current_stage', 'manual_records', 'history']);
  if (value.schema !== 'course-state/v1' || !stages.includes(String(value.current_stage)) || !Array.isArray(value.manual_records) || !Array.isArray(value.history)) throw new CourseError('Invalid course state');
  for (const input of value.manual_records) {
    const record = row(input); exact(record, ['check_id', 'description', 'confirmed', 'recorded_on']);
    if (!nonempty(record.check_id) || !nonempty(record.description) || typeof record.confirmed !== 'boolean' || !timestamp(record.recorded_on)) throw new CourseError('Invalid manual record');
  }
  for (const input of value.history) {
    const record = row(input); exact(record, ['from', 'to', 'recorded_on', 'deferrals']);
    if (!stages.includes(String(record.from)) || !stages.includes(String(record.to)) || !timestamp(record.recorded_on)) throw new CourseError('Invalid course history');
    for (const input of Object.values(row(record.deferrals))) {
      const item = row(input); exact(item, ['owner', 'reason', 'revisit_when']);
      if (!Object.values(item).every(nonempty)) throw new CourseError('Invalid recorded deferral');
    }
  }
  noSecrets(value);
  return structuredClone(value) as unknown as CourseState;
}
async function paths(project: string, create: boolean): Promise<{ directory: string; target: string }> {
  if ((await lstat(project)).isSymbolicLink()) throw new CourseError('Linked project paths are not supported');
  const base = await realpath(project); const directory = join(base, '.scaffolder');
  try {
    const info = await lstat(directory);
    if (info.isSymbolicLink() || !info.isDirectory()) throw new CourseError('Invalid course directory');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    if (create) await mkdir(directory);
  }
  const target = join(directory, 'course.json');
  try { if ((await lstat(target)).isSymbolicLink()) throw new CourseError('Linked course files are not supported'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  return { directory, target };
}
export async function loadCourse(project: string): Promise<CourseState> {
  try {
    const { target } = await paths(project, false);
    try { return validatedCourse(JSON.parse(await readFile(target, 'utf8'))); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return createCourse(); throw error; }
  } catch { throw new CourseError('Unable to load course state'); }
}
export async function saveCourse(project: string, state: CourseState): Promise<void> {
  const safe = validatedCourse(state); let temporary: string | undefined;
  try {
    const { directory, target } = await paths(project, true);
    try { validatedCourse(JSON.parse(await readFile(target, 'utf8'))); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    const candidate = join(directory, `.course-${randomUUID()}.tmp`);
    const handle = await open(candidate, 'wx', 0o600); temporary = candidate;
    try { await handle.writeFile(JSON.stringify(safe, null, 2) + '\n', 'utf8'); await handle.sync(); }
    finally { await handle.close(); }
    await paths(project, false); await rename(temporary, target); temporary = undefined;
  } catch { throw new CourseError('Unable to save course state'); }
  finally { if (temporary) await unlink(temporary).catch(() => undefined); }
}
