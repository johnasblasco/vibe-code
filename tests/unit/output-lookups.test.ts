import { fileURLToPath } from 'node:url';
import { expect, test, vi } from 'vitest';
import { loadKit, loadYamlFile } from '../../src/data/loader.js';
import { resolvePins, requestOfficial, LookupError, LookupUnavailable } from '../../src/outputs/lookups.js';

const kit = await loadKit(fileURLToPath(new URL('../../', import.meta.url)));
const now = '2026-11-01';
const commit = 'a'.repeat(40);
const tagObject = 'b'.repeat(40);
test('peels an annotated action tag and verifies its commit in the requested repository', async () => {
  const request = vi.fn(async (url: string) => {
    if (url.endsWith('/releases/latest')) return JSON.stringify({ tag_name: 'v7.0.1', draft: false, prerelease: false });
    if (url.includes('/git/ref/')) return JSON.stringify({ object: { type: 'tag', sha: tagObject } });
    if (url.endsWith(`/git/tags/${tagObject}`)) return JSON.stringify({ tag: 'v7.0.1', object: { type: 'commit', sha: commit } });
    if (url.endsWith(`/git/commits/${commit}`)) return JSON.stringify({ sha: commit });
    throw new Error('Unexpected lookup');
  });
  const [pin] = await resolvePins(kit, ['actions/checkout'], { now, request });
  expect(pin).toMatchObject({ id: 'actions/checkout', value: commit, tag: 'v7.0.1', verifiedOn: now, mode: 'live' });
  expect(request).toHaveBeenCalledTimes(4);
  expect(request.mock.calls.every(([url]) => url.startsWith('https://api.github.com/repos/actions/checkout/'))).toBe(true);
});

test('chooses stable published image tags and the configured LTS line rather than prereleases', async () => {
  const request = async (url: string) => url.includes('nodejs.org') ? JSON.stringify([
    { version: 'v27.0.0', lts: false, date: '2026-10-20' },
    { version: 'v26.13.0', lts: 'Lithium', date: '2026-10-28' },
    { version: 'v26.14.0', lts: 'Lithium', date: '2026-11-20' },
  ]) : url.endsWith('/postgres') ? 'GitRepo: https://github.com/docker-library/postgres.git\nTags: 19rc1, latest\nTags: 18.6, 18, 18.6-alpine\n'
    : 'GitRepo: https://github.com/redis/docker-library-redis.git\nTags: 9.0.0-rc1, latest\nTags: 8.10.3, 8, 8.10.3-alpine\n';
  expect((await resolvePins(kit, ['node', 'postgres', 'redis'], { now, request })).map((pin) => pin.value))
    .toEqual(['26.13.0', '18.6', '8.10.3']);
});

test('uses dated pack pins only for unavailable networking or explicit offline mode', async () => {
  const request = vi.fn(async (): Promise<string> => { throw new LookupUnavailable('Network unavailable'); });
  const offline = await resolvePins(kit, ['node', 'actions/checkout', 'gitleaks'], { now, offline: true, request });
  expect(request).not.toHaveBeenCalled();
  expect(offline.every((pin) => pin.mode === 'pack' && pin.verifiedOn === now)).toBe(true);
  expect((await resolvePins(kit, ['node'], { now, request }))[0]?.mode).toBe('pack');
  await expect(resolvePins(kit, ['node'], { now: '2026-12-01', offline: true })).rejects.toThrow(LookupError);
});

test('malformed hashes, releases, and JSON cannot fall back to a valid-looking pack pin', async () => {
  for (const payload of ['not-json', JSON.stringify({ tag_name: 'v7.0.1; injected', draft: false, prerelease: false }),
    JSON.stringify({ tag_name: 'v7.0.1', draft: false, prerelease: true })]) {
    await expect(resolvePins(kit, ['actions/checkout'], { now, request: async () => payload })).rejects.toThrow(LookupError);
  }
  await expect(resolvePins(kit, ['actions/checkout'], { now, request: async (url) => url.endsWith('/releases/latest')
    ? JSON.stringify({ tag_name: 'v7.0.1', draft: false, prerelease: false })
    : JSON.stringify({ object: { type: 'commit', sha: 'not-a-hash' } }) })).rejects.toThrow(LookupError);
});

test('rejects unapproved endpoints, oversized responses, and unknown pins before they become output', async () => {
  const cloned = structuredClone(kit);
  const pack = cloned.documents.find((document) => document.data.id === 'tool-versions')!.data;
  const lookups = pack.lookups as Record<string, Record<string, unknown>>;
  lookups.node!.url = 'https://untrusted.invalid/metadata';
  const request = vi.fn(async () => '[]');
  await expect(resolvePins(cloned, ['node'], { now, request })).rejects.toThrow(LookupError);
  expect(request).not.toHaveBeenCalled();
  await expect(resolvePins(kit, ['unknown'], { now, offline: true })).rejects.toThrow(LookupError);
  await expect(resolvePins(kit, ['node'], { now, request: async () => ' '.repeat(2_100_000) })).rejects.toThrow(LookupError);
});

test('cancellation stops lookup work without converting the abort into a pack fallback', async () => {
  const controller = new AbortController(); controller.abort();
  const request = vi.fn(async () => '[]');
  await expect(resolvePins(kit, ['node'], { now, signal: controller.signal, request })).rejects.toThrow(LookupError);
  expect(request).not.toHaveBeenCalled();
});

test('the network entry point rejects unofficial URLs before any request', async () => {
  const fetch = vi.fn(async () => new Response('{}'));
  vi.stubGlobal('fetch', fetch);
  try {
    const scenario = (await loadYamlFile(fileURLToPath(new URL('../../', import.meta.url)), 'tests/security-scenarios/lookup-integrity.yaml')).data;
    for (const url of scenario.unapproved_urls as string[]) await expect(requestOfficial(url)).rejects.toThrow(LookupError);
    expect(fetch).not.toHaveBeenCalled();
  } finally { vi.unstubAllGlobals(); }
});
