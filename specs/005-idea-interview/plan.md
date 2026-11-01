# Implementation Plan: Idea-Stage Interview

Feature: 005-idea-interview. Date: 2026-11-01. Status: core implemented; terminal prerequisites pending.

## Technical Context and Scope

Use existing TypeScript ESM loader, decision engine, and state APIs. The pure interview core
accepts an injected prompt port and an awaited save callback. A separate Clack adapter and
Commander CLI follow after approved package installation. No changes to question budgets.

## Constitution Check

Questions, defaults, conditions, contradictions, and human interface text stay in YAML.
Tests fail before implementation. No proposed default is accepted before review; every accepted
answer is validated and saved. Invalid input produces a generic retry event without its value.
Cancel sentinels are never stored. Stop rules suppress prompts. No production or command execution.
No commits, staging changes, or unapproved package installations.

## Modules

src/interview/index.ts: terminal-independent orchestration and proposal provenance.
src/interview/clack.ts (pending): prompt rendering and cancellation mapping.
src/cli/main.ts (pending): Commander entry point and named exits.
beginner-course/interview-ui.yaml (pending): interface strings.
tests/unit/interview.test.ts: stage scope, batch review, invalid input, stops, cancellation, resume.

## Behavior

Ask visible unanswered router flags first, recomputing ask_when after each save. Then ask only
pending idea-stage questions without concrete proposals. Review current applicable proposals
in one screen, accepting selected IDs and asking for edits to unselected ones. Recompute after
every save; if an edit exposes new questions they require explicit input/review too. Stop rules
halt immediately, while block contradictions are shown and retained as a blocked completion.
A persisted cursor is not proof of gate passage. Resume uses existing state validation.

## Dependencies

commander 15.0.0 and @clack/prompts 1.8.1 are verified in official docs/npm and approved.
The installation attempt failed with EACCES reaching the registry; their versions are declared
in package.json pending successful install/lockfile synchronization. No replacement is chosen.

## Limits

The core is testable independently, but this feature cannot be called complete until the real
adapter, CLI, Ctrl+C behavior, and data-backed UI have been implemented and checked.
