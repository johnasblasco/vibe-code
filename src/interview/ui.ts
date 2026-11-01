import type { LoadedKit } from '../data/types.js';

export function interfaceText(kit: LoadedKit, path = 'beginner-course/interview-ui.yaml'): Record<string, string> {
  const data = kit.documents.find((document) => document.path === path)?.data;
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

/** Fixed YAML artwork; use a small wordmark when it cannot fit with Clack's guide. */
export function banner(kit: LoadedKit, columns: number): string {
  const ui = interfaceText(kit); const art = display(ui.banner).trimEnd();
  return art.split('\n').some((line) => line.length > columns - 4) ? display(ui.command_name) : art;
}

export function choiceLabel(value: unknown, question: Readonly<Record<string, unknown>>, ui: Record<string, string>): string {
  if (typeof value === 'boolean') return display(ui[value ? 'yes' : 'no']);
  if (Array.isArray(value)) return value.map((item) => choiceLabel(item, question, ui)).join(', ');
  const labels = question.option_labels as Record<string, unknown> | undefined;
  if (typeof value === 'string') {
    if (labels && Object.hasOwn(labels, value)) return display(labels[value]);
    if (Object.hasOwn(ui, `value_${value}`)) return display(ui[`value_${value}`]);
    return display(value).replaceAll('_', ' ');
  }
  return display(value);
}

/** Wrap prose before styling so guide bars stay aligned in small terminals. */
export function wrap(text: string, columns: number): string {
  const width = Math.max(16, columns - 5);
  return display(text).split('\n').map((line) => {
    const lines: string[] = []; let current = '';
    for (const word of line.split(/\s+/).filter(Boolean)) {
      if (current && current.length + word.length + 1 > width) { lines.push(current); current = ''; }
      current += `${current ? ' ' : ''}${word}`;
    }
    lines.push(current); return lines.join('\n');
  }).join('\n');
}
