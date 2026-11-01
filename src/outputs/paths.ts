import { lstat, readFile, realpath } from 'node:fs/promises';
import { join } from 'node:path';

export class OutputError extends Error { override name = 'OutputError'; }
export function portablePath(path: string): string[] {
  const parts = path.split('/');
  if (!parts.length || parts.some((part) => !/^[a-zA-Z0-9._-]+$/.test(part) || part === '.' || part === '..' ||
      part.endsWith('.') || /^\.git$/i.test(part) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) {
    throw new OutputError('Invalid portable output path');
  }
  return parts;
}
export async function readTemplate(root: string, source: string): Promise<string> {
  const parts = portablePath(source);
  if (!(source.startsWith('templates/') || source.startsWith('skills/project-templates/'))) throw new OutputError('Unknown template root');
  let path = await realpath(root);
  for (const part of parts) {
    path = join(path, part);
    if ((await lstat(path)).isSymbolicLink()) throw new OutputError('Linked template components are not supported');
  }
  return readFile(path, 'utf8');
}
