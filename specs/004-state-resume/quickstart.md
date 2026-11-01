# State File and Resume Validation

Read AGENTS.md first. No new packages are needed.

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:tooling
npm.cmd run test:dependencies
.\.venv\Scripts\python.exe tools/validate.py --today 2026-11-01 --strict
.\.venv\Scripts\python.exe tools/run_scenarios.py
.\.venv\Scripts\python.exe tools/test_expr.py
.\.venv\Scripts\python.exe tools/test_validate_metadata.py
```

Use today's date for --today. On macOS/Linux use npm and .venv/bin/python.
The state tests create their own OS temporary directories and use synthetic credential markers.
They never read production systems or user credential files.

Bank version now comes from question-bank/manifest.yaml, initially 1.0.0. Stored JSON contains
answers, their three states, cursor progress, originating bank version, and update snapshots.
The caller chooses the state path and creates its parent. Existing unrelated/corrupt files
are not overwritten automatically. Internal state is not a generated project template.

Resume reports changes without silently migrating snapshots or accepting new defaults. Live
gate verification remains mandatory. Secret detection is heuristic; cross-process locking,
filesystem race protection, and the later CLI prompts are outside this task.

No source questions, existing acceptance scenarios, or budgets were changed. The new metadata
file increases the loaded authoritative file inventory from 42 to 43 without adding questions.
No staging changes or commits are authorized. Hosted CI remains unverified in this session.

Local verification: 115 Vitest tests across 9 files passed, including 15 state tests. Lint,
typecheck, 5 tooling checks, 2 dependency checks, the strict validator, 9/9 Python scenarios,
shared expression checks, and 2 manifest validation tests passed. All ten feature tasks are done.
