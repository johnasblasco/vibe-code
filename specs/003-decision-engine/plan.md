# Implementation Plan: Decision Engine

Feature: 003-decision-engine. Date: 2026-11-01.

## Summary and Technical Context

A pure TypeScript ESM decision function consumes LoadedKit plus answers and optional stage/depth.
Use the existing loader and expression interpreter; Node path.posix.matchesGlob expands loaded
file names without filesystem access. No new package or network access is required.

## Constitution Check

All conditions, additions, recommendations, messages, and question content stay in YAML.
The function does not mutate answers or kit data. Existing scenario expectations and budgets
stay unchanged. Tests fail before implementation. No shell execution, writes, prompts, defaults
acceptance, state changes, staging, or commits. The reference baseline passed before changes.

## Structure

src/engine/index.ts: decision function and typed result records.
tests/unit/engine-scenarios.test.ts: all nine unchanged YAML acceptance scenarios.
tests/unit/engine.test.ts: depth, stages, stops, immutability, and malformed core data.

## Behavior

First matching router tier wins. That tier and all lower tier additions load in router order;
file matches sort and deduplicate before module tier_min/load_when filters. Required_when
marks obligations without hiding questions. The snapshot collects every loaded question and gate.
Depth profiles filter queues; T4/T5 quick is promoted to standard. Stage selection affects the
queue only. Stops preserve evidence but suppress actionable queues. Failure modes and rules
are computed independently from the full answer environment, as in the reference.

## Verification Strategy

Run every expectation key from every persona, rejecting any unsupported expectation key in the
test harness. Check exact reference snapshots separately, not just maximum budget assertions.
Check defaults by property presence, including false. Validate errors and protected full_only
questions with synthetic modifications to cloned input data, never editing source YAML.

## Complexity and Limits

No exceptions or new dependencies. Gates are names only; live checks are task 6. No output writer,
expert brief, recommendation engine, state file, interview, or CLI command is added here.
