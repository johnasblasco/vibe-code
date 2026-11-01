# Feature Specification: Project Skeleton

**Feature Branch**: Existing branch retained; no branch or commit operations authorized.
**Created**: 2026-11-01
**Status**: Implemented locally; hosted CI and dependency audit unverified
**Input**: Create the TypeScript project skeleton with lint, typecheck, and test commands,
and a CI file with every action pinned to a full commit hash. No features yet.

## User Scenarios & Testing

### User Story 1 - Check changes locally (Priority: P1)

A contributor can run separate checks for code quality, type errors, and test failures
from the project root before working on the engine.

**Why this priority**: Later features need a reliable way to demonstrate failing and passing tests.

**Independent Test**: Run each documented check in a clean local checkout after approved setup.

**Acceptance Scenarios**:

1. **Given** approved dependencies are installed, **When** the contributor runs each check,
   **Then** the unchanged skeleton passes and each command exits without watch mode.
2. **Given** an isolated type-error fixture, **When** the type check runs against it,
   **Then** the check fails with a nonzero exit status and a diagnostic.
3. **Given** an isolated lint-error fixture, **When** the lint check runs against it,
   **Then** the check fails with a nonzero exit status and a diagnostic.
4. **Given** an isolated failing-test fixture, **When** the test runner executes it,
   **Then** it reports failure and exits nonzero.

### User Story 2 - Check changes in CI (Priority: P2)

A contributor receives automated results for changes without granting unnecessary privileges
or executing application features.

**Why this priority**: Shared checks must enforce the same contract as local checks.

**Independent Test**: Inspect the workflow and run its check commands locally; hosted results
must be reported as unverified until an actual workflow run exists.

**Acceptance Scenarios**:

1. **Given** a proposed change, **When** CI runs, **Then** it performs a locked dependency
   installation and executes lint, typecheck, tests, and the Python reference checks.
2. **Given** any workflow action, **When** its reference is inspected,
   **Then** it uses a verified full commit hash with a source and lookup date recorded.
3. **Given** the workflow, **When** its permissions are inspected,
   **Then** defaults are empty and jobs request only permissions required to read source.

### Edge Cases

- PowerShell may block npm.ps1; instructions must support npm.cmd without changing execution policy.
- Missing dependencies must produce a real failure, never a reported pass or implicit download.
- Source files or tests may be absent in a new skeleton: include a tooling verification test,
  not an option that reports success when no tests were discovered.
- Existing templates contain workflow syntax and must not be mistaken for the project's CI.
- No global package installs, production connections, secrets, staging, or commits are allowed.

## Requirements

### Functional Requirements

- **FR-001**: Provide independent lint, typecheck, and non-watch test commands at the root.
- **FR-002**: Each command must exit nonzero when its corresponding validation fails.
- **FR-003**: Provide CI for proposed changes and pushes on Windows, macOS, and Linux.
- **FR-004**: Pin direct dependencies, retain a lockfile, and verify current versions and
  compatibility from official sources before asking for installation approval.
- **FR-005**: Pin every CI action to a verified full commit hash; record the reference source
  and lookup date and use minimum permissions.
- **FR-006**: Preserve existing data, reference tools, scenario expectations, and budgets.
- **FR-007**: Add no interview, loader, expression, routing, persistence, generation, or course features.
- **FR-008**: Document setup, local commands, Python prerequisites, and verification limits.
- **FR-009**: Observe a failing test before implementing each skeleton capability; retain
  evidence showing that lint, typecheck, and tests reject their corresponding failures.
- **FR-010**: Do not install packages without explicit approval, and do not stage or commit changes.

## Success Criteria

### Measurable Outcomes

- **SC-001**: All three local check commands pass on the final skeleton.
- **SC-002**: All three deliberately failing verification fixtures produce nonzero exits.
- **SC-003**: Every workflow action has a full verified commit hash and recorded lookup provenance.
- **SC-004**: All nine existing scenario files and the shared expression vectors remain unchanged.
- **SC-005**: Required reference checks have recorded real results; any blocked or failed check
  prevents a claim that the skeleton is fully verified.

## Assumptions

- Work happens in this repository root; design assets already live here.
- This task supplies development tooling only. Application dependencies are deferred until needed.
- CI is verified locally where possible. Publishing or triggering remote workflows is not requested.
- Package names and versions, CI action hashes, and runtime compatibility are researched in the plan.
