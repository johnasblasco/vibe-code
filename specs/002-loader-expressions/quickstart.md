# Current Validation: Loader and Expressions

Read AGENTS.md first. This feature is incomplete: only the expression core is implemented.

## Available Checks

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:tooling
.\.venv\Scripts\python.exe tools/validate.py --today 2026-11-01 --strict
.\.venv\Scripts\python.exe tools/run_scenarios.py
.\.venv\Scripts\python.exe tools/test_expr.py
```

Use the actual current date for --today. On macOS/Linux, use npm and .venv/bin/python.

Observed test-first failures: missing expression module, then unsupported Python list ordering.
After implementation, all 25 supplemental expression tests passed, with lint and typecheck.

Because yaml is unavailable to Node, shared conformance was also checked independently:
TypeScript compiled src/expressions/index.ts into ignored .tooling-build/; Python's already
installed PyYAML read tests/expr-vectors.yaml and passed JSON through stdin to a Node process
that imported the compiled TypeScript evaluator. All 30 vectors and 7 parse-error cases passed.
No vector content was copied into application code or modified. This temporary verification
does not replace the planned committed Vitest shared-vector suite or add a Python runtime
dependency to the application.

## Pending Dependencies

yaml@2.9.1 was approved, but installation failed with EACCES reaching registry.npmjs.org.
@types/node@26.6.6 was verified against official npm data and submitted for approval.
The loader, real-data inventory checks, and committed direct YAML vector suite remain pending.
No commits or staging are authorized.
