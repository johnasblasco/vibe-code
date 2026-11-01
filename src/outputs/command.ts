import { password } from '@clack/prompts';
import { isCancel } from '@clack/prompts';
import type { LoadedKit } from '../data/types.js';
import { createState, setAnswer, StateError } from '../state/index.js';
import type { State } from '../state/index.js';
import { CANCELLED } from '../interview/index.js';
import type { InterviewPort } from '../interview/index.js';
import { createClackPort } from '../interview/clack.js';
import { interfaceText } from '../interview/ui.js';
import { MissingAnswers, prepareGeneration, securityContact } from './generate.js';
import type { GenerationPlan } from './generate.js';
import { publishPlan } from './publish.js';

export interface GenerationPort {
  ask: InterviewPort['ask']; invalid(): void; isCancelled?(): boolean;
  contact(): Promise<unknown | typeof CANCELLED>;
  confirm(): Promise<boolean | typeof CANCELLED>;
}
export function createGenerationPort(kit: LoadedKit, signal: AbortSignal): GenerationPort {
  const base = createClackPort(kit, signal);
  const ui = interfaceText(kit, 'beginner-course/generation-ui.yaml');
  return { ask: base.ask, invalid: base.invalid, isCancelled: () => signal.aborted,
    async contact() {
      if (signal.aborted) return CANCELLED;
      const result = await password({ message: ui.contact!, mask: '*', signal, validate: (value) => {
        try { securityContact(value); return undefined; } catch { return ui.invalid_contact; }
      } });
      return signal.aborted || isCancel(result) ? CANCELLED : result;
    },
    async confirm() {
      if (signal.aborted) return CANCELLED;
      const result = await password({ message: ui.confirm!, mask: '*', signal });
      return signal.aborted || isCancel(result) ? CANCELLED : result === ui.confirm_word;
    },
  };
}
function question(kit: LoadedKit, id: string): Readonly<Record<string, unknown>> {
  for (const document of kit.documents) {
    if (!document.path.startsWith('question-bank/')) continue;
    const groups = [document.data, ...((document.data.modules ?? []) as Readonly<Record<string, unknown>>[])];
    for (const group of groups) for (const item of [...((group.questions ?? []) as Readonly<Record<string, unknown>>[]),
      ...((group.flags ?? []) as Readonly<Record<string, unknown>>[])]) if (item.id === id) return item;
  }
  throw new StateError('Missing bound question');
}

export async function runGeneration(root: string, kit: LoadedKit, initial: State, project: string,
  options: Parameters<typeof prepareGeneration>[3] & { write?: boolean },
  dependencies: { port?: GenerationPort; save: (state: State) => Promise<void>; preview: (plan: GenerationPlan) => void }) {
  let state = structuredClone(initial);
  let contact = options.contact;
  const port = dependencies.port;
  const cancelled = () => options.signal?.aborted || (port?.isCancelled?.() ?? false);
  while (!cancelled()) {
    let plan: GenerationPlan;
    try { plan = await prepareGeneration(root, kit, state, { ...options, ...(contact === undefined ? {} : { contact }) }); }
    catch (error) {
      if (!(error instanceof MissingAnswers) || !port) throw error;
      if (error.ids.length) {
        const id = error.ids[0]!;
        const definition = createState(kit).questions[id];
        if (!definition) throw error;
        state = { ...state, questions: { ...state.questions, [id]: definition }, progress: { ...state.progress, current_question: id } };
        await dependencies.save(state);
        const answer = await port.ask(question(kit, id));
        if (answer === CANCELLED || cancelled()) return 'cancelled' as const;
        try { state = setAnswer(state, kit, id, answer); }
        catch (invalid) { if (!(invalid instanceof StateError)) throw invalid; port.invalid(); continue; }
        await dependencies.save(state);
        if (state.answers[id]?.state !== 'answered') throw new MissingAnswers([id]);
      } else if (error.needsContact) {
        const answer = await port.contact();
        if (answer === CANCELLED || cancelled()) return 'cancelled' as const;
        try { contact = securityContact(answer); } catch { port.invalid(); }
      }
      continue;
    }
    if (cancelled()) return 'cancelled' as const;
    await publishPlan(project, plan.files, { dryRun: true });
    dependencies.preview(plan);
    if (!options.write) return 'preview' as const;
    if (!port) throw new StateError('Writing requires explicit confirmation');
    const confirmation = await port.confirm();
    if (confirmation === CANCELLED || cancelled()) return 'cancelled' as const;
    if (!confirmation) return 'declined' as const;
    await publishPlan(project, plan.files);
    return 'written' as const;
  }
  return 'cancelled' as const;
}
