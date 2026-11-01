# Knowledge pack (knowledge-pack/v1)

Rules, limits, prices, and deadlines that change live in packs, never in code.

Required: `id`, `last_verified` (ISO date), `sources` (primary where possible).
Recommended: `max_age_days`, `volatile`, `facts`, `affects_questions` (ids that must be re-read when the pack changes), `primary_source_todo`.

`python tools/validate.py --today YYYY-MM-DD` warns when a pack is older than `max_age_days` and fails if `affects_questions` names an unknown id.

Every pack in this kit was assembled from secondary sources on 2026-10-31. Replace or confirm each with the primary source before shipping to users.
