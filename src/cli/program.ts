import { Command, CommanderError } from 'commander';
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
  const kit = await loadKit(io.kitRoot ?? fileURLToPath(new URL('../../', import.meta.url)));
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
  try { await program.parseAsync(argv.length ? argv : ['--help'], { from: 'user' }); }
  catch (error) {
    if (error instanceof CommanderError) return error.code === 'commander.helpDisplayed' ? EXIT.SUCCESS : EXIT.USAGE;
    err(`${ui.error}\n`); return EXIT.ERROR;
  }
  return code;
}
