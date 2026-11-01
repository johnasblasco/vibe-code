---
name: scaffolder-builder
description: Build, extend, or debug the guided project-setup CLI (the scaffolder) in this repo. Use whenever the user mentions the scaffolder, scaffold CLI, setup wizard, question bank engine, tiers, router, golden path, doctor, coverage command, resume or state file, or generating AGENTS.md, CLAUDE.md, a Spec Kit constitution, or project skills from answers. Use it even if they only say "continue the CLI" or "add a command".
---

# Scaffolder builder

The product is a CLI that interviews a (often beginner) user, decides a compatible stack, teaches and verifies setup steps, and writes the files and instructions an AI agent needs. The questions, steps, and facts are data in YAML; the code is a thin engine that loads, evaluates, verifies, and writes.

## Before you change anything
1. Read `README.md`, then `references/architecture.md`.
2. Run the three checks and know the baseline: `python tools/validate.py --today <today>`, `python tools/run_scenarios.py`, `python tools/test_expr.py`.
3. The scenarios in `tests/scenarios/` are the acceptance tests for the decision engine. Port the engine so they pass against your code, not just the Python reference.

## Working rules
- Keep content in YAML, logic in code. If you are about to hardcode a question, price, limit, or date, put it in `question-bank/`, `beginner-course/`, or `knowledge-packs/` instead. Facts go stale; code releases are slow.
- Stack: TypeScript on Node, ESM, `commander` for commands, `@clack/prompts` for the interview. Handle Ctrl+C on every prompt, use named exit codes, and make every dangerous action need a typed confirmation and a dry-run.
- Persist progress in a state file after every answered question so a closed terminal loses nothing.
- Three answer states only: answered, deferred (owner plus revisit trigger), not applicable (reason). Never allow a silent skip.
- Gates block later steps; the engine must refuse to advance until verify passes or the user defers with a reason.
- Verification is the product for beginners. Prefer an automated check over asking "did it work?".
- Ask questions when they matter: every module has a `stage` (idea, plan, design, build, production, prelaunch, operate). Never front-load the whole interview. Budgets are in the scenario tests.
- Generate files only through `outputs/bindings.yaml`. Never write a guessed value, and never leave a `{{placeholder}}` in output.
- Expressions use the grammar in `specs/expressions.md`. Never use `eval`.
- Tiers are cumulative. Router flags decide what loads (see `question-bank/00-router.yaml`).
- Treat the CLI as a supply-chain target: it runs shell commands and writes files. Pin dependencies, scan them, never run commands built from unvalidated input.
- CLI startup verifies runtime assets against integrity/assets.json and rendering uses that verified snapshot. After intentional asset edits, review the actual source diff before explicitly refreshing the inventory with node tools/update-integrity.mjs --write. Never refresh hashes to hide unexpected changes. This checksum reference depends on a trusted checkout; it is not a signed release or permission to add remote updates.

## Build order
1. Loader and validator (port `tools/validate.py`).
2. Router, state file, resume.
3. Interview runner for one narrow path (stages 0 to 5).
4. Verify runners (`doctor`, secret-block test, URL check, database round trip, row-access test).
5. Output writers (AGENTS.md, decisions log, constitution, project skills).
6. `coverage`, `update`, `audit`.
7. Hardware modules and gates.

## Security of the tool itself
Read `docs/07-threat-model-cli.md` before adding anything that runs commands, downloads data, installs hooks, or shares diagnostics. Never build a shell command from an answer by string concatenation. Redact before showing or copying diagnostics.

## Done means
Validator passes, new behavior has a test, and the user can read the result in plain language. Report gaps you did not close.
