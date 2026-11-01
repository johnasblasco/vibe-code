# File Generation: Run and Verify

Read AGENTS.md first in each session. Dependencies are already approved and installed.
Use npm in place of npm.cmd on macOS/Linux. Run init once to create a valid saved state first.

```powershell
npm.cmd run build
npm.cmd run vibecode -- generate --help
node --input-type=module -e "import {mkdir} from 'node:fs/promises'; await mkdir('.tooling-build/generation-demo', {recursive:true});"
# Preview CI and its provenance record using dated verified pack pins:
npm.cmd run vibecode -- generate --file ci --offline --project .tooling-build/generation-demo
# Preview all applicable templates and ask for missing bound answers:
npm.cmd run vibecode -- generate --project .tooling-build/generation-demo
# In a terminal, review and type generate before writing:
npm.cmd run vibecode -- generate --file ci --offline --project .tooling-build/generation-demo --write
```

The state defaults to .scaffolder/state.json. Use --state to select another valid saved state.
Preview is the default; --dry-run is also supported. Missing answers require an interactive
terminal; accepted answers are saved even during a preview. Deferred/not-applicable items
cannot be replaced with guessed values. SECURITY.md needs a reporting email or HTTPS URL;
never enter credentials. No hooks or packages are installed, and no project commands run.

Inspect docs/decisions/0001-scaffolder-generation.md for exact pins, sources, verification dates,
and live/pack mode. --offline uses dated pins and makes no requests. Unsupported/malformed,
future-dated, or stale fallbacks reject; container prereleases are excluded. Action/hook
revisions are full hashes. Containers use exact stable tags; digest pinning is not claimed.

Existing output is never overwritten, including an existing generation record. Select a fresh
directory or preserve/review existing files yourself before retrying. If IO fails mid-batch,
completed files are reported and preserved. Earlier directories can remain after failed IO.
Directory-swap attacks need later hardening. No general update/overwrite workflow is provided.

The CI scanner resolver emits its documented explanatory comment because this generator has
not installed or verified a CI scanner. The pinned pre-commit configuration is not an installed
hook. Doctor/course work must establish the actual checks before handling real credentials.

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:tooling
npm.cmd run test:dependencies
.venv/Scripts/python.exe -B tools/validate.py --today 2026-11-01 --strict
.venv/Scripts/python.exe -B tools/run_scenarios.py
.venv/Scripts/python.exe -B tools/test_expr.py
```

Observed local checks: lint, typecheck, build, help, five tooling tests, two dependency checks,
strict Python validation, all nine personas, 30 expression vectors plus seven error cases,
the Windows-path regression, and two metadata tests passed. The validator now has no unresolved
tool-pin warnings; optional asvs:webrtc remains uncovered as before. Existing persona budgets
and expectations are unchanged. The closing run passed 188 tests across 21 Vitest files.

Actual compiled CLI: a CI preview returned 0 and left its target directory empty. This runtime
attempt used dated pack fallback; it did not establish successful live API access. Pins were
separately browser-verified from the official sources in research.md. A real PowerShell PTY
Ctrl+C at write confirmation returned 130 and left the target empty. A second invocation with
typed generate returned 0 and created the previewed .gitignore plus generation record. A later
attempt returned 1 without overwriting them. Demo artifacts are under .tooling-build/feature7-*.

Missing-module and command-registration failures were observed before implementation. The
cancellation/network-layer/help regressions failed before their fixes. No package install,
staging change, or commit was made by the agent. No new registry audit was obtained. Hosted CI,
other OS terminals, actual hooks, containers, and production behavior remain unverified.
