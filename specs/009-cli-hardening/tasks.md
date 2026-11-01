# Tasks: CLI Hardening

## Setup and Foundation

- [x] T001 Read AGENTS.md, skills, threat model and constitution; establish Python baseline.
- [x] T002 Create specs/009-cli-hardening/ design artifacts and review the requirements checklist.

## US1: Asset Integrity

- [x] T003 [US1] Add tests/unit/asset-integrity.test.ts and observe altered-asset CLI failure.
- [x] T004 [US1] Implement src/security/integrity.ts and tools/update-integrity.mjs with strict complete inventory validation.
- [x] T005 [US1] Route src/cli/program.ts and output template reads through the verified snapshot; retain raw parsing API.
- [x] T006 [US1] Exercise missing/extra/linked/malformed assets, CRLF and post-check replacement in tests/unit/asset-integrity.test.ts.

## US2: Input and Execution Boundaries

- [x] T007 [US2] Add failing synthetic credential regressions in tests/unit/hardening.test.ts; fix src/state/index.ts without echoing input.
- [x] T008 [US2] Test malicious names, planted README, wrong commit and unavailable dangerous features in tests/unit/hardening.test.ts.
- [x] T009 [US2] Record real failures/preventions in failure-modes/ and tests/security-scenarios/cli-hardening.yaml without changing persona expectations.

## US3: Repeatable Review Evidence

- [x] T010 [US3] Write tests/tooling/security.node.test.mjs before wiring the required npm/CI security policy command.
- [x] T011 [US3] Add docs/08-cli-hardening-review.md with code and test evidence for all 11 threats and release-only gaps.

## Verification and Polish

- [x] T012 Review inventory changes, generate integrity/assets.json, and run full TypeScript/tooling/Python checks.
- [x] T013 Exercise compiled CLI help/dry-run and a disposable corrupted kit; record real output in quickstart.md.
- [x] T014 Update README/spec/tasks, check hooks/diff and report limits without staging or commits.
- [x] T015 Address observed interview timeouts with tests/unit/proposal-validation.test.ts and candidate-only eligibility in src/interview/index.ts; retain full acceptance validation in src/state/index.ts and every original timeout/assertion/budget.

## Dependencies and Independent Work

Setup precedes all slices. T003 before T004/T005; T006 closes US1. T007 precedes its fix.
US2 tests may be read independently of inventory implementation; edits remain sequential.
US3 evidence is completed after both slices. Each code change needs observed red then green.
No expectation, budget or source question ID changes. Read-only policy/evidence checks can
run concurrently; the research agent is read-only as requested by the Spec Kit planning skill.
