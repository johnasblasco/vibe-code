# Implementation Plan: Doctor and Beginner Course

Date: 2026-11-01. Spec: spec.md. Existing branch; no staging or commits.

## Summary and Technical Context

Existing TypeScript ESM/Node, commander, Clack, yaml, and Vitest. No new package. Attach technical
runner IDs to existing YAML verify entries without renaming/reordering them. Use native process,
filesystem, DNS and HTTPS primitives. Doctor evaluates current course boundaries through the
existing gate engine. Persist a separate course cursor/history, not automatic pass claims.

## Constitution Check

PASS: test-first slices; YAML remains authoritative; original persona budgets unchanged; no
production or answer-built shell commands; no automatic installs; explicit probe/remote consent;
no commits even in probe repositories; no raw outputs or secrets persisted; no staging/commits.

## Modules

src/doctor/process.ts: fixed native executable adapter, sanitized environment, IO/time bounds.
src/doctor/network.ts: public-address checks, DNS-pinned HTTPS, limited no-redirect responses.
src/doctor/probe.ts: recognized direct hook, benign/synthetic controls, always-aborting guard,
owned temporary cleanup, no original-repository index/history changes.
src/doctor/index.ts: source runner mapping, fresh evidence, manual attestation, gate integration.
src/course/state.ts: validated atomic cursor/manual/deferral history persistence.
src/course/index.ts: render YAML cards, recheck entry/exit boundaries, advance only stages 0–2.
src/cli/program.ts: doctor, gates --verify, and explicit next --course mode with runtime consent.
beginner-course/verification.yaml and doctor-ui.yaml: runner/probe/teaching/interface data.

## Test Strategy

Small failing-test slices for process constraints, readiness/Git, probe controls, network/CI,
course resumption/tampering, and CLI consent. Use fake transports for remote services and no
real production targets. Exercise native Git only in disposable test repositories with an
always-aborting guard, and run the real doctor read-only against this workspace. Report missing
Docker/scanner or unavailable live evidence as blocked, never as a pass.

## Limits and Assumptions

Only an exact supported direct Gitleaks hook can be proved automatically; do not execute
arbitrary user hooks or auto-download pre-commit environments. Guidance is provided for the
supported hook, without installing it. Remote CI is public GitHub read-only metadata. A user
must designate a nonproduction preview; the CLI cannot independently certify that designation.
No do/undo commands are executed. No actual browser/host deployment, hook install, package
install, or production access. Source/probe fixtures are test data, not real credentials.
