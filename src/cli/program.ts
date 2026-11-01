import { Command, CommanderError, InvalidArgumentError } from 'commander';
import { lstat, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadKit } from '../data/loader.js';
import type { LoadedKit } from '../data/types.js';
import { createState, loadState, saveState } from '../state/index.js';
import { interview } from '../interview/index.js';
import type { InterviewPort } from '../interview/index.js';
import { createClackPort } from '../interview/clack.js';
import { interfaceText } from '../interview/ui.js';
import { premortem, RiskError } from '../premortem/index.js';
import { readRiskTemplate, renderRiskRegister, writeRiskRegister } from '../outputs/risk-register.js';
import { evaluateGate, GateError } from '../gates/index.js';
import { readDeferrals, renderGate } from '../gates/render.js';

export const EXIT = { SUCCESS: 0, ERROR: 1, USAGE: 2, BLOCKED: 3, STOP: 4, CANCELLED: 130 } as const;
interface CliIO {
  kitRoot?: string; tty?: boolean; out?: (text: string) => void; err?: (text: string) => void;
  portFactory?: (kit: LoadedKit, signal: AbortSignal) => InterviewPort;
}
async function exists(path: string): Promise<boolean> {
  try { await lstat(path); return true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; }
}

export async function runCli(argv: string[], io: CliIO = {}): Promise<number> {
  const kitRoot = io.kitRoot ?? fileURLToPath(new URL('../../', import.meta.url));
  const kit = await loadKit(kitRoot);
  const ui = interfaceText(kit);
  const out = io.out ?? ((text: string) => { process.stdout.write(text); });
  const err = io.err ?? ((text: string) => { process.stderr.write(text); });
  const program = new Command().name('scaffold').description(ui.title!).exitOverride()
    .helpOption('-h, --help', ui.help!).addHelpCommand(false)
    .configureHelp({ formatHelp: (command, helper) => {
      const sections = [`${ui.usage}: ${helper.commandUsage(command)}`, helper.commandDescription(command)];
      const options = helper.visibleOptions(command);
      if (options.length) sections.push(`${ui.options}:\n` + options.map((option) =>
        `  ${helper.optionTerm(option)}  ${helper.optionDescription(option)}`).join('\n'));
      const commands = helper.visibleCommands(command);
      if (commands.length) sections.push(`${ui.commands}:\n` + commands.map((child) =>
        `  ${helper.subcommandTerm(child)}  ${helper.subcommandDescription(child)}`).join('\n'));
      return sections.filter(Boolean).join('\n\n') + '\n';
    } })
    .configureOutput({ writeOut: out, writeErr: err, outputError: (_text, write) => write(`${ui.usage_error}\n`) });
  let code: number = EXIT.SUCCESS;
  for (const name of ['init', 'next']) {
    program.command(name).description(ui[name]!).option('--state <path>', ui.state_option!)
      .action(async (options: { state?: string }) => {
        if (!(io.tty ?? Boolean(process.stdin.isTTY && process.stdout.isTTY))) {
          err(`${ui.terminal_required}\n`); code = EXIT.ERROR; return;
        }
        const path = resolve(options.state ?? '.scaffolder/state.json');
        const present = await exists(path);
        if (!present && name === 'next') { err(`${ui.missing_state}\n`); code = EXIT.ERROR; return; }
        const state = present ? await loadState(path) : createState(kit);
        if (!present && options.state === undefined && !await exists(dirname(path))) await mkdir(dirname(path));
        const controller = new AbortController();
        const cancel = () => { controller.abort(); };
        process.on('SIGINT', cancel);
        try {
          const port = (io.portFactory ?? createClackPort)(kit, controller.signal);
          const result = await interview(kit, state, port, (next) => saveState(path, next));
          code = result.status === 'cancelled' ? EXIT.CANCELLED : result.status === 'blocked' ? EXIT.BLOCKED
            : result.status === 'stop' ? EXIT.STOP : EXIT.SUCCESS;
          out(`${ui[result.status]}\n`);
        } finally { process.removeListener('SIGINT', cancel); }
      });
  }
  program.command('premortem').description(ui.premortem!)
    .option('--state <path>', ui.state_option!, '.scaffolder/state.json')
    .option('--project <directory>', ui.project_option!, '.')
    .option('--top <count>', ui.top_option!, (value: string) => {
      const number = Number(value);
      if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(number)) throw new InvalidArgumentError(ui.invalid_top!);
      return number;
    }, 15)
    .option('--dry-run', ui.dry_run_option!)
    .action(async (options: { state: string; project: string; top: number; dryRun?: boolean }) => {
      const state = await loadState(resolve(options.state));
      const report = premortem(kit, state, { top: options.top });
      const text = renderRiskRegister(kit, state, report, await readRiskTemplate(kitRoot));
      await writeRiskRegister(resolve(options.project), text, { dryRun: options.dryRun ?? false });
      out(options.dryRun ? text : `${ui.risk_written}\n`);
    });
  program.command('gates').description(ui.gates!).argument('<gate>', ui.gate_argument!)
    .option('--state <path>', ui.state_option!, '.scaffolder/state.json')
    .option('--deferrals <path>', ui.deferrals_option!)
    .action(async (id: string, options: { state: string; deferrals?: string }) => {
      const state = await loadState(resolve(options.state));
      const deferrals = options.deferrals ? await readDeferrals(options.deferrals, id) : {};
      const gate = await evaluateGate(kit, state, id, { deferrals });
      out(renderGate(kit, gate));
      code = gate.stop ? EXIT.STOP : gate.allowed ? EXIT.SUCCESS : EXIT.BLOCKED;
    });
  try { await program.parseAsync(argv.length ? argv : ['--help'], { from: 'user' }); }
  catch (error) {
    if (error instanceof CommanderError) return error.code === 'commander.helpDisplayed' ? EXIT.SUCCESS : EXIT.USAGE;
    if (error instanceof RiskError) { err(`${ui.risk_error}\n`); return EXIT.ERROR; }
    if (error instanceof GateError) { err(`${ui.gate_error}\n`); return EXIT.ERROR; }
    err(`${ui.error}\n`); return EXIT.ERROR;
  }
  return code;
}
