# Implementation Plan: Gates and Pre-mortem

Date: 2026-11-01. Spec: spec.md. Work stays on the existing user branch.

## Summary

Load course cards, named question gates, failure modes, and bindings from YAML. Evaluate each
requested gate with fresh verification results and explicit deferrals. Port Python ranking,
render the supplied risk-register template, and publish without replacing an existing file.

## Technical Context

TypeScript ESM on the existing Node runtime; commander, yaml, and Vitest are already installed.
No new packages or external services. State remains scaffolder-state/v1 with no gate grants.
Output is a local Markdown file. Target platforms: Windows, macOS, Linux. The catalog has 61
entries and nine acceptance personas; no new question budget or acceptance expectation.

## Constitution Check

PASS before and after design: source content stays in YAML; tests fail before implementation;
verification is fresh and fail-closed; state cannot grant passage; deferrals are explicit and
labelled; output uses bindings; no production, shell interpolation, install, staging, or commit.
The general output generator remains the next task. This task implements only risk-register
bindings needed by the existing template; unsupported resolvers reject rather than guess.

## Project Structure

src/gates/index.ts: course and named gate checks, fresh verifier port, validated deferrals.
src/gates/render.ts: data-backed text and explicit deferrals-file input.
src/premortem/index.ts: deterministic ranking, coverage/evidence, Markdown table.
src/outputs/risk-register.ts: bound template rendering, checked paths, create-only publication.
src/cli/program.ts: premortem/gates commands and named nonzero blocked/stop exits.
beginner-course/{gates-ui,premortem-ui,interview-ui}.yaml: interface content.
tests/unit/{gates,premortem,risk-output,gates-premortem-cli}.test.ts: contracts and regressions.
tests/security-scenarios/gate-integrity.yaml: malformed-bank mutation scenarios for AI-09.

## Execution Strategy

For each slice, write a failing test, observe the failure, implement the smallest change, and
run focused checks. Preserve the user's preexisting staged feature-005 files. Independent
source reads/check commands may run concurrently; implementation edits remain sequential.

## Limits

No actual doctor/check runners or course advance yet. Unsupported auto/manual checks remain
unverified. Named hardware gates additionally require current questions and fresh manual review.
Risk rows start open; answers and cards alone are not enough to prove prevention. The user fills
owners/triggers or written acceptance after generation. No overwrite/refresh command is added.
Path checks reject existing links and publication handles competing file creation. Protection
against an attacker repeatedly replacing directory components during IO needs later hardening.
