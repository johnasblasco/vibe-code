# Tasks: Project Skeleton

## Phase 1: Setup

- [x] T001 Record approved package versions in specs/001-project-skeleton/research.md.
- [x] T002 Create local environment exclusions in .gitignore.
- [ ] T003 Install approved PyYAML in .venv/ and record Python baseline results.

## Phase 2: Foundation

- [x] T004 Verify action hashes and runtime release in specs/001-project-skeleton/research.md.

## Phase 3: Local Checks (US1)

- [x] T005 [US1] Write tests/tooling/skeleton.node.test.mjs and observe missing-package failure.
- [ ] T006 [US1] Add package.json with approved exact dependencies and install without scripts.
- [ ] T007 [US1] Add lint and typecheck configurations and src/index.ts module boundary.
- [ ] T008 [US1] Add Vitest module smoke test in tests/unit/module.test.ts and verify failure first.
- [ ] T009 [US1] Prove lint, typecheck, and test failures with isolated temporary fixtures.

## Phase 4: CI (US2)

- [x] T010 [US2] Observe missing-workflow failure in tests/tooling/skeleton.node.test.mjs.
- [ ] T011 [US2] Add .github/workflows/ci.yml with verified full action hashes.

## Phase 5: Validation

- [ ] T012 Document setup and actual results in specs/001-project-skeleton/quickstart.md.
- [ ] T013 Run all checks and review the final diff; leave changes unstaged and uncommitted.

Dependencies: setup and source verification precede US1; US2 reuses its local commands.
Read-only runtime and action lookups can run concurrently. Implementation and test-first steps
remain sequential. Deliver US1 first, then US2; do not begin loader features in this task.

Blockers: approved PyYAML installation could not resolve a distribution from this environment;
npm installation failed with EACCES fetching registry.npmjs.org. T006 has a manifest and
install-script policy, but no successful installation or lockfile. Do not mark it complete.
