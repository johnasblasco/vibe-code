# Idea-Stage Interview

Created: 2026-11-01. Status: in progress.

US1 (P1): A beginner answers visible router flags and idea-stage questions through Clack prompts.
No plan/build/hardware-design questions are asked early. Recompute applicability after each answer.
Persist each accepted answer and progress; resume without re-asking unchanged recorded answers.

US2 (P1): Show applicable recommended defaults in one review screen, with source/reason/date.
Accept or individually edit them; do not accept defaults before review, overwrite existing
answers, or save unresolved pick_for_me/auto_detect values as concrete recommendations.

US3 (P1): Ctrl+C returns a named cancellation exit code and preserves previous answers. Display
active contradiction severity/message/fix from YAML and halt on stop rules immediately.

All teaching/interface text stays in YAML. The CLI uses commander and the adapter uses
@clack/prompts; both exact packages require approval before installation. Tests exercise a
prompt-independent interview core plus adapter/CLI behavior when dependencies are available.
No generated project files, live gate passage, external commands, telemetry, staging, or commits.
Existing state files and source assets must not be silently reset. Interrupted/invalid input
must never save a partial answer or expose it in errors. No production systems are used.
