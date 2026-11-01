# Implementation Plan: File Generation

Date: 2026-11-01. Spec: spec.md. Existing user branch, no staging or commits.

## Summary and Technical Context

Use the existing TypeScript ESM, commander, Clack, yaml, and Vitest dependencies. No package
installation. Output paths/conditions are in outputs/files.yaml; every inserted value is
resolved through outputs/bindings.yaml. Resolver copy lives in outputs/resolvers.yaml and
beginner-course/generation-ui.yaml. Existing state remains scaffolder-state/v1.

## Constitution Check

PASS before and after design: source content remains in YAML/templates, tests fail first,
current answers and provenance are used, unsafe lookup data and unverified pins reject,
preview precedes typed write confirmation, destinations are contained/create-only, and no
project command, package, hook, production action, staging, or commit is performed.

## Modules

src/outputs/lookups.ts: bounded/cancellable official metadata client, tag peeling, stable
versions, dated fallback pins, canonical host/repository checks at both resolver and IO layers.
src/outputs/paths.ts: portable relative paths and unlinked installed-template reads.
src/outputs/generate.ts: manifest selection, current bindings, missing inputs, context-aware
rendering, YAML frontmatter, intact GitHub expressions, and generation provenance.
src/outputs/publish.ts: full destination preflight, private staging files, exclusive per-file
publication, cleanup of owned temporary files, honest partial-batch reporting.
src/outputs/command.ts: missing-input prompts, persistence, preview, cancellation, confirmation.
src/cli/program.ts: generate command, named exits, data-backed diagnostics.

## Test Strategy and Execution

Tests first for lookup validation, every template including dotfiles, binding/rendering,
publication, and command behavior. Independent tests cover interrupted writes and concurrent
publication. Compare all existing personas and budgets unchanged; rerun Python checks and
TypeScript/tooling/dependency checks. Real compiled CLI checks cover preview, offline/live
provenance, typed confirmation, cancellation, and preservation of existing output.

## Boundaries

Exact stable version tags for containers, full hashes for actions/hooks; container digest
pinning is not claimed. No hook installation or CI scanner verification. The scanner resolver
uses its documented explanatory-comment option. No overwrite command or automatic gate passage.
Each file publishes atomically, but a multi-file IO failure can leave earlier complete files;
they are reported and preserved. Directory-swap attacks need later hardening. Updates/signing
and hosted CI/macOS/Linux execution are not established by local verification.
