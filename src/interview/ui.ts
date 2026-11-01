import type { LoadedKit } from '../data/types.js';

export function interfaceText(kit: LoadedKit): Record<string, string> {
  const data = kit.documents.find((document) => document.path === 'beginner-course/interview-ui.yaml')?.data;
  if (!data || Object.values(data).some((value) => typeof value !== 'string')) {
    throw new Error('Invalid interface data');
  }
  return new Proxy(data as Record<string, string>, {
    get(target, key: string): string {
      if (!Object.hasOwn(target, key)) throw new Error('Missing interface data');
      return target[key]!;
    },
  });
}

/** Kit text is data, never terminal control sequences. */
export function display(value: unknown): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value) ?? '';
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, '');
}
