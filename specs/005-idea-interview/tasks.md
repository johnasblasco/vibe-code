# Tasks: Idea-Stage Interview

## Setup

- [x] T001 Read AGENTS.md and reference data; run the Python baseline.
- [x] T002 Verify commander 15.0.0 and @clack/prompts 1.8.1 in official sources; request approval.
- [x] T003 Install approved packages and review package.json/package-lock.json changes.

## Interview Core (US1)

- [x] T004 [US1] Write tests/unit/interview.test.ts and observe missing-module failure.
- [x] T005 [US1] Implement idea-only routing, awaited persistence, invalid retries, and resume in src/interview/index.ts.
- [x] T006 [US1] Reproduce and fix persistence of new-question cursors in src/interview/index.ts.

## Defaults and Cancellation (US2/US3)

- [x] T007 [US2] Implement explicit batch proposals/review and individual edits in src/interview/index.ts.
- [x] T008 [US3] Test cancellation, saved-answer preservation, contradiction display, and stop enforcement in tests/unit/interview.test.ts.
- [x] T009 [US3] Add adapter tests first, then Clack rendering/cancellation in src/interview/clack.ts with beginner-course/interview-ui.yaml text.
- [x] T010 [US1] Add CLI tests first, then Commander entry point in src/cli/main.ts and build/run commands.

## Verification

- [x] T011 Run full checks including real adapter/CLI checks; update quickstart.md without staging or commits.

The user completed T003; exact installed versions were verified with npm ls.
Read-only source research can run in parallel; failing tests precede implementation edits.
