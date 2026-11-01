# Core Contract

interview(kit, initialState, port, save) asynchronously returns the resulting state and status.
The state must be at idea stage. Before asking a new bank question, add its definition snapshot
and persist the cursor. Accepted values pass through state validation before awaiting save.
Invalid values produce a generic event and retry; values are not printed in core errors.

Router ask_when and module load_when are recomputed after each save. Existing unchanged answered,
deferred, and not-applicable records are not re-asked. Current profile/default proposals are
shown together. Selected proposals are saved individually; unselected ones require explicit edits.
If edits change applicability, only currently pending questions remain in the action queue.

The core makes no terminal or process calls. The Clack adapter maps cancellation at every prompt
and passes an AbortSignal to Clack. Free-text answers and deferral metadata are masked. Commander
exposes init/next and --state; init resumes existing state without resetting it, next requires
an existing state, and interactive commands reject non-TTY input. Help works without a TTY.
The default state directory is created only for init; explicitly selected parents must exist.

Named exit codes: SUCCESS 0, ERROR 1, USAGE 2, BLOCKED 3, STOP 4, CANCELLED 130.
The SIGINT listener is removed in finally; saves are awaited rather than aborted by process.exit.
Diagnostics never echo invalid answers, unknown arguments, or raw IO exceptions.
