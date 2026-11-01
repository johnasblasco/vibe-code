# CLI Contract

premortem --state <file> --project <existing-directory> --top <positive-integer> [--dry-run]

Defaults: local .scaffolder/state.json, current project directory, top 15. No TTY needed.
Read validated state, compute risks, load the installed template, resolve every placeholder
through bindings, then preview or create docs/risk-register.md. Existing files are never
overwritten. Required missing answers must be supplied through the interview first.

gates <gate-id> --state <file> [--deferrals <explicit-yaml-file>]

Course IDs are stage-0 through stage-11 from the golden path. Named gates come from loaded
modules and must apply to the project's current answers. Earlier course blockers accumulate.
Missing automatic/manual verifiers stay unverified. No external commands or course advancement.
An explicitly supplied deferral must match the requested gate and current check IDs. Nothing is
implicitly trusted from state progress. Safety stops and blocking contradictions remain blockers.

Named exits: success 0, input/IO error 1, usage 2, blocked gate 3, safety stop 4, interview cancel 130.
Invalid input diagnostics never echo arbitrary arguments, answer values, or raw exception text.
