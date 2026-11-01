import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep, win32 } from 'node:path';
import { parseDocument } from 'yaml';
import type { LoadedDocument, LoadedKit } from './types.js';

// Directory names define the kit layout; questions, rules, facts, and schemas stay in YAML.
const sourceDirectories = [
  'question-bank', 'failure-modes', 'rules', 'beginner-course', 'knowledge-packs', 'outputs',
] as const;

export class DataError extends Error {
  override name = 'DataError';
}

export function parseYaml(source: string, path: string): Readonly<Record<string, unknown>> {
  try {
    const document = parseDocument(source, {
      version: '1.2', schema: 'core', uniqueKeys: true, strict: true,
    });
    if (document.errors.length > 0 || document.warnings.length > 0) throw new DataError('Invalid document');
    // Keep the parser's documented expansion limit, rather than disabling alias checks.
    const value: unknown = document.toJS({ maxAliasCount: 100 });
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      throw new DataError('Expected a mapping');
    }
    return value as Record<string, unknown>;
  } catch {
    // YAML parser messages may contain input excerpts; do not include them in diagnostics.
    throw new DataError(`Invalid YAML document: ${path}`);
  }
}

function portable(path: string): string { return path.split(sep).join('/'); }

async function containedPath(root: string, path: string): Promise<string> {
  const parts = path.replaceAll('\\', '/').split('/');
  if (isAbsolute(path) || win32.isAbsolute(path) ||
      parts.some((part) => part === '..' || part === '.' || part.length === 0)) {
    throw new DataError('Expected a contained relative data path');
  }
  const canonicalRoot = await realpath(root);
  const target = resolve(canonicalRoot, ...parts);
  const fromRoot = relative(canonicalRoot, target);
  if (!fromRoot || isAbsolute(fromRoot) || fromRoot === '..' || fromRoot.startsWith(`..${sep}`)) {
    throw new DataError('Expected a contained relative data path');
  }
  let current = canonicalRoot;
  for (const part of parts) {
    current = resolve(current, part);
    if ((await lstat(current)).isSymbolicLink()) throw new DataError('Symlink data paths are not supported');
  }
  return target;
}

export async function loadYamlFile(root: string, path: string): Promise<LoadedDocument> {
  try {
    const target = await containedPath(root, path);
    const source = await readFile(target, 'utf8');
    return { path: path.replaceAll('\\', '/'), data: parseYaml(source, path.replaceAll('\\', '/')) };
  } catch (error) {
    if (error instanceof DataError) throw error;
    throw new DataError(`Unable to read YAML file: ${path.replaceAll('\\', '/')}`);
  }
}

export async function loadKit(root: string): Promise<LoadedKit> {
  const paths: string[] = [];
  async function visit(path: string): Promise<void> {
    const directory = await containedPath(root, path);
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
    for (const entry of entries) {
      const child = `${path}/${entry.name}`;
      if (entry.isSymbolicLink()) throw new DataError(`Symlink data paths are not supported: ${child}`);
      if (entry.isDirectory()) await visit(child);
      else if (entry.isFile() && /\.ya?ml$/i.test(entry.name)) paths.push(portable(child));
    }
  }
  try {
    for (const directory of sourceDirectories) {
      const previousCount = paths.length;
      await visit(directory);
      if (paths.length === previousCount) throw new DataError(`No YAML documents found: ${directory}`);
    }
    paths.sort();
    const documents: LoadedDocument[] = [];
    for (const path of paths) documents.push(await loadYamlFile(root, path));
    return { documents };
  } catch (error) {
    if (error instanceof DataError) throw error;
    throw new DataError('Unable to load the requested data directories');
  }
}
