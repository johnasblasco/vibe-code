# Feature Specification: Bound Project File Generation

Created: 2026-11-01. Status: implemented and locally verified. Continue on the existing branch.
Input: Generate files only through outputs/bindings.yaml, leave no placeholder, and resolve
action hashes and tool versions by looking them up.

## User Scenarios & Testing

### US1: Preview project files (P1)

The owner selects applicable files and sees complete contents before writing. Questions and
paths come from data. Missing answers are requested, never guessed; deferred or inapplicable
answers cannot silently become concrete configuration. A preview writes no project files.

Acceptance: load all supplied dotfiles and project skills; use current bindings; preserve
GitHub expressions; reject unknown/malformed placeholders; escape text in its output context;
only generate applicable hardware/database/cache files. Stops and blocking contradictions halt.

### US2: Resolve and review pins (P1)

The owner sees exact versions, action commit hashes, source links, lookup dates, and whether a
value came from a live lookup or a dated pack. Unavailable networking can use valid dated pins
with a warning; malformed or hostile responses must fail rather than silently fall back.

Acceptance: allow official hosts/repositories only; resolve annotated tags to commits; reject
wrong hashes, prereleases, redirects, oversized data, stale/future fallback records, and
unresolved values. Never send answers or credentials in a lookup.

### US3: Write after review (P1)

The owner explicitly confirms writing the previewed files. Existing files and links are not
overwritten. Generated instruction/skill/hook configuration is shown before consent; no hook,
package, container, migration, or project command is installed or executed.

Acceptance: noninteractive preview works for complete inputs; writing requires typed confirmation;
Ctrl+C writes nothing; check every destination before publication; reject traversal/linked paths;
create each complete file exclusively; report any partial batch after an IO failure honestly.

## Requirements

- FR-001: YAML controls template selection, paths, resolver content, and bindings.
- FR-002: Every placeholder resolves from a current answered question, verified pack value, or
  declared system resolver. No unresolved placeholder is written; GitHub expressions remain intact.
- FR-003: Runtime/containers use exact stable versions; actions use full commit hashes with tag/date.
- FR-004: Live lookup inputs are official metadata only. Dates/provenance and fallback use are visible.
- FR-005: Preserve existing output and reject linked or nonportable paths before writing.
- FR-006: Ask only for missing bound inputs, validate and save each accepted question answer,
  and require explicit confirmation before writing. Deferrals/cancellation never become defaults.
- FR-007: No new package, production operation, shell command from an answer, staging, or commit.

## Key Entities

Output definition: ID, source template, destination, condition, format.
Binding: authoritative question/pack/system source. Pin: value, release tag when applicable,
source, verification date, live/pack mode. Generation plan: complete files and provenance.

## Success Criteria

- Every supplied template has a manifest entry and every inserted value has a binding.
- Every generated workflow action uses 40 hexadecimal commit characters.
- Preview/cancel produce zero project files; existing files remain byte-for-byte unchanged.
- Invalid lookup data cannot become a generated version or hash.
- The nine persona expectations and budgets remain unchanged.

## Scope and Assumptions

Generate configuration/documentation only. Doctor, execution of course steps, signing updates,
distribution, and destructive overwrite/refresh remain later work. Redis remains the existing
template choice and is selected only when the user chose Redis; no silent Valkey substitution.
The scanner binding permits an explanatory CI comment when no verified runner is configured;
the generated pre-commit configuration does not mean a hook has been installed or tested.
