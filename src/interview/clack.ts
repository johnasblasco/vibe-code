import { isCancel, select, multiselect, text as promptText, note, log, updateSettings, intro, outro, S_BAR, settings as clackSettings } from '@clack/prompts';
import { styleText } from 'node:util';
import type { LoadedKit } from '../data/types.js';
import { CANCELLED } from './index.js';
import type { InterviewPort } from './index.js';
import { banner, choiceLabel, display, interfaceText, wrap } from './ui.js';
import { noSecrets } from '../state/index.js';

export function createClackPort(kit: LoadedKit, signal: AbortSignal, settings: { directAnswers?: boolean } = {}): InterviewPort {
  const ui = interfaceText(kit);
  const maxItems = Number(ui.menu_rows);
  if (!Number.isSafeInteger(maxItems) || maxItems < 1) throw new Error('Invalid interface data');
  updateSettings({ messages: { cancel: ui.paused!, error: ui.invalid! } });
  const columns = () => process.stdout.columns ?? 80;
  const muted = (text: string) => styleText('dim', wrap(text, columns()));
  const textMessage = (message: string) => wrap(message, columns()).replaceAll('\n',
    `\n${clackSettings.withGuide ? `${styleText('gray', S_BAR)}  ` : '   '}`);
  let helpShown = false; let currentSection = ''; let activeMessage = '';
  const asked = new Map<string, number>();
  const help = () => { if (!helpShown) { log.message(muted(ui.session_help!), { spacing: 0 }); helpShown = true; } };
  const validateText = (value: string | undefined) => {
    if (!value?.trim()) return ui.required;
    try { noSecrets(value); } catch { return ui.invalid; }
    return undefined;
  };
  const section = (label: string) => {
    if (currentSection !== label) { log.step(styleText('bold', display(label))); currentSection = label; }
  };
  const flow = kit.documents.find((document) => document.path === 'beginner-course/interview-flow.yaml')?.data;
  const sections = flow?.sections as
    { label: string; questions: string[] }[] | undefined;
  const reviewLabels = flow?.review_labels as Record<string, string> | undefined;
  const cancelled = (value: unknown) => signal.aborted || isCancel(value);
  const text = (message: string) => promptText({ message: textMessage(message), signal, validate: validateText });
  const choices = (values: unknown[], labels: Record<string, unknown> = {}) => values.map((value, index) => ({ value: index,
    label: choiceLabel(value, { option_labels: labels }, ui) }));
  const metadata = async (state: 'deferred' | 'not_applicable') => {
    if (state === 'deferred') {
      const owner = await text(ui.owner!); if (cancelled(owner)) return CANCELLED;
      const revisit = await text(ui.revisit!);
      return cancelled(revisit) ? CANCELLED : { state, owner, revisit_when: revisit };
    }
    const reason = await text(ui.reason!);
    return cancelled(reason) ? CANCELLED : { state, reason };
  };
  const direct = async (question: Readonly<Record<string, unknown>>, allowed: string[]) => {
    const message = activeMessage; const options = (question.options ?? []) as unknown[];
    if (question.type === 'boolean' || question.type === 'single_select') {
      const answers: { value: boolean | number | string; label: string }[] = question.type === 'boolean'
        ? [{ value: true, label: ui.yes! }, { value: false, label: ui.no! }]
        : choices(options, question.option_labels as Record<string, unknown> | undefined);
      answers.push(...allowed.filter((value) => value !== 'answered').map((value) => ({ value, label: ui[value]! })));
      const selected = await select({ message, signal, options: answers, maxItems });
      if (cancelled(selected)) return CANCELLED;
      if (selected === 'deferred' || selected === 'not_applicable') return metadata(selected);
      return { state: 'answered', value: question.type === 'boolean' ? selected : options[selected as number] };
    }
    const action = (input: string) => input === ui.defer_command && allowed.includes('deferred') ? 'deferred'
      : input === ui.na_command && allowed.includes('not_applicable') ? 'not_applicable' : null;
    const answer = await promptText({ message: textMessage(message), signal,
      validate: (input) => validateText(input) ?? (!action(input ?? '') && question.type === 'number' && !Number.isFinite(Number(input)) ? ui.number : undefined) });
    if (cancelled(answer)) return CANCELLED;
    const selectedAction = action(answer as string);
    return selectedAction ? metadata(selectedAction) : { state: 'answered', value: question.type === 'number' ? Number(answer) : answer };
  };
  return {
    start({ resuming }) {
      if (signal.aborted) return;
      intro(styleText(['bgCyan', 'black', 'bold'], ` ${display(ui.command_name)} `));
      const accessible = clackSettings.accessible ?? Boolean(process.env.ACCESSIBLE && !['0', 'false'].includes(process.env.ACCESSIBLE));
      if (!resuming && !accessible) log.message(styleText('cyan', banner(kit, columns())));
      log.info(styleText('bold', wrap(resuming ? ui.welcome_back! : ui.tagline!, columns())));
      help();
    },
    finish(status) {
      if (status === 'completed') note(wrap(ui.next_steps!, columns()), ui.next_steps_title);
      outro(display(ui[status]));
    },
    isCancelled: () => signal.aborted,
    async ask(question) {
      if (signal.aborted) return CANCELLED;
      help();
      const id = String(question.id ?? question.ask);
      if (!asked.has(id)) asked.set(id, asked.size + 1);
      if (settings.directAnswers) section(sections?.find((item) => item.questions.includes(id))?.label ?? ui.section_details!);
      const message = settings.directAnswers
        ? display(ui.question_progress).replace('{number}', String(asked.get(id))).replace('{question}', display(question.ask))
        : display(question.ask);
      activeMessage = message;
      const allowed = (question.states_allowed ?? ['answered', 'deferred', 'not_applicable']) as string[];
      if (settings.directAnswers && allowed.includes('answered') && ['text', 'number', 'boolean', 'single_select'].includes(String(question.type))) return direct(question, allowed);
      const state = allowed.length === 1 ? allowed[0] : await select({ message: `${message}\n${ui.state}`, signal, maxItems,
        options: allowed.map((value) => ({ value, label: ui[value]! })) });
      if (cancelled(state)) return CANCELLED;
      if (state === 'deferred') {
        const owner = await text(ui.owner!);
        if (cancelled(owner)) return CANCELLED;
        const revisit = await text(ui.revisit!);
        if (cancelled(revisit)) return CANCELLED;
        return { state, owner, revisit_when: revisit };
      }
      if (state === 'not_applicable') {
        const reason = await text(ui.reason!);
        return cancelled(reason) ? CANCELLED : { state, reason };
      }
      let value: unknown;
      const options = (question.options ?? []) as unknown[];
      if (question.type === 'boolean') {
        value = await select({ message, signal, maxItems,
          options: [{ value: true, label: ui.yes! }, { value: false, label: ui.no! }] });
      } else if (question.type === 'single_select') {
        const index = await select({ message, signal, options: choices(options, question.option_labels as Record<string, unknown> | undefined), maxItems });
        if (cancelled(index)) return CANCELLED;
        value = options[index as number];
      } else if (question.type === 'multi_select') {
        const indices = await multiselect({ message, signal, options: choices(options, question.option_labels as Record<string, unknown> | undefined), required: false, maxItems });
        if (cancelled(indices)) return CANCELLED;
        value = (indices as number[]).map((index) => options[index]);
      } else if (question.type === 'rank_priorities') {
        const remaining = choices(options);
        const ranked: unknown[] = [];
        while (remaining.length > 0) {
          const index = await select({ message, signal, options: remaining, maxItems });
          if (cancelled(index)) return CANCELLED;
          ranked.push(options[index as number]);
          remaining.splice(remaining.findIndex((option) => option.value === index), 1);
        }
        value = ranked;
      } else {
        const answer = await promptText({ message: textMessage(message), signal, validate: (input) => {
          const invalid = validateText(input); if (invalid) return invalid;
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
      if (settings.directAnswers) section(ui.section_review!);
      const selected = await multiselect({ message: ui.review!, signal, required: false, maxItems,
        initialValues: proposals.map((proposal) => proposal.id),
        options: proposals.map((proposal) => ({ value: proposal.id,
          label: `${display(reviewLabels?.[proposal.id] ?? proposal.question.ask)}: ${choiceLabel(proposal.value, proposal.question, ui)}`,
          hint: [`${ui.source}: ${display(Object.hasOwn(ui, `source_${proposal.source}`) ? ui[`source_${proposal.source}`] : proposal.source)}`,
            display(proposal.why), proposal.verified ? `${ui.verified}: ${display(proposal.verified)}` : ''].filter(Boolean).join('. ') })) });
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
