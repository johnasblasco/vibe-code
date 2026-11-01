import { lstat, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import { join } from 'node:path';
import { collectAssets, inventoryPath, makeInventory, readInventory } from '../src/security/assets.ts';

// Maintainer-only, offline tool. Never imported/invoked by the CLI.
try {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.length === 1 && args[0] !== '--write') throw new Error();
  const root = fileURLToPath(new URL('../', import.meta.url));
  const next = makeInventory(await collectAssets(root));
  let previous;
  try { previous = await readInventory(root); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const changed = [...new Set([...Object.keys(previous?.files ?? {}), ...Object.keys(next.files)])]
    .filter((path) => previous?.files[path] !== next.files[path]).sort();
  for (const path of changed) process.stdout.write(`Changed asset: ${path}\n`);
  if (args[0] === '--write') {
    const directory = join(root, 'integrity');
    try { await mkdir(directory); } catch (error) { if (error.code !== 'EEXIST') throw error; }
    if ((await lstat(directory)).isSymbolicLink()) throw new Error();
    const target = join(root, inventoryPath);
    try { if ((await lstat(target)).isSymbolicLink()) throw new Error(); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    await writeFile(target, JSON.stringify(next, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
    process.stdout.write(`Inventory written for ${Object.keys(next.files).length} assets. Review actual source diffs before accepting it.\n`);
  } else {
    process.stdout.write(changed.length ? 'Inventory differs; review source changes before explicit --write.\n' : 'Asset inventory verified.\n');
    process.exitCode = changed.length ? 1 : 0;
  }
} catch { process.stderr.write('Unable to check or update the asset inventory.\n'); process.exitCode = 1; }
