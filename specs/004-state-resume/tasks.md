# Tasks: State File and Resume

## Setup

- [x] T001 Read state/threat requirements and run the Python baseline.
- [x] T002 Record approved initial version in question-bank/manifest.yaml.

## Answer Persistence (US1)

- [x] T003 [US1] Add tests/unit/state.test.ts and observe missing-module failure.
- [x] T004 [US1] Implement answer validation, privacy checks, and persistence in src/state/index.ts.
- [x] T005 [US1] Reproduce failed-open cleanup and unrelated-file replacement regressions; protect owned temp files and existing data in src/state/index.ts.

## Resume (US2)

- [x] T006 [US2] Verify cursor roundtrip, corrupt state, symlink refusal, saved false values, and gate-claim rejection in tests/unit/state.test.ts and tests/unit/state-io.test.ts.
- [x] T007 [US2] Recompute decision/environment and pending questions/flags in src/state/index.ts.

## Bank Drift (US3)

- [x] T008 [US3] Verify new/retired questions and changed options in tests/unit/state.test.ts.
- [x] T009 [US3] Reproduce and fix removed pack-affect links in src/state/index.ts.

## Verification

- [x] T010 Run all checks, update quickstart.md, and review changes without staging or commits.

Setup precedes persistence; resume and drift share validated snapshots. Read-only baseline checks
can run concurrently; test-first mutations remain sequential. No additional packages needed.
