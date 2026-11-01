import { stringify } from 'yaml';
import type { LoadedKit } from '../data/types.js';
import type { State } from '../state/index.js';
import { noSecrets, resume } from '../state/index.js';
import { check } from '../expressions/index.js';
import { markdown, premortem, renderTable } from '../premortem/index.js';
import { interfaceText } from '../interview/ui.js';
import { field, resolvePins } from './lookups.js';
import type { LookupRequest, Pin } from './lookups.js';
import { portablePath, readTemplate } from './paths.js';
import { parseYaml } from '../data/loader.js';

type Row = Readonly<Record<string, unknown>>;
export interface GeneratedFile { id: string; path: string; content: string }
export interface GenerationPlan { files: GeneratedFile[]; pins: Pin[] }
export class GenerationError extends Error { override name = 'GenerationError'; }
export class GenerationBlocked extends GenerationError {
  constructor(readonly stop: boolean) { super('Generation is blocked by current rules'); }
}
export class MissingAnswers extends GenerationError {
  constructor(readonly ids: string[], readonly needsContact = false) { super('Generation needs current concrete answers'); }
}
function mapping(value: unknown): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new GenerationError('Invalid output definitions');
  return value as Row;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new GenerationError('Expected output definition text');
  return value;
}
function plain(value: unknown): string {
  noSecrets(value);
  if (value === null || value === undefined || typeof value === 'object' && !Array.isArray(value)) throw new GenerationError('Invalid bound value');
  const result = Array.isArray(value) ? value.map(plain).join(', ') : String(value);
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x08\x0b-\x1f\x7f]/.test(result) || result.includes('{{')) throw new GenerationError('Invalid bound text');
  return result;
}
export function securityContact(value: unknown): string {
  const contact = text(value); noSecrets(contact);
  if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(contact)) return contact;
  try {
    const url = new URL(contact);
    if (url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash) return plain(contact);
  } catch { /* A generic error below never includes the supplied value. */ }
  throw new GenerationError('Invalid security contact');
}
function slug(value: unknown): string {
  const result = plain(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 63).replace(/-+$/g, '');
  if (!result) throw new GenerationError('Project name cannot form a slug');
  return result;
}
const tokens = /(?<!\$)\{\{([a-z0-9_]+)\}\}/g;
function unresolved(source: string): boolean { return source.replace(/\$\{\{[^{}]*\}\}/g, '').includes('{{'); }

export async function prepareGeneration(root: string, kit: LoadedKit, state: State, options: {
  ids?: readonly string[]; contact?: string; now?: string; offline?: boolean; request?: LookupRequest; signal?: AbortSignal;
} = {}): Promise<GenerationPlan> {
  const session = resume(state, kit);
  if (session.decision.stop || session.decision.contradictions.some((rule) => rule.severity === 'block')) {
    throw new GenerationBlocked(session.decision.stop);
  }
  const now = options.now ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(now) || !Number.isFinite(Date.parse(now)) || new Date(now).toISOString().slice(0, 10) !== now) {
    throw new GenerationError('Invalid generation date');
  }
  const definitions = kit.documents.find((document) => document.path === 'outputs/files.yaml')?.data.files;
  if (!Array.isArray(definitions) || !definitions.length) throw new GenerationError('Missing output manifest');
  const files = definitions.map(mapping);
  const allIds = files.map((file) => text(file.id));
  const paths = files.map((file) => { portablePath(text(file.path)); return text(file.path).toLowerCase(); });
  if (new Set(allIds).size !== allIds.length || new Set(paths).size !== paths.length) throw new GenerationError('Duplicate output definition');
  const selected = files.filter((file) => file.always === true || options.ids === undefined || options.ids.includes(text(file.id)));
  for (const id of options.ids ?? []) if (!allIds.includes(id)) throw new GenerationError('Unknown output ID');
  const active: { definition: Row; source: string }[] = [];
  for (const file of selected) {
    if (!check(text(file.when), session.environment)) {
      if (options.ids?.includes(text(file.id))) throw new GenerationError('Output does not apply');
      continue;
    }
    if (!['markdown', 'yaml', 'env', 'text'].includes(text(file.format))) throw new GenerationError('Unknown output format');
    const source = (await readTemplate(root, text(file.source))).replaceAll('\r\n', '\n');
    if (unresolved(source.replace(tokens, ''))) throw new GenerationError('Malformed output placeholder');
    active.push({ definition: file, source });
  }
  const bindingsFile = mapping(kit.documents.find((document) => document.path === 'outputs/bindings.yaml')?.data);
  const bindings = mapping(bindingsFile.placeholders);
  const declaredResolvers = mapping(bindingsFile.system_resolvers);
  const names = new Set(active.flatMap((file) => [...file.source.matchAll(tokens)].map((match) => match[1]!)));
  const missing = new Set<string>(); let needsContact = false;
  const requiredPins = new Set<string>();
  const toolPack = mapping(kit.documents.find((document) => document.data.id === 'tool-versions')?.data);
  const lookupConfigs = mapping(toolPack.lookups);
  const current = (id: string): unknown => {
    const value = session.environment[id];
    if (value === undefined || value === 'pick_for_me' || value === 'auto_detect' || typeof value === 'string' && !value.trim()) missing.add(id);
    return value;
  };
  for (const name of names) {
    if (!Object.hasOwn(bindings, name)) throw new GenerationError('Missing placeholder binding');
    const binding = mapping(bindings[name]);
    if (binding.from === 'question') current(text(binding.id));
    else if (binding.from === 'pack') {
      const pack = mapping(kit.documents.find((document) => document.data.id === binding.pack)?.data);
      field(pack.values, text(binding.field));
      if (binding.pack === 'tool-versions') {
        for (const [id, config] of Object.entries(lookupConfigs)) {
          if (mapping(config).field === binding.field || id === 'node' && String(binding.field).startsWith('node.') ||
              id === 'postgres' && String(binding.field).startsWith('postgres.')) requiredPins.add(id);
        }
      }
    } else if (binding.from === 'system') {
      const resolver = text(binding.resolver);
      if (!Object.hasOwn(declaredResolvers, resolver)) throw new GenerationError('Undeclared resolver');
      if (resolver === 'slugify') current(text(binding.of));
      else if (resolver === 'ask_security_contact') { if (options.contact === undefined) needsContact = true; else securityContact(options.contact); }
      else if (resolver === 'resolve_action_sha') {
        if (!Array.isArray(binding.args) || binding.args.length !== 1 || typeof binding.args[0] !== 'string') throw new GenerationError('Invalid action binding');
        requiredPins.add(binding.args[0]);
      } else if (!['today', 'premortem_table', 'secret_scan_step', 'lookup_report'].includes(resolver)) throw new GenerationError('Unknown resolver');
    } else throw new GenerationError('Unknown binding source');
  }
  if (missing.size || needsContact) throw new MissingAnswers([...missing], needsContact);
  const pins = await resolvePins(kit, [...requiredPins], { now, ...(options.offline !== undefined ? { offline: options.offline } : {}),
    ...(options.request ? { request: options.request } : {}), ...(options.signal ? { signal: options.signal } : {}) });
  const byId = new Map(pins.map((pin) => [pin.id, pin]));
  const resolverText = interfaceText(kit, 'outputs/resolvers.yaml');
  const values = new Map<string, string>();
  for (const name of names) {
    const binding = mapping(bindings[name]); let value: string;
    if (binding.from === 'question') value = plain(current(text(binding.id)));
    else if (binding.from === 'pack') {
      const config = Object.entries(lookupConfigs).find(([, config]) => mapping(config).field === binding.field);
      const resolved = binding.pack === 'tool-versions' && config ? byId.get(config[0]) : undefined;
      const pack = mapping(kit.documents.find((document) => document.data.id === binding.pack)?.data);
      value = resolved?.value ?? plain(field(pack.values, text(binding.field)));
    } else {
      switch (binding.resolver) {
        case 'slugify': value = slug(current(text(binding.of))); break;
        case 'today': value = now; break;
        case 'ask_security_contact': value = securityContact(options.contact); break;
        case 'resolve_action_sha': value = byId.get((binding.args as string[])[0]!)?.value ?? ''; break;
        case 'secret_scan_step': value = resolverText.secret_scan_step!; break;
        case 'premortem_table': value = renderTable(kit, premortem(kit, state)); break;
        case 'lookup_report': {
          const rows = pins.map((pin) => '| ' + [pin.id, pin.value, pin.tag ?? '', pin.source, pin.verifiedOn, pin.mode].map(markdown).join(' | ') + ' |');
          value = [resolverText.lookup_header, resolverText.lookup_separator, ...rows, '',
            !pins.length ? resolverText.no_pins : pins.some((pin) => pin.mode === 'pack') ? resolverText.pack_warning : resolverText.live_note,
            ...(pins.some((pin) => pin.id === 'redis') ? ['', resolverText.licence_note] : [])].join('\n');
          break;
        }
        default: throw new GenerationError('Unsupported resolver');
      }
    }
    if (!value && binding.from !== 'question') throw new GenerationError('Unresolved bound value');
    values.set(name, value);
  }
  const render = (source: string, format: string, metadata = false): string => source.replace(tokens, (_match, name: string) => {
    const value = values.get(name);
    if (value === undefined) throw new GenerationError('Unresolved placeholder');
    const binding = mapping(bindings[name]);
    const block = binding.from === 'system' && ['lookup_report', 'premortem_table', 'secret_scan_step'].includes(String(binding.resolver));
    if (metadata) return value;
    if (format === 'markdown') return block ? value : markdown(value);
    if (!block && /\r|\n/.test(value)) throw new GenerationError('Multiline value in configuration');
    const pin = binding.resolver === 'resolve_action_sha' ? byId.get((binding.args as string[])[0]!) :
      binding.field === 'gitleaks.rev' ? byId.get('gitleaks') : undefined;
    return value + (pin ? ` # ${pin.tag}, verified ${pin.verifiedOn}` : '');
  });
  const result: GeneratedFile[] = [];
  for (const { definition, source } of active) {
    const format = text(definition.format);
    const frontmatter = format === 'markdown' ? /^---\n([\s\S]*?)\n---\n/.exec(source) : null;
    let content: string;
    if (frontmatter) {
      const metadata = parseYaml(frontmatter[1]!, 'template frontmatter');
      const rendered = Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key, render(text(value), 'markdown', true)]));
      content = `---\n${stringify(rendered)}---\n` + render(source.slice(frontmatter[0].length), format);
    } else content = render(source, format);
    if (unresolved(content)) throw new GenerationError('Unresolved generated placeholder');
    if (format === 'yaml') {
      parseYaml(content, 'generated configuration');
      for (const match of content.matchAll(/uses:\s*(\S+)/g)) if (!/^[\w.-]+\/[\w.-]+@[a-f0-9]{40}$/.test(match[1]!)) throw new GenerationError('Unpinned generated action');
    }
    result.push({ id: text(definition.id), path: text(definition.path), content: content.endsWith('\n') ? content : `${content}\n` });
  }
  return { files: result, pins };
}
