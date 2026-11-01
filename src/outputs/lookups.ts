import type { LoadedKit } from '../data/types.js';

type Row = Record<string, unknown>;
export interface Pin { id: string; value: string; source: string; verifiedOn: string; mode: 'live' | 'pack'; tag?: string }
export class LookupError extends Error { override name = 'LookupError'; }
export class LookupUnavailable extends Error { override name = 'LookupUnavailable'; }
export class LookupCancelled extends LookupError { override name = 'LookupCancelled'; }
export type LookupRequest = (url: string) => Promise<string>;
const hash = /^[a-f0-9]{40}$/;
const version = /^\d+\.\d+(?:\.\d+)?$/;
const releaseTag = /^v?\d+\.\d+\.\d+$/;
function fail(): never { throw new LookupError('Invalid official lookup data'); }
function object(value: unknown): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail();
  return value as Row;
}
export function field(value: unknown, path: string): unknown {
  for (const key of path.split('.')) {
    const row = object(value);
    if (!Object.hasOwn(row, key)) fail();
    value = row[key];
  }
  return value;
}
function date(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) fail();
  return value;
}
function compare(a: string, b: string): number {
  const left = a.split('.').map(Number); const right = b.split('.').map(Number);
  for (let index = 0; index < 3; index++) { const difference = (left[index] ?? 0) - (right[index] ?? 0); if (difference) return difference; }
  return 0;
}
function approved(id: string, config: Row): void {
  if (config.kind === 'github') {
    if (!['actions/checkout', 'actions/setup-node', 'gitleaks/gitleaks'].includes(String(config.repository)) ||
        (id === 'gitleaks' ? config.repository !== 'gitleaks/gitleaks' : config.repository !== id) ||
        config.url !== `https://api.github.com/repos/${String(config.repository)}/releases/latest`) fail();
  } else if (config.kind === 'node') {
    if (id !== 'node' || config.url !== 'https://nodejs.org/dist/index.json') fail();
  } else if (config.kind === 'image') {
    if (!['postgres', 'redis'].includes(id) || config.url !==
        `https://raw.githubusercontent.com/docker-library/official-images/master/library/${id}`) fail();
  } else fail();
}
function validValue(id: string, config: Row, value: unknown, major: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (config.kind === 'github') return hash.test(value);
  if (!version.test(value)) return false;
  if (id === 'node') return /^\d+\.\d+\.\d+$/.test(value) && Number(value.split('.')[0]) === major;
  if (id === 'postgres') return Number(value.split('.')[0]) >= 18;
  return /^\d+\.\d+\.\d+$/.test(value);
}

/** Read-only public metadata only; no credentials, redirects, or project data. */
export async function requestOfficial(url: string, signal?: AbortSignal): Promise<string> {
  const fixed = ['https://nodejs.org/dist/index.json',
    'https://raw.githubusercontent.com/docker-library/official-images/master/library/postgres',
    'https://raw.githubusercontent.com/docker-library/official-images/master/library/redis'];
  const github = ['actions/checkout', 'actions/setup-node', 'gitleaks/gitleaks'].some((repository) => {
    const base = `https://api.github.com/repos/${repository}/`;
    if (!url.startsWith(base)) return false;
    const path = url.slice(base.length);
    return path === 'releases/latest' || /^git\/ref\/tags\/v?\d+\.\d+\.\d+$/.test(path) || /^git\/(tags|commits)\/[a-f0-9]{40}$/.test(path);
  });
  if (!fixed.includes(url) && !github) fail();
  let response: Response;
  try { response = await fetch(url, { redirect: 'error', credentials: 'omit', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000),
    headers: { 'User-Agent': 'scaffolder', Accept: 'application/json, text/plain' } }); }
  catch { throw new LookupUnavailable('Official service unavailable'); }
  if ([403, 429, 500, 502, 503, 504].includes(response.status)) throw new LookupUnavailable('Official service unavailable');
  if (!response.ok || response.url !== url || !response.body) fail();
  const reader = response.body.getReader(); const decoder = new TextDecoder();
  let size = 0; let text = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.length;
      if (size > 2_000_000) fail();
      text += decoder.decode(chunk.value, { stream: true });
    }
    return text + decoder.decode();
  } finally { await reader.cancel().catch(() => undefined); }
}

export async function resolvePins(kit: LoadedKit, ids: readonly string[], options: {
  now?: string; offline?: boolean; request?: LookupRequest; signal?: AbortSignal;
} = {}): Promise<Pin[]> {
  const now = date(options.now ?? new Date().toISOString().slice(0, 10));
  const pack = object(kit.documents.find((document) => document.data.id === 'tool-versions')?.data);
  const major = field(pack.values, 'node.recommended_major');
  const abort = () => { if (options.signal?.aborted) throw new LookupCancelled('Lookup cancelled'); };
  abort();
  const request = options.request ?? ((url: string) => requestOfficial(url, options.signal));
  const read = async (url: string): Promise<string> => {
    abort();
    const text = await request(url);
    abort();
    if (typeof text !== 'string' || text.length > 2_000_000) fail();
    return text;
  };
  const json = async (url: string): Promise<unknown> => {
    const text = await read(url);
    try { return JSON.parse(text) as unknown; } catch { return fail(); }
  };
  const pins: Pin[] = [];
  for (const id of [...new Set(ids)]) {
    abort();
    const configs = object(pack.lookups);
    if (!Object.hasOwn(configs, id)) fail();
    const config = object(configs[id]); approved(id, config);
    const source = String(config.url);
    const fallback = (): Pin => {
      const verifiedOn = date(config.verified_on);
      const age = (Date.parse(now) - Date.parse(verifiedOn)) / 86400000;
      if (typeof pack.max_age_days !== 'number' || age < 0 || age > pack.max_age_days || typeof config.field !== 'string') fail();
      const value = field(pack.values, config.field);
      if (!validValue(id, config, value, major)) fail();
      if (config.kind === 'github' && (typeof config.tag !== 'string' || !releaseTag.test(config.tag))) fail();
      return { id, value, source, verifiedOn, mode: 'pack', ...(typeof config.tag === 'string' ? { tag: config.tag } : {}) };
    };
    if (options.offline) { pins.push(fallback()); continue; }
    try {
      let value: string; let tag: string | undefined;
      if (config.kind === 'github') {
        const release = object(await json(source));
        if (typeof release.tag_name !== 'string' || !releaseTag.test(release.tag_name) || release.draft !== false || release.prerelease !== false) fail();
        tag = release.tag_name;
        const base = `https://api.github.com/repos/${String(config.repository)}/git`;
        let target = object(object(await json(`${base}/ref/tags/${tag}`)).object);
        const seen = new Set<string>();
        while (target.type === 'tag') {
          if (typeof target.sha !== 'string' || !hash.test(target.sha) || seen.has(target.sha) || seen.size >= 4) fail();
          seen.add(target.sha);
          target = object(object(await json(`${base}/tags/${target.sha}`)).object);
        }
        if (target.type !== 'commit' || typeof target.sha !== 'string' || !hash.test(target.sha)) fail();
        value = target.sha;
        if (object(await json(`${base}/commits/${value}`)).sha !== value) fail();
      } else if (config.kind === 'node') {
        const data = await json(source);
        if (!Array.isArray(data)) fail();
        const candidates = data.map(object).filter((entry) => typeof entry.version === 'string' &&
          /^v\d+\.\d+\.\d+$/.test(entry.version) && Number(entry.version.split('.')[0]!.slice(1)) === major &&
          typeof entry.lts === 'string' && Boolean(entry.lts) && date(entry.date) <= now)
          .map((entry) => String(entry.version).slice(1)).sort(compare);
        value = candidates.at(-1) ?? fail();
      } else {
        const text = await read(source);
        const repository = id === 'postgres' ? 'docker-library/postgres' : 'redis/docker-library-redis';
        if (!text.split(/\r?\n/).includes(`GitRepo: https://github.com/${repository}.git`)) fail();
        const candidates = [...text.matchAll(/^Tags: (.+)$/gm)].flatMap((match) => match[1]!.split(',').map((tag) => tag.trim()))
          .filter((tag) => validValue(id, config, tag, major)).sort(compare);
        value = candidates.at(-1) ?? fail();
      }
      if (!validValue(id, config, value, major)) fail();
      pins.push({ id, value, source, verifiedOn: now, mode: 'live', ...(tag ? { tag } : {}) });
    } catch (error) {
      abort();
      if (!(error instanceof LookupUnavailable)) throw error;
      pins.push(fallback());
    }
  }
  return pins;
}
