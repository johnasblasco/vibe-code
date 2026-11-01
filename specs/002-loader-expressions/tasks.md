# Tasks: Loader and Expressions

## Setup

- [x] T001 Read AGENTS.md and reference tools; record baseline in research.md.
- [x] T002 Verify yaml and Node typing package names and versions in research.md.
- [x] T003 Install approved dependencies and update package.json and package-lock.json.

## Expressions (US2; independent of filesystem dependency)

- [x] T004 [US2] Add tests/unit/expressions.test.ts and observe missing-module failure.
- [x] T005 [US2] Implement parser, evaluator, and identifier extraction in src/expressions/index.ts.
- [x] T006 [US2] Observe list-ordering regression failure and implement Python comparison parity in src/expressions/index.ts.

## Loader (US1)

- [x] T007 [US1] Add loader tests for real assets, malformed YAML, duplicate keys, tags, aliases, traversal, and missing paths in tests/unit/loader.test.ts; observe failure.
- [x] T008 [US1] Implement contained read-only discovery and YAML parsing in src/data/loader.ts and src/data/types.ts.

## Shared Conformance (US2)

- [x] T009 [US2] Load unchanged tests/expr-vectors.yaml in tests/unit/expr-vectors.test.ts.
- [x] T010 [US2] Parse and check identifiers for every expression in real YAML assets in tests/unit/loader.test.ts.

## Validation

- [x] T011 Run TypeScript and Python checks; preserve all acceptance files and budgets.
- [x] T012 Record real outputs and remaining limits in specs/002-loader-expressions/quickstart.md.

Dependencies: T003 was completed by the user's approved local installation.
Real-file inventory and expression source inspection can run concurrently, but tests precede edits.
Deliver expression core first, then loader and shared-vector integration. No commits authorized.

Dependency follow-up completed: the user's audit JSON traced the 11 findings to one minimatch
advisory. The approved 11.0.3 scoped override is installed, the lockfile and compatibility checks
pass, and the user's terminal reports zero vulnerabilities. See docs/dependency-audit.md for
evidence and limits. No forced fix, threshold change, staging change, or commit was made.
