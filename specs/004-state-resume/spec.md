# State File and Resume

Created: 2026-11-01. Status: implemented and verified locally.

## User Stories

US1 (P1): Save after each answer without losing earlier answers if validation or writing fails.
US2 (P1): Resume with answered, deferred (owner/revisit_when), and not_applicable (reason) states.
US3 (P2): Preserve old answers across bank updates, surface new questions, re-ask changed options,
and flag changed packs relied on by answered questions.

## Acceptance and Scope

State is readable JSON storing schema, bank_version, answer records, progress, and question/pack
snapshots for update comparison. YAML metadata supplies the bank version, initially 1.0.0 as
approved by the user. Reject unknown states, invalid question values, disallowed states, malformed
progress, and recognizable secrets without echoing them. Deferred/NA values are not engine answers.
Unknown historical IDs remain readable through their saved definition. New unknown IDs fail.

Writes use an exclusively created sibling temporary file, flush it, then rename atomically.
The API accepts an explicit state-file path; symlink targets/parents are rejected. Existing files
are not removed on failure. Temp files are cleaned only when created by this operation.
Concurrent-writer locking and crash recovery are not promised by this first state API.

Resume recomputes the decision snapshot from validated answered values. It does not trust saved
gate claims or execute commands. It reports required live gate re-verification to its caller.
Progress is a cursor, not evidence of gate passage. No new package, CLI UI, staging, or commits.
