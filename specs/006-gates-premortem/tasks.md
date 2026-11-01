# Tasks: Gates and Pre-mortem

Input: spec.md, plan.md, research.md, data-model.md, contracts/cli.md.

## Setup and Foundation

- [x] T001 Read AGENTS.md and relevant source/skills; run the three Python baseline checks.
- [x] T002 Document scope and contracts in specs/006-gates-premortem/ and preserve staged user changes.

## US1: Gate Enforcement

- [x] T003 [US1] Write tests/unit/gates.test.ts and observe missing-module failure.
- [x] T004 [US1] Implement course/named gates and fresh verifier contract in src/gates/index.ts.
- [x] T005 [US1] Validate deferrals with exactly nonempty owner/reason/revisit_when in src/gates/index.ts.
- [x] T006 [US1] Reproduce malformed-bank grants in tests/security-scenarios/gate-integrity.yaml; reject missing cards/empty groups and expand failure-modes AI-09.
- [x] T007 [US1] Add source-backed rendering and explicit deferrals input in src/gates/render.ts and beginner-course/gates-ui.yaml.

Independent test: unknown/unverified/failed gates block, fresh results rerun, stops cannot be bypassed.

## US2: Ranked Pre-mortem

- [x] T008 [US2] Write tests/unit/premortem.test.ts against all nine Python persona outputs; observe missing-module failure.
- [x] T009 [US2] Implement ranking, current question coverage, evidence counts, and Markdown table in src/premortem/index.ts and beginner-course/premortem-ui.yaml.

Independent test: exact reference IDs/scores, totals preserved with limits, no automatic prevented status.

## US3: Risk Register

- [x] T010 [US3] Write tests/unit/risk-output.test.ts for bindings, preview, no-overwrite, links, and concurrent publication; observe initial failure.
- [x] T011 [US3] Implement bound template rendering and create-only publication in src/outputs/risk-register.ts.
- [x] T012 [US3] Write tests/unit/gates-premortem-cli.test.ts; observe command-registration failures.
- [x] T013 [US3] Register noninteractive gates/premortem commands in src/cli/program.ts with YAML help/errors.

Independent test: dry run writes nothing; complete output has no placeholder and preserves existing edits.

## Final Verification

- [x] T014 Run full TypeScript, Python, tooling, dependency, build/help, and actual CLI checks; record results in quickstart.md.
- [x] T015 Review final diff, finish README/spec/tasks documentation, and confirm no staging or commits.

## Dependencies and Execution

Setup precedes implementation. US1 and US2 are independent; US3 uses US2 and CLI gate integration
uses US1. Failing tests precede each slice. Independent read-only source/check commands can run
in parallel; edits and adaptive fixes stay sequential. Ship the gate/risk core first, then output
and commands, then regressions/checks. No extra agent or package is needed.
