# Gates and Pre-mortem Validation

Read AGENTS.md first in each session. Approved packages must already be installed.
Use npm in place of npm.cmd on macOS/Linux.

```powershell
npm.cmd run build
npm.cmd run scaffold -- --help
npm.cmd run scaffold -- premortem --help
npm.cmd run scaffold -- gates --help
# After saving project.name through the interview:
npm.cmd run scaffold -- premortem --dry-run
npm.cmd run scaffold -- premortem
npm.cmd run scaffold -- gates stage-1
```

premortem creates docs/risk-register.md in the current project, or the existing directory
selected with --project. It refuses to overwrite the file. Review open rows and fill an owner
and revisit trigger, or a written acceptance reason. Read evidence/source and unverified-card
columns; recorded answers do not establish prevention. Use --top to change displayed rows only.

gates currently returns 3 for unverified checks. Runners arrive with doctor; no prose is executed
and no later course stage is advanced. Manual evidence is distinct from automatic verification.
Named hardware gates also need current answers and fresh review. A safety stop returns 4.

To explicitly defer checks for one invocation, write a local YAML file using IDs shown by gates:

```yaml
schema: gate-deferrals/v1
gate: stage-1
checks:
  env.install_tools/0:
    owner: Builder
    reason: Waiting for installation
    revisit_when: Before development
```

Run gates stage-1 --deferrals <that-file>. Every outstanding check still needs its own result
or deferral; this example defers only one. Without the explicit option, no deferrals are read.
Never put credentials in the file. Deferrals never override safety stops or block contradictions.

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

Observed on Windows: 161 tests across 16 Vitest files passed, plus five tooling tests and two
dependency checks. Lint, typecheck, build, and command help passed. Strict Python validation,
all nine personas, 30 expression vectors plus seven invalid expressions, the Windows-path
regression, and two bank-metadata checks passed. The validator retains its existing optional
asvs:webrtc gap and unresolved postgres, Redis/Valkey, and gitleaks version warnings; none were
silently filled. These are still release blockers to resolve during file generation.

The compiled CLI previewed and created a three-row register for the plant-waterer acceptance
fixture: 50 applicable risks, 22 researched, 28 practice. Preview/write returned 0. Repeating
creation returned 1 and preserved the existing report. An unverified stage-1 gate returned 3.
The generated demo is .tooling-build/feature6-project/docs/risk-register.md (ignored by Git).
No real project answers or credentials were supplied to that demo.

Spec Kit requirements checklist: 16/16 passed. The empty/missing gate scenarios failed before
the guard fix and now pass; failure-mode AI-09 records the cause. The nine persona expectations
and budgets are unchanged. No packages were installed and the agent made no staging or commits.
No fresh registry audit was obtained; the earlier zero-vulnerability result came from the user.
Hosted CI and other operating systems cannot be claimed from local Windows execution.
Directory-swap attacks need later hardening; filesystems without hard links fail publication.
