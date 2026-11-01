import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { isIP } from 'node:net';
import type { LoadedKit } from '../data/types.js';
import { policy, previewUrl } from './index.js';
import { noSecrets } from '../state/index.js';

export class DoctorNetworkError extends Error { override name = 'DoctorNetworkError'; }
export function publicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const [a = 0, b = 0, c = 0] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || a === 169 && b === 254 ||
      a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 || a === 100 && b >= 64 && b <= 127 ||
      a === 192 && b === 0 || a === 198 && (b === 18 || b === 19 || b === 51 && c === 100) || a === 203 && b === 0 && c === 113);
  }
  if (family === 6) {
    const groups = address.toLowerCase().split(':');
    const first = Number.parseInt(groups[0] ?? '', 16); const second = Number.parseInt(groups[1] ?? '', 16);
    return first >= 0x2000 && first <= 0x3fff && first !== 0x2002 &&
      !(first === 0x2001 && (second === 0xdb8 || second === 0));
  }
  return false;
}
export function validateCiUrl(value: string): URL {
  noSecrets(value);
  if (!/^https:\/\/api\.github\.com\/repos\/[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+\/actions\/workflows\/[A-Za-z0-9_.-]+\.ya?ml\/runs\?head_sha=[a-f0-9]{40}&per_page=\d+$/.test(value)) {
    throw new DoctorNetworkError('Unsupported CI metadata endpoint');
  }
  const url = new URL(value); const size = Number(url.searchParams.get('per_page'));
  if (!Number.isSafeInteger(size) || size < 1 || size > 100) throw new DoctorNetworkError('Invalid CI page size');
  return url;
}
export async function readBounded(stream: AsyncIterable<Uint8Array>, limit: number, signal?: AbortSignal): Promise<string> {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new DoctorNetworkError('Invalid response limit');
  if (signal?.aborted) throw new DoctorNetworkError('Request cancelled');
  let bytes = 0; let text = ''; const decoder = new TextDecoder();
  for await (const chunk of stream) {
    if (signal?.aborted) throw new DoctorNetworkError('Request cancelled');
    bytes += chunk.byteLength;
    if (bytes > limit) throw new DoctorNetworkError('Response exceeds limit');
    text += decoder.decode(chunk, { stream: true });
  }
  return text + decoder.decode();
}
async function getPublic(url: URL, kit: LoadedKit, signal?: AbortSignal) {
  const data = policy(kit); const timeout = Number(data.network_timeout_ms); const maximum = Number(data.network_max_bytes);
  if (!Number.isSafeInteger(timeout) || timeout < 1 || !Number.isSafeInteger(maximum) || maximum < 1 || signal?.aborted) throw new DoctorNetworkError('Invalid or cancelled request');
  const deadline = Date.now() + timeout;
  const addresses = await new Promise<Awaited<ReturnType<typeof lookup>>[]>((resolve, reject) => {
    const cancel = () => reject(new DoctorNetworkError('DNS lookup cancelled'));
    const timer = setTimeout(cancel, timeout); signal?.addEventListener('abort', cancel, { once: true });
    lookup(url.hostname, { all: true, verbatim: true }).then(resolve, () => reject(new DoctorNetworkError('DNS lookup failed')))
      .finally(() => { clearTimeout(timer); signal?.removeEventListener('abort', cancel); });
  });
  if (!addresses.length || !addresses.every((entry) => publicAddress(entry.address)) || signal?.aborted || Date.now() >= deadline) throw new DoctorNetworkError('Preview address is not public');
  const pinned = addresses[0]!;
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const fail = () => reject(new DoctorNetworkError('Public check unavailable'));
    const client = request(url, { method: 'GET', agent: false, rejectUnauthorized: true, servername: url.hostname,
      family: pinned.family,
      lookup: (_host, options, callback) => options.all ? callback(null, [pinned]) : callback(null, pinned.address, pinned.family),
      headers: { 'User-Agent': 'scaffolder', Accept: 'text/html, application/json' } }, (response) => {
      if (response.statusCode !== 200) { response.destroy(); resolve({ status: response.statusCode ?? 0, body: '' }); return; }
      readBounded(response, maximum, signal).then((body) => resolve({ status: 200, body }), fail);
    });
    const cancel = () => { client.destroy(new DoctorNetworkError('Request cancelled')); };
    const timer = setTimeout(cancel, Math.max(1, deadline - Date.now()));
    signal?.addEventListener('abort', cancel, { once: true });
    client.once('error', fail);
    client.once('close', () => { clearTimeout(timer); signal?.removeEventListener('abort', cancel); });
    client.end();
  });
}
export async function requestPreview(value: string, kit: LoadedKit, signal?: AbortSignal) {
  return getPublic(previewUrl(value), kit, signal);
}
export async function requestCi(value: string, kit: LoadedKit, signal?: AbortSignal): Promise<unknown> {
  const result = await getPublic(validateCiUrl(value), kit, signal);
  if (result.status !== 200) throw new DoctorNetworkError('CI metadata unavailable');
  try { return JSON.parse(result.body) as unknown; } catch { throw new DoctorNetworkError('Invalid CI metadata'); }
}
