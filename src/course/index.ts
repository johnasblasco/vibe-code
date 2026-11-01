import type { LoadedKit } from '../data/types.js';
import type { State } from '../state/index.js';
import { doctor } from '../doctor/index.js';
import type { DoctorOptions } from '../doctor/index.js';
import { evaluateGate } from '../gates/index.js';
import { validatedCourse, CourseError } from './state.js';
import type { CourseState } from './state.js';

type Row = Readonly<Record<string, unknown>>;
export async function guideCourse(kit: LoadedKit, answers: State, saved: CourseState, options: DoctorOptions & { advance?: boolean }) {
  const state = validatedCourse(saved); const index = Number(state.current_stage.slice(-1));
  let entryOptions = options;
  if (options.advance && options.deferrals && index < 3) {
    // Validate the entire requested exit file first, then apply only its earlier obligations at entry.
    await evaluateGate(kit, answers, `stage-${index + 1}`, { deferrals: options.deferrals });
    const entry = await evaluateGate(kit, answers, state.current_stage);
    const ids = new Set(entry.checks.map((check) => check.id));
    entryOptions = { ...options, deferrals: Object.fromEntries(Object.entries(options.deferrals).filter(([id]) => ids.has(id))) };
  }
  const entry = index === 0 ? { gate: await evaluateGate(kit, answers, 'stage-0'), evidence: {}, manualRecords: [], cancelled: false }
    : await doctor(kit, answers, `stage-${index - 1}`, entryOptions);
  const empty: Row[] = [];
  if (!entry.gate.allowed || entry.cancelled) return { stage: state.current_stage, cards: empty, nextStage: null, verification: entry, completed: false };
  if (index === 3) return { stage: state.current_stage, cards: empty, nextStage: null, verification: entry, completed: true };
  const stages = kit.documents.find((document) => document.path === 'beginner-course/golden-path.yaml')?.data.stages as Row[];
  const stage = stages.find((stage) => stage.id === state.current_stage);
  const cards = kit.documents.find((document) => document.path === `beginner-course/${String(stage?.card)}`)?.data.cards;
  if (!Array.isArray(cards) || !cards.length) throw new CourseError('Missing course cards');
  const verification = options.advance ? await doctor(kit, answers, state.current_stage, options) : undefined;
  return { stage: state.current_stage, cards: cards as Row[],
    nextStage: verification?.gate.allowed && !verification.cancelled ? `stage-${index + 1}` : null,
    verification, completed: false };
}
