import { Readable } from 'node:stream';
import { expect, test } from 'vitest';
import { publicAddress, readBounded, validateCiUrl } from '../../src/doctor/network.js';
import { previewUrl } from '../../src/doctor/index.js';

test('private, local, reserved, and IPv4-mapped addresses cannot be preview destinations', () => {
  for (const address of ['127.0.0.1', '10.0.0.1', '169.254.169.254', '172.16.0.1', '192.168.1.1', '100.64.0.1',
    '0.0.0.0', '192.0.2.1', '198.51.100.1', '203.0.113.1', '224.0.0.1', '::1', '::ffff:127.0.0.1', 'fc00::1', 'fe80::1', '2001:db8::1']) {
    expect(publicAddress(address), address).toBe(false);
  }
  expect(publicAddress('8.8.8.8')).toBe(true); expect(publicAddress('2606:4700:4700::1111')).toBe(true);
  for (const url of ['http://example.org', 'https://user:pass@example.org', 'https://127.0.0.1', 'https://example.org/?private=value', 'https://host.local']) {
    expect(() => previewUrl(url)).toThrow();
  }
});

test('CI URL policy permits only the declared read-only workflow-runs endpoint', () => {
  expect(() => validateCiUrl('https://api.github.com/repos/owner/project/actions/workflows/ci.yml/runs?head_sha=' + 'a'.repeat(40) + '&per_page=20')).not.toThrow();
  for (const url of ['https://untrusted.invalid/', 'http://api.github.com/repos/owner/project/actions/runs',
    'https://api.github.com/repos/owner/project/actions/workflows/ci.yml/runs?token=private', 'https://user:pass@api.github.com/']) {
    expect(() => validateCiUrl(url)).toThrow();
  }
});

test('response reading enforces byte limits and cancellation without exposing page contents', async () => {
  expect(await readBounded(Readable.from([Buffer.from('version-1')]), 100)).toBe('version-1');
  await expect(readBounded(Readable.from([Buffer.from('synthetic-private-content')]), 4)).rejects.toThrow('Response exceeds limit');
  const abort = new AbortController(); abort.abort();
  await expect(readBounded(Readable.from([Buffer.from('private')]), 100, abort.signal)).rejects.toThrow();
});
