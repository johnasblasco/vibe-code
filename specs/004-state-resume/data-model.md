# State Data Model

schema: scaffolder-state/v1.
bank_version: semantic version of the originating bank from question-bank/manifest.yaml.
answers: question/flag ID to answered(value), deferred(owner, revisit_when), or
not_applicable(reason). No other state or silent skip is accepted.
progress: stage, depth, current_question (known historical ID or null).
questions: minimal snapshots of type, options, and states_allowed for update comparisons.
packs: content hash and affected-question IDs for each knowledge pack.

Snapshot definitions preserve historical readability. Current YAML is revalidated when resuming
and answering. Changed definitions are re-asked and excluded from the expression environment.
Resume preserves the originating version and snapshots pending explicit user review; it does
not mark bank/pack changes acknowledged or trust editable snapshots as signatures.
