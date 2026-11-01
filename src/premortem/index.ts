import type { LoadedKit } from '../data/types.js';
import { resume } from '../state/index.js';
import type { State } from '../state/index.js';
import { display, interfaceText } from '../interview/ui.js';

type Row = Readonly<Record<string, unknown>>;
export interface Risk {
  id: string; data: Row; score: number; status: 'open';
  questions: { id: string; state: 'answered' | 'deferred' | 'not_applicable' | 'unanswered' }[];
  cards: { id: string; status: 'unverified' }[];
}
export interface RiskReport { rows: Risk[]; total: number; researched: number; practice: number }
export class RiskError extends Error { override name = 'RiskError'; }

function ids(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every((id) => typeof id === 'string')) throw new RiskError('Invalid prevention data');
  return value;
}
function rating(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 5) throw new RiskError('Invalid risk rating');
  return value;
}
function lexical(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0; }

export function premortem(kit: LoadedKit, state: State, options: { top?: number } = {}): RiskReport {
  const top = options.top ?? 15;
  if (!Number.isSafeInteger(top) || top < 1) throw new RiskError('Invalid risk limit');
  const session = resume(state, kit);
  const rows = session.decision.failureModes.map(({ id, data }): Risk => {
    const prevention = data.prevention as Row;
    if (!prevention || typeof prevention !== 'object' || !['researched', 'practice'].includes(String(data.evidence))) {
      throw new RiskError('Invalid failure data');
    }
    return { id, data, score: rating(data.severity) * rating(data.likelihood), status: 'open',
      questions: ids(prevention.questions).map((question) => ({ id: question,
        state: session.reask.includes(question) ? 'unanswered' : state.answers[question]?.state ?? 'unanswered' })),
      cards: ids(prevention.cards).map((card) => ({ id: card, status: 'unverified' })) };
  });
  rows.sort((a, b) => b.score - a.score || Number(b.data.severity) - Number(a.data.severity) || lexical(a.id, b.id));
  const researched = rows.filter((row) => row.data.evidence === 'researched').length;
  return { rows: rows.slice(0, top), total: rows.length, researched, practice: rows.length - researched };
}

export function markdown(value: unknown): string {
  return display(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('\\', '\\\\').replace(/[|`*_[\]{}]/g, '\\$&').replace(/\r?\n/g, ' ');
}

export function renderTable(kit: LoadedKit, report: RiskReport): string {
  const ui = interfaceText(kit, 'beginner-course/premortem-ui.yaml');
  const format = (text: string) => text.replace(/\{(total|shown|researched|practice)\}/g, (_match, key: string) =>
    String(key === 'shown' ? report.rows.length : report[key as 'total' | 'researched' | 'practice']));
  const lines = [format(ui.summary!), '', ui.header!, ui.separator!];
  report.rows.forEach((risk, index) => {
    const prevention = risk.data.prevention as Row;
    const links = ['questions', 'cards', 'skills', 'templates', 'packs'].filter((key) => ids(prevention[key]).length)
      .map((key) => `${ui[key]}: ${ids(prevention[key]).join(', ')}`).join('; ');
    const questions = risk.questions.map((item) => `${item.id}: ${ui[item.state]}`).join('; ');
    const cards = risk.cards.map((item) => `${item.id}: ${ui[item.status]}`).join('; ');
    const evidence = `${ui[String(risk.data.evidence)]}${risk.data.source ? `: ${String(risk.data.source)}` : ''}`;
    lines.push('| ' + [index + 1, risk.id, risk.data.title, risk.data.severity, risk.data.likelihood, risk.score,
      links, questions, cards, evidence, ui[risk.status], '', '', ''].map(markdown).join(' | ') + ' |');
  });
  lines.push('', format(ui.evidence!), '', ui.guidance!);
  return lines.join('\n');
}
