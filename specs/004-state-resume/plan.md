# Implementation Plan: State File and Resume

Feature: 004-state-resume. Date: 2026-11-01.

## Technical Context

TypeScript ESM on the existing Node runtime. JSON persistence uses built-in filesystem and
crypto APIs; no new dependencies. Existing YAML supplies question definitions and bank version.

## Constitution Check

Three explicit answer states; no silent skipping or auto-acceptance. Validate values and
metadata before saving and after loading. Never echo suspected secrets. Preserve existing
files on failed writes and reject unrelated targets. No production access, commands, staging,
or commits. The user approved YAML bank metadata starting at 1.0.0.

## Structure

src/state/index.ts: state contracts, validation, answer updates, resume reports, persistence.
question-bank/manifest.yaml: bank_version, using the existing question-bank schema.
tests/unit/state.test.ts: roundtrip, value/state restrictions, updates, progress, and privacy.
tests/unit/state-io.test.ts: symlink and failure-path checks.

## Design

A readable versioned JSON document records answers, a stage/depth/question cursor, bank_version,
minimal question-definition snapshots, and hashes/affected IDs for packs. Deferred/NA records
never enter the expression environment. Resume recomputes the decision and reports new IDs,
changed definitions, and relevant changed packs. Old/retired records remain inspectable.
The saved bank version records the originating bank; resume reports drift without silently
acknowledging or rewriting historical snapshots. A later bank-update UI handles acknowledgement.

Save validates first, rejects symlinks/unrelated files, exclusively creates its own sibling
temporary file with requested mode 0600, flushes/closes it, then renames over the valid state.
On failure, only a temp file successfully created by that call is eligible for cleanup.
The caller-provided state object is unchanged if validation or persistence fails.

## Verification

Observe missing-module and targeted failure regressions first, then run state tests and all
project checks. Gate claims are forbidden fields; progress is only a cursor. Resume always
reports requiresGateVerification=true. Tests use synthetic credentials and owned temporary files.

## Limits

Secret-shape detection is heuristic; diagnostics redaction remains task 5/9 work. No cross-process
writer locking or protection against filesystem races is claimed. No signed updates, migrations,
CLI prompts, or automatic gate passage. Snapshot drift remains pending until the user reviews it.
