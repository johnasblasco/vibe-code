# Feature Specification: Gates and Pre-mortem

Created: 2026-11-01. Status: implemented and locally verified. Work stays on the user's current branch.
Input: Add gates, the premortem command, and docs/risk-register.md output.

## User Scenarios & Testing

### US1: Inspect and enforce a gate (P1)

A beginner requests a course-stage boundary or an applicable named hardware gate. They see
every obligation and a blocked result until checks pass or they explicitly supply documented
deferrals. Stored progress never proves passage. Safety stops always block.

Acceptance: stage-2 includes earlier blocking cards but not the stage-2 deployment card;
unknown or inapplicable gates fail; fresh checks run on each evaluation; automatic and manual
results remain distinct; missing runners and exceptions block; incomplete hardware answers
and missing design review block; explicit deferrals require owner, reason, and revisit trigger.

### US2: Review ranked project failures (P1)

A builder runs a pre-mortem using saved answers. Applicable risks match the reference ordering,
and show score, prevention links, question coverage, card verification, evidence, and open work.

Acceptance: all nine existing personas match the Python ranking and scores. Limiting displayed
rows preserves total/evidence counts. Answered questions alone never label a risk prevented.
Deferred and stale answers remain visible; unverified cards are not labelled passed.

### US3: Create a reviewable risk register (P1)

A builder previews the report or creates docs/risk-register.md in their selected project.
Missing required answers and unresolved bindings stop generation. Existing human edits remain.

Acceptance: use the supplied template and authoritative bindings; dry run creates nothing;
reject linked output directories; publish without overwriting existing files, including a
file created concurrently. Escape data so it cannot add table rows or inject raw HTML.

### Edge Cases

Invalid limits/dates, missing names, unknown bindings, corrupt state, changed definitions,
noninteractive commands, stale verification claims, malformed deferrals, failed IO, and stops.

## Requirements

- FR-001: Load gate and risk definitions from current source data, preserving existing IDs/budgets.
- FR-002: Gates must fail closed for unverified checks, require fresh verification for passage,
  and distinguish manual attestations from automatic results. Stops cannot be deferred away.
- FR-003: Explicit check deferrals require a nonempty owner, reason, and revisit trigger;
  they must never appear as passed checks or silently load from saved progress.
- FR-004: Rank risks by descending severity times likelihood, then descending severity, then ID.
- FR-005: Show question coverage, unverified cards, and researched/practice evidence honestly.
- FR-006: Render the existing risk-register template exclusively through outputs/bindings.yaml.
- FR-007: Preview without writes; publish only inside the selected project and never overwrite.
- FR-008: Do not execute prose from YAML, run external commands, contact production, expose
  rejected data, install dependencies, stage files, or create commits.

## Key Entities

GateCheck: stable check ID, kind, description, optional card, current result.
GateDeferral: owner, reason, revisit trigger, attached to an explicitly selected check.
RiskReport: ranked applicable failures, coverage, evidence totals, open status.
OutputBinding: authoritative question or system source for a template placeholder.

## Success Criteria

- SC-001: All nine personas retain exactly the reference risk ordering and scores.
- SC-002: Every unknown, failed, or unverified gate prevents requested passage.
- SC-003: Every generated register has zero unresolved placeholders; no existing register is overwritten.
- SC-004: Automated checks distinguish manual evidence and deferral from a successful check.

## Assumptions and Scope

Automatic tool/database/deployment runners remain in the later beginner-course/doctor task,
as in the user's build order. A scope question offered doing those early; absent a change,
this feature implements their gate contract and leaves unsupported checks blocked. No course
progression is introduced ahead of those runners. Read-only gate/pre-mortem commands work
without a terminal. The register starts open for review; owners/triggers or written acceptance
are filled by the project owner, never invented. General file generation follows next.
