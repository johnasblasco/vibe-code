import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import test from 'node:test';
import { extractArchive } from '../../tools/smoke-release.mjs';

const variants = [{ name: 'system tar', executable: process.platform === 'win32'
  ? join(process.env.SystemRoot ?? 'C:/Windows', 'System32/tar.exe') : 'tar' }];
if (process.platform === 'win32') {
  const gnu = join(process.env.ProgramFiles ?? 'C:/Program Files', 'Git/usr/bin/tar.exe');
  assert.ok(existsSync(gnu), 'Windows regression requires the installed Git Bash GNU tar');
  variants.push({ name: 'Git Bash GNU tar', executable: gnu, directory: dirname(gnu) });
}
for (const variant of variants) {
  test(`${variant.name} extracts verified stdin bytes into a path with spaces and a native drive prefix`, async (context) => {
    if (variant.directory) {
      // Reproduce Git Bash's PATH, including the gzip shipped alongside GNU tar.
      const previous = process.env.PATH;
      process.env.PATH = [variant.directory, previous].filter(Boolean).join(delimiter);
      context.after(() => { if (previous === undefined) delete process.env.PATH; else process.env.PATH = previous; });
    }
    const source = await mkdtemp(join(tmpdir(), 'vibecode archive source '));
    const output = await mkdtemp(join(tmpdir(), 'vibecode archive output '));
    const content = new Uint8Array([0, 1, 13, 10, 127, 128, 254, 255]);
    await writeFile(join(source, 'marker.bin'), content);
    const packed = spawnSync(variant.executable, ['-czf', '-', 'marker.bin'], {
      cwd: source, shell: false, windowsHide: true, timeout: 30000, maxBuffer: 2_000_000,
    });
    assert.equal(packed.error, undefined); assert.equal(packed.status, 0, packed.stderr.toString());
    extractArchive(packed.stdout, output, variant.executable);
    assert.deepEqual(new Uint8Array(await readFile(join(output, 'marker.bin'))), content);
  });
}
