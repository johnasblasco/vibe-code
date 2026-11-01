import type { LoadedKit } from '../data/types.js';
import { parseYaml } from '../data/loader.js';
import { collectAssets, digest, IntegrityError, readInventory } from './assets.js';

/** Trusted CLI entry point. Raw loadKit is only a parser and does not assert integrity. */
export async function loadVerifiedKit(root: string): Promise<LoadedKit> {
  try {
    const inventory = await readInventory(root);
    const contents = await collectAssets(root);
    const names = Object.keys(inventory.files).sort();
    if (names.length !== contents.size || names.some((path) => !contents.has(path) || digest(contents.get(path)!) !== inventory.files[path])) throw new IntegrityError();
    const documents = [...contents].filter(([path]) => !path.startsWith('templates/') && !path.startsWith('skills/') && /\.ya?ml$/i.test(path))
      .map(([path, text]) => ({ path, data: parseYaml(text, path) }));
    // Expose only lookup, never the mutable Map. The verified text is invocation-scoped.
    return { documents, verifiedAsset: (path: string) => {
      const value = contents.get(path); if (value === undefined) throw new IntegrityError('Unknown verified asset');
      return value;
    } };
  } catch { throw new IntegrityError('Kit integrity check failed'); }
}
