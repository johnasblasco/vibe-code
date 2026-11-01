import { isCancel, select, multiselect, password, note, log, updateSettings } from '@clack/prompts';
import type { LoadedKit } from '../data/types.js';
import { CANCELLED } from './index.js';
import type { InterviewPort } from './index.js';
import { display, interfaceText } from './ui.js';

export function createClackPort(kit: LoadedKit, signal: AbortSignal, settings: { directAnswers?: boolean } = {}): InterviewPort {
  const ui = interfaceText(kit);
  updateSettings({ accessible: true, messages: { cancel: ui.cancelled!, error: ui.invalid! } });
  const cancelled = (value: unknown) => signal.aborted || isCancel(value);
  const text = (message: string) => password({ message, signal, mask: '*',
    validate: (value) => value?.trim() ? undefined : ui.required });
  const choices = (values: unknown[], labels: Record<string, unknown> = {}) => values.map((value, index) => ({ value: index,
    label: display(typeof value === 'string' && Object.hasOwn(labels, value) ? labels[value] : value) }));
  const metadata = async (state: 'deferred' | 'not_applicable') => {
    note(ui.masked);
    if (state === 'deferred') {
      const owner = await text(ui.owner!); if (cancelled(owner)) return CANCELLED;
      const revisit = await text(ui.revisit!);
      return cancelled(revisit) ? CANCELLED : { state, owner, revisit_when: revisit };
    }
    const reason = await text(ui.reason!);
    return cancelled(reason) ? CANCELLED : { state, reason };
  };
  const direct = async (question: Readonly<Record<string, unknown>>, allowed: string[]) => {
    const message = display(question.ask); const options = (question.options ?? []) as unknown[];
    if (question.type === 'boolean' || question.type === 'single_select') {
      const answers: { value: boolean | number | string; label: string }[] = question.type === 'boolean'
        ? [{ value: true, label: ui.yes! }, { value: false, label: ui.no! }]
        : choices(options, question.option_labels as Record<string, unknown> | undefined);
      answers.push(...allowed.filter((value) => value !== 'answered').map((value) => ({ value, label: ui[value]! })));
      const selected = await select({ message, signal, options: answers });
      if (cancelled(selected)) return CANCELLED;
      if (selected === 'deferred' || selected === 'not_applicable') return metadata(selected);
      return { state: 'answered', value: question.type === 'boolean' ? selected : options[selected as number] };
    }
    note(ui.masked);
    const action = (input: string) => input === ui.defer_command && allowed.includes('deferred') ? 'deferred'
      : input === ui.na_command && allowed.includes('not_applicable') ? 'not_applicable' : null;
    const answer = await password({ message: `${message}${allowed.length > 1 ? `\n${ui.direct_hint}` : ''}`, signal, mask: '*',
      validate: (input) => !input?.trim() ? ui.required : !action(input) && question.type === 'number' && !Number.isFinite(Number(input)) ? ui.number : undefined });
    if (cancelled(answer)) return CANCELLED;
    const selectedAction = action(answer as string);
    return selectedAction ? metadata(selectedAction) : { state: 'answered', value: question.type === 'number' ? Number(answer) : answer };
  };
  return {
    isCancelled: () => signal.aborted,
    async ask(question) {
      if (signal.aborted) return CANCELLED;
      const message = display(question.ask);
      if (question.why) note(display(question.why), ui.why);
      const allowed = (question.states_allowed ?? ['answered', 'deferred', 'not_applicable']) as string[];
      if (settings.directAnswers && allowed.includes('answered') && ['text', 'number', 'boolean', 'single_select'].includes(String(question.type))) return direct(question, allowed);
      const state = allowed.length === 1 ? allowed[0] : await select({ message: `${message}\n${ui.state}`, signal,
        options: allowed.map((value) => ({ value, label: ui[value]! })) });
      if (cancelled(state)) return CANCELLED;
      if (state === 'deferred') {
        note(ui.masked);
        const owner = await text(ui.owner!);
        if (cancelled(owner)) return CANCELLED;
        const revisit = await text(ui.revisit!);
        if (cancelled(revisit)) return CANCELLED;
        return { state, owner, revisit_when: revisit };
      }
      if (state === 'not_applicable') {
        note(ui.masked);
        const reason = await text(ui.reason!);
        return cancelled(reason) ? CANCELLED : { state, reason };
      }
      let value: unknown;
      const options = (question.options ?? []) as unknown[];
      if (question.type === 'boolean') {
        value = await select({ message, signal,
          options: [{ value: true, label: ui.yes! }, { value: false, label: ui.no! }] });
      } else if (question.type === 'single_select') {
        const index = await select({ message, signal, options: choices(options, question.option_labels as Record<string, unknown> | undefined) });
        if (cancelled(index)) return CANCELLED;
        value = options[index as number];
      } else if (question.type === 'multi_select') {
        const indices = await multiselect({ message, signal, options: choices(options, question.option_labels as Record<string, unknown> | undefined), required: false });
        if (cancelled(indices)) return CANCELLED;
        value = (indices as number[]).map((index) => options[index]);
      } else if (question.type === 'rank_priorities') {
        const remaining = choices(options);
        const ranked: unknown[] = [];
        while (remaining.length > 0) {
          const index = await select({ message, signal, options: remaining });
          if (cancelled(index)) return CANCELLED;
          ranked.push(options[index as number]);
          remaining.splice(remaining.findIndex((option) => option.value === index), 1);
        }
        value = ranked;
      } else {
        note(ui.masked);
        const answer = await password({ message, signal, mask: '*', validate: (input) => {
          if (!input?.trim()) return ui.required;
          if (question.type === 'number' && !Number.isFinite(Number(input))) return ui.number;
          return undefined;
        } });
        if (cancelled(answer)) return CANCELLED;
        value = question.type === 'number' ? Number(answer) : answer;
      }
      return cancelled(value) ? CANCELLED : { state: 'answered', value };
    },
    async review(proposals) {
      if (signal.aborted) return CANCELLED;
      const selected = await multiselect({ message: ui.review!, signal, required: false,
        initialValues: proposals.map((proposal) => proposal.id),
        options: proposals.map((proposal) => ({ value: proposal.id,
          label: `${display(proposal.question.ask)}: ${display(proposal.value)}`,
          hint: `${ui.source}: ${display(proposal.source)}. ${display(proposal.why)}` +
            (proposal.verified ? ` ${ui.verified}: ${display(proposal.verified)}` : '') })) });
      return cancelled(selected) ? CANCELLED : selected as string[];
    },
    report(event) {
      if (event.kind === 'bank-change') { log.warn(ui.bank_change!); return; }
      note([event.data.message, event.data.fix, event.data.action].filter(Boolean).map(display).join('\n'),
        `${display(event.data.severity ?? event.kind)}: ${display(event.id)}`);
    },
    invalid() { log.warn(ui.invalid!); },
  };
}
