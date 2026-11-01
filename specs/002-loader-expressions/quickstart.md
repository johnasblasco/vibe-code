# Validation: Loader and Expressions

Read AGENTS.md first. The loader and expression modules are implemented and verified locally.
No interview, routing, persistence, or public CLI commands have been added.

## Checks

Run from the repository root, using the approved versions in package.json and package-lock.json:

```powershell
npm.cmd ci --ignore-scripts
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:tooling
.\.venv\Scripts\python.exe tools/validate.py --today 2026-11-01 --strict
.\.venv\Scripts\python.exe tools/run_scenarios.py
.\.venv\Scripts\python.exe tools/test_expr.py
.\.venv\Scripts\python.exe tools/test_run_scenarios.py
```

Use the actual current date for --today. On macOS/Linux, use npm and .venv/bin/python.
Installation approval for yaml 2.9.1 and @types/node 26.6.6 was obtained before their local
installation. No additional packages are needed for this feature.

## Actual Results on 2026-11-01

- Lint and typecheck: exit 0.
- Vitest: 5 files passed, 84 tests passed.
- Tooling checks: 5 passed, including deliberate nonzero lint/typecheck/assertion probes.
- Loader: all 42 authoritative YAML documents read with deterministic portable paths.
- Shared expressions: all 30 vectors and 7 parse-error cases loaded directly from unchanged YAML.
- Strict Python validator: passed, with the existing optional coverage and unresolved-version warnings.
- Python scenarios: 9/9 passed; Python expressions and the Windows-path regression passed.
- Source YAML, acceptance scenarios, vectors, budgets, and question IDs remain unchanged.

Test-first evidence is recorded in research.md. Malformed YAML, duplicate keys, unknown tags,
excessive aliases, non-mapping roots, missing paths, and traversal are tested. Symlink rejection
is exercised with mocked filesystem metadata; race-resistant reads and signed updates remain
part of later hardening work. Full domain-schema validation is not claimed by the loader.

## Dependency Advisory Review

The user supplied npm audit JSON: one minimatch advisory propagates through ten other lint-tool
packages. See ../../docs/dependency-audit.md for verified sources and the candidate override.
The new npm run test:dependencies guard currently fails on the installed affected version.
Installation approval and verification of the candidate remain pending. No findings are marked
resolved and no dependency upgrades or audit fix --force operations were performed.
Hosted CI and macOS/Linux execution remain unverified in this session. No staging changes or
commits were made by the agent.
