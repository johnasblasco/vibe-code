import { createHash } from 'node:crypto';
import { lstat, open, readdir, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { parseDocument } from 'yaml';

// Installed layout and bootstrap resource guards, not domain facts or teaching content.
export const assetRoots = ['question-bank', 'failure-modes', 'rules', 'beginner-course', 'knowledge-packs',
  'outputs', 'templates', 'skills/project-templates'] as const;
export const inventoryPath = 'integrity/assets.json';
export interface Inventory { schema: 'asset-integrity/v1'; algorithm: 'sha256-text-lf'; files: Record<string, string> }
export class IntegrityError extends Error { override name = 'IntegrityError'; }
function fail(): never { throw new IntegrityError('Kit integrity check failed'); }
export function assetPath(value: string): string[] {
  const parts = value.split('/');
  if (!parts.length || parts.some((part) => !/^[A-Za-z0-9._-]+$/.test(part) || part === '.' || part === '..' || part.endsWith('.'))) fail();
  return parts;
}
async function unlinked(root: string, path: string) {
  let current = root;
  for (const part of assetPath(path)) {
    current = join(current, part);
    if ((await lstat(current)).isSymbolicLink()) fail();
  }
  return current;
}
export async function readAsset(root: string, path: string, maximum = 2_000_000): Promise<string> {
  const file = await open(await unlinked(root, path), 'r');
  try {
    const info = await file.stat();
    if (!info.isFile() || info.size > maximum) fail();
    const chunks: Buffer[] = []; let size = 0;
    while (true) {
      const buffer = Buffer.alloc(Math.min(65536, maximum + 1 - size));
      const { bytesRead } = await file.read(buffer);
      if (!bytesRead) break;
      size += bytesRead; if (size > maximum) fail();
      chunks.push(buffer.subarray(0, bytesRead));
    }
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(Buffer.concat(chunks)).replaceAll('\r\n', '\n');
  } finally { await file.close(); }
}
export function digest(text: string): string { return createHash('sha256').update(text, 'utf8').digest('hex'); }
export async function readInventory(root: string): Promise<Inventory> {
  const source = await readAsset(root, inventoryPath, 512_000);
  const parsed = parseDocument(source, { uniqueKeys: true, strict: true, schema: 'core' });
  if (parsed.errors.length || parsed.warnings.length) fail();
  const value = parsed.toJS({ maxAliasCount: 0 }) as Partial<Inventory>;
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join() !== 'algorithm,files,schema' ||
      value.schema !== 'asset-integrity/v1' || value.algorithm !== 'sha256-text-lf' || !value.files ||
      typeof value.files !== 'object' || Array.isArray(value.files)) fail();
  const entries = Object.entries(value.files);
  if (!entries.length || entries.length > 5000) fail();
  for (const [path, hash] of entries) {
    assetPath(path);
    if (!assetRoots.some((root) => path.startsWith(`${root}/`)) || typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash)) fail();
  }
  if (new Set(entries.map(([path]) => path.toLowerCase())).size !== entries.length) fail();
  return value as Inventory;
}
export async function collectAssets(root: string): Promise<ReadonlyMap<string, string>> {
  const base = await realpath(root); const paths: string[] = []; let directories = 0;
  async function visit(path: string, depth: number): Promise<number> {
    if (depth > 32 || ++directories > 5000) fail();
    const directory = await unlinked(base, path);
    const counts = await Promise.all((await readdir(directory, { withFileTypes: true })).map(async (entry) => {
      const child = `${path}/${entry.name}`; assetPath(child);
      if (entry.isSymbolicLink()) fail();
      if (entry.isDirectory()) return visit(child, depth + 1);
      else if (entry.isFile()) {
        paths.push(child); if (paths.length > 5000) fail(); return 1;
      } else fail();
    }));
    return counts.reduce((sum, count) => sum + count, 0);
  }
  await Promise.all(assetRoots.map(async (path) => { if (!await visit(path, 0)) fail(); }));
  paths.sort(); if (new Set(paths.map((path) => path.toLowerCase())).size !== paths.length) fail();
  const contents = new Map<string, string>(); let total = 0;
  for (let start = 0; start < paths.length; start += 8) {
    const batch = paths.slice(start, start + 8);
    const texts = await Promise.all(batch.map((path) => readAsset(base, path)));
    for (let index = 0; index < batch.length; index++) {
      const text = texts[index]!; total += Buffer.byteLength(text);
      if (total > 16_000_000) fail();
      contents.set(batch[index]!, text);
    }
  }
  return contents;
}
export function makeInventory(assets: ReadonlyMap<string, string>): Inventory {
  return { schema: 'asset-integrity/v1', algorithm: 'sha256-text-lf',
    files: Object.fromEntries([...assets].map(([path, content]) => [path, digest(content)])) };
}
