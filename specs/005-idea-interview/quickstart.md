# Idea Interview: Run and Verify

Read AGENTS.md first in each new session. From the repository root, with approved packages
already installed:

```powershell
npm.cmd run build
npm.cmd run scaffold -- --help
npm.cmd run scaffold -- init
# Resume after closing the terminal or pressing Ctrl+C:
npm.cmd run scaffold -- next
```

On macOS/Linux, use npm in place of npm.cmd. Run interview commands in an interactive terminal.
Answers are saved after validation to .scaffolder/state.json, ignored by Git. An existing file
is resumed, never reset. Use --state with an existing parent directory to choose another path.
Do not enter credentials. Text is masked; a rejected value is not echoed. Defer requires an
owner and revisit trigger; not applicable requires a reason. Concrete proposed defaults appear
together; deselect any to answer individually. No proposal is accepted before confirmation.

Only idea-stage questions are asked. Active contradictions show their YAML severity, message,
and fix. Stop rules halt the interview. This feature does not advance later stages or verify
gates, generate project files, or run external commands.

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:tooling
npm.cmd run test:dependencies
.venv/Scripts/python.exe -B tools/validate.py --today 2026-11-01 --strict
.venv/Scripts/python.exe -B tools/run_scenarios.py
.venv/Scripts/python.exe -B tools/test_expr.py
.venv/Scripts/python.exe -B tools/test_run_scenarios.py
.venv/Scripts/python.exe -B tools/test_validate_metadata.py
```

Final local results: 132 Vitest tests, five tooling tests, and two dependency checks passed.
Lint, typecheck, build, and help passed. All nine Python scenarios, 30 expression vectors plus
seven invalid expressions, the Windows-path regression, and two metadata checks passed.

Observed locally: adapter/CLI missing-module failures before implementation; the help-label
regression also failed before its fix. The full suite includes the unchanged nine persona
fixtures and shared expression vectors. The Python validator reports no structural errors or
gaps, with the existing optional asvs:webrtc tag and three unresolved tool-version warnings.
Those unresolved versions remain work for file generation; no values were invented.

Real PowerShell PTY check: answered user_accounts false, Ctrl+C at physical, CLI_EXIT=130.
Saved answer remained false and cursor physical; next resumed at physical and cancelled with
130 again. Non-TTY init returned 1 without creating default state. Help and the build ran.
Named exits: success 0, error 1, usage 2, blocked 3, stop 4, cancellation 130.

The user installed commander 15.0.0 and @clack/prompts 1.8.1 after approval and reported an audit
with zero vulnerabilities. The agent verified installed versions and lockfile checks; it did
not independently obtain a new registry audit. No staging changes or commits were made.
Hosted CI, macOS/Linux terminal behavior, and actual screen-reader usability remain unobserved.
