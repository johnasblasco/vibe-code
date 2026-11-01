# Tasks: Decision Engine

## Setup

- [x] T001 Read reference behavior and baseline checks; record decisions in research.md.
- [x] T002 Define scope and interfaces in spec.md, plan.md, and contracts/engine.md.

## Routing and Applicability (US1)

- [x] T003 [US1] Write tests/unit/engine-scenarios.test.ts against all existing expectation keys; observe missing-module failure.
- [x] T004 [US1] Implement first-match tier routing, cumulative file expansion, module selection, gates, rules, and failure applicability in src/engine/index.ts.

## Depth and Stages (US2)

- [x] T005 [US2] Write tests/unit/engine.test.ts for stages, depths, stops, and input immutability; observe missing-module failure.
- [x] T006 [US2] Implement stage/depth queues, protected exclusions, conditional-required metadata, and budget metrics in src/engine/index.ts.

## Verification

- [x] T007 Compare exact snapshots against the Python reference for every persona; record results in research.md.
- [x] T008 Run all project checks and record results in quickstart.md, preserving original YAML and acceptance files.

Dependencies: setup precedes US1; US2 shares the routing snapshot; final checks follow both.
Read-only baseline checks can run concurrently. Implementation and failing-test steps remain
sequential. No new package, network lookup of changing facts, staging, or commits are needed.
