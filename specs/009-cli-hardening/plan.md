# Implementation Plan: CLI Hardening

Date: 2026-11-01. Spec: spec.md. Existing checkout; no staging or commits.

## Summary and Technical Context

Existing Node/TypeScript ESM, commander, Clack, yaml and Vitest; native crypto/filesystem only.
Add a reviewed SHA-256 inventory of all runtime YAML, templates and generated skill sources.
CLI loads a verified in-memory snapshot; raw loadKit remains an explicitly untrusted parser
for references/tests. Generation reads templates from that snapshot to avoid a second read.
A separate maintainer command reports changed paths and refreshes only on explicit --write.
No asset update/download mechanism is added. Strengthen credential refusal and repeatable
security policy checks, then publish an 11-row evidence report with residual limits.

## Constitution Check

PASS before/after design: YAML remains authoritative; digests contain no copied domain data.
Failing tests precede each fix. No existing acceptance expectation/budget changes. Argument
arrays and consent remain. No production, new dependencies, staging, commit or registry writes.
Checksums depend on a trusted source distribution and do not substitute for signed provenance.

## Project Structure

specs/009-cli-hardening/: spec, plan, research, data-model, contracts, quickstart, tasks, checklist.
src/security/integrity.ts: strict inventory/asset reader and verified kit snapshot.
integrity/assets.json: reviewed asset hashes; no executable code or secrets.
tools/update-integrity.mjs: read-only comparison by default, explicit maintainer --write.
src/data/types.ts: optional verified snapshot for runtime; raw parser API unchanged.
src/cli/program.ts: verification before any command, safe bootstrap diagnostic.
src/outputs/{paths,risk-register,generate}.ts: consume verified snapshot if available.
src/state/index.ts: credential-bearing URL/header refusal.
tests/unit/{asset-integrity,hardening}.test.ts and tests/security-scenarios/cli-hardening.yaml.
tests/tooling/security.node.test.mjs: AST/import, lockfile and release-boundary policy checks.
docs/08-cli-hardening-review.md: all 11 threats mapped to code/tests and release gaps.

## Test Strategy

First observe altered-pack CLI and secret-pattern failures. Then add snapshot/inventory tests,
CLI failure before prompts/processes/network/writes, shell-punctuation name safety and planted
README rejection. Retain existing gate, consent, symlink, pins and native adapter regressions.
Run local AST and supply-chain policy checks with installed TypeScript; do not label them a
third-party penetration test. Run all TypeScript/tooling and Python checks. No new install.

## Limits

A local attacker replacing both manifest and code defeats a checksum inventory; publication
signatures, registry ownership/2FA, clean published install and outside-team review remain
release prerequisites. Race-free hostile shared-directory operation is not promised by portable
Node pathname APIs. No unavailable AI, stuck, telemetry, hook installer or remote updater is added.
