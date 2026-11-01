# Feature Specification: Doctor and Beginner Stages 0–2

Created: 2026-11-01. Status: implemented and locally verified. Continue on the user's current branch.
Input: Build doctor and the automatic checks for stages 0 to 2.

## User Scenarios & Testing

### US1: Check readiness (P1)

A beginner runs doctor and sees current tool/Git results, source-backed remedies, and honest
blocked or unverified checks. Version commands are read-only; Docker is contacted only through
a local socket or named pipe. Missing tools are reported, never installed automatically.

Acceptance: verify Node against the pack's supported range, Git, Docker client/local engine,
an existing commit, ignored secret paths, and a nonignored example file. Never read .env contents
or trust a saved pass. Unknown checks, failures, missing prerequisites, and exceptions block.

### US2: Prove the safety net (P1)

With explicit consent, test a recognized direct Gitleaks hook using benign and synthetic-secret
controls in a disposable repository. A second guard prevents every commit, even if the scanner
fails. The selected project's history, index, working files, and hooks remain unchanged.

Acceptance: no arbitrary project hook executes; the installed scanner version must match the
declared pin; the benign control must reach the guard, the fake-secret case must stop before it,
no HEAD may be created, and owned probe files must be removed. Unsupported hook frameworks stay
unverified. Manual 2FA confirmations are labelled and recorded as manual, never automated proof.

### US3: Check a preview and guide the course (P1)

A beginner views stage cards and requests the next step. The current boundary is freshly checked
before advancement. Stage 2 verifies HTTP 200, the expected version text, and the latest relevant
CI run for the local commit and branch. Remote checks require an explicitly designated nonproduction
preview and typed consent. No deploy, hook install, package install, or production operation runs.

Acceptance: refuse credentials/private destinations/redirects; bound HTTP IO and pin DNS resolution;
wrong versions or stale/failed/pending CI do not pass. Editing the course cursor cannot skip entry
checks. Resume keeps progress/history, while fresh verification is required each invocation.

## Requirements

- FR-001: Load teaching, checks, runner identifiers, probe fixtures, and remedies from YAML.
- FR-002: Native processes use fixed executable names and argument arrays, bounded output/time,
  sanitized environments, and no shell strings assembled from answers.
- FR-003: Default checks are read-only. Probe/remote capabilities need preview and typed consent.
- FR-004: Scanner proof is isolated and cannot produce a commit. Cleanup is limited to owned temp data.
- FR-005: Automatic, manual, deferred, failed, and unverified results remain distinct.
- FR-006: Gates reverify current obligations; persisted course progress cannot grant passage.
- FR-007: Persist only the course cursor and explicit manual/deferral history, without secret values
  or raw process/page output. Keep the existing answer-state schema compatible.
- FR-008: No packages installed, production systems contacted, staging changes, or commits by the agent.

## Key Entities

Check binding: source card/index and technical runner ID. Check evidence: current status plus
bounded, nonsecret detail. Course cursor: current stage and manual/deferral history, not gate grants.
Preview target: designated nonproduction HTTPS URL, expected version, public GitHub repository.

## Success Criteria

- Every automatic check in stages 0–2 has a tested runner, or blocks with a specific prerequisite.
- No saved pass or edited cursor can bypass a required current check.
- Scanner controls produce no commit and leave the selected project's index/history unchanged.
- Existing nine persona expectations and budgets remain unchanged.

## Scope

Teach/check stages 0–2 only; stage-3 is a completion boundary. Existing init/next interview behavior
remains available. Course mode is explicit. Direct Gitleaks hooks are the initial supported hook
shape; arbitrary/framework hooks are not executed or silently called verified. CI checks public
GitHub metadata without asking for tokens. Private CI stays unverified. No actual stage do/undo
commands execute. No overwrite, automatic install, deploy, signing, or distribution workflow.
