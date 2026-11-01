import { runCli, EXIT } from './program.js';

// No raw exception messages: loader/IO errors can carry private input or local paths.
try { process.exitCode = await runCli(process.argv.slice(2)); }
catch { process.exitCode = EXIT.ERROR; }
