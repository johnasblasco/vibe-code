# Project Skeleton Validation

Read AGENTS.md first. Run commands from the repository root. Package installation requires
user approval; the five direct npm packages and PyYAML 6.0.3 were approved for this feature.

## Prerequisites

Node 26.13.0, Python 3.14.6, and Git. Direct dependencies are pinned in package.json and the
resolved graph is in package-lock.json. No install lifecycle scripts are enabled.

## Setup

Windows PowerShell (no activation or execution-policy change needed):

```powershell
npm.cmd ci --ignore-scripts
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install PyYAML==6.0.3
```

macOS or Linux:

```sh
npm ci --ignore-scripts
python3 -m venv .venv
.venv/bin/python -m pip install PyYAML==6.0.3
```

## Local Checks

Windows:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:tooling
.\.venv\Scripts\python.exe tools/validate.py --today 2026-11-01 --strict
.\.venv\Scripts\python.exe tools/run_scenarios.py
.\.venv\Scripts\python.exe tools/test_expr.py
.\.venv\Scripts\python.exe tools/test_run_scenarios.py
```

Use today's ISO date for --today; 2026-11-01 is the recorded validation date. On macOS/Linux,
use npm instead of npm.cmd and .venv/bin/python instead of the Windows environment executable.
Each command must return zero. Do not infer that later commands passed from the final shell
exit status of a group; check each result.

The skeleton contains one ESM module smoke test and five tooling checks. The tooling suite
runs deliberately invalid lint input, a type-error fixture, and a failing Vitest assertion and
requires each real tool to reject it. The fixtures are excluded from normal lint/typecheck/test
discovery and run only through the tooling verification suite. No application features exist.

## CI and Limits

.github/workflows/ci.yml runs the same checks on Windows, macOS, and Linux. Every action is
pinned to a verified full commit hash. Source links and lookup dates are in research.md.
The workflow uses empty default permissions, read-only checkout, and no persisted credentials.

The Python path regression initially reproduced eight scenario failures on Windows. Normalizing
module identifiers in tools/run_scenarios.py restored all nine scenarios without changing their
expectations. tools/test_run_scenarios.py protects this behavior.

The validator reports an optional uncovered asvs:webrtc tag and three intentionally unresolved
pack fields: postgres.image_tag, redis_or_valkey.image_tag, and gitleaks.rev. These must be
resolved by future file-generation work and are not silently supplied by this skeleton.

Local audit attempt: npm audit could not reach its registry advisory endpoint. No clean audit
is claimed. CI includes npm audit --audit-level=high and must pass it before release.
Hosted CI, macOS, and Linux have not been executed in this session; only local Windows results
are available. No packages beyond the approved set were added as direct dependencies.
