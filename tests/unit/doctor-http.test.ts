import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { request } from 'node:https';
import { lookup } from 'node:dns/promises';
import { fileURLToPath } from 'node:url';
import { expect, test, vi } from 'vitest';
import { loadKit } from '../../src/data/loader.js';
import { requestPreview } from '../../src/doctor/network.js';

vi.mock('node:https', async (original) => ({ ...await original<typeof import('node:https')>(), request: vi.fn() }));
vi.mock('node:dns/promises', async (original) => ({ ...await original<typeof import('node:dns/promises')>(), lookup: vi.fn() }));
const kit = await loadKit(fileURLToPath(new URL('../../', import.meta.url)));

test('native HTTPS refuses redirects and destroys their body without following another origin', async () => {
  vi.mocked(lookup).mockResolvedValueOnce([{ address: '8.8.8.8', family: 4 }] as unknown as Awaited<ReturnType<typeof lookup>>);
  const response = Readable.from([Buffer.from('untrusted redirect body')]) as Readable & { statusCode: number };
  response.statusCode = 302;
  vi.mocked(request).mockImplementationOnce((...args: unknown[]) => {
    const callback = args.at(-1) as (response: unknown) => void;
    const client = new EventEmitter() as EventEmitter & { end(): void; destroy(): void };
    client.end = () => { queueMicrotask(() => { callback(response); client.emit('close'); }); };
    client.destroy = () => { client.emit('close'); };
    return client as ReturnType<typeof request>;
  });
  expect((await requestPreview('https://preview.example.org/', kit)).status).toBe(302);
  expect(response.destroyed).toBe(true);
  expect(request).toHaveBeenCalledTimes(1);
});

test('a private DNS result prevents the HTTPS connection entirely', async () => {
  vi.mocked(lookup).mockResolvedValueOnce([{ address: '127.0.0.1', family: 4 }] as unknown as Awaited<ReturnType<typeof lookup>>);
  const before = vi.mocked(request).mock.calls.length;
  await expect(requestPreview('https://preview.example.org/', kit)).rejects.toThrow();
  expect(vi.mocked(request).mock.calls.length).toBe(before);
});
