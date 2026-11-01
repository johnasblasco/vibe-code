# Decision Engine Validation

Read AGENTS.md first. Run from the root with the already approved, locked dependencies.

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:tooling
npm.cmd run test:dependencies
.\.venv\Scripts\python.exe tools/validate.py --today 2026-11-01 --strict
.\.venv\Scripts\python.exe tools/run_scenarios.py
.\.venv\Scripts\python.exe tools/test_expr.py
```

Use the current date for --today. On macOS/Linux, use npm and .venv/bin/python.
To see individual TypeScript persona results without downloading a test runner:

```powershell
node node_modules/vitest/vitest.mjs run tests/unit/engine-scenarios.test.ts --reporter=verbose
```

Test-first runs failed on the missing engine module. All nine unchanged personas then passed.
Seven additional engine tests cover stage isolation, all depths, hardware floors, stop queues,
immutability/recomputation, errors, protected questions, and false recommended defaults.

Exact reference comparison also passed for all nine personas: ordered files/questions/depths,
stage groups, gates, visible flags, applicable failures, contradictions, stops, and tier.
That check used the Python reference functions to generate ignored local oracle data and the
compiled TypeScript engine to compare results; Python is not an application runtime dependency.

No dependency installation, new CLI commands, state, output generation, live gate checks,
staging changes, or commits are included. Hosted CI and other platforms remain unrun locally.
Existing optional coverage and unresolved version-pack warnings remain visible.

Final results on Windows: lint and typecheck passed; 100 Vitest tests across 7 files passed;
5 tooling checks and 2 dependency checks passed. Strict Python validation, 9/9 Python scenarios,
and all shared Python expression cases passed. git diff --check passed. Original source YAML,
acceptance files, and budgets are unchanged. All eight feature tasks are complete.
