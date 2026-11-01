---
name: knowledge-pack-maintenance
description: Create, update, or audit knowledge packs (regulatory deadlines, standards, hosting limits, prices) in knowledge-packs/. Use whenever a deadline, law, standard edition, free-tier limit, or price may have changed, when the user says "update the packs", "is this still true", "add a pack for <regulation or provider>", or when a pack is stale, unsourced, or only from memory.
---

# Knowledge pack maintenance

Facts that change live in packs so the code never goes stale. A pack that cannot be trusted is worse than no pack, so every claim needs a source and a date.

## Steps
1. Read `specs/knowledge-pack-format.md`.
2. Search the web for the current state. Prefer primary sources (EUR-Lex, ETSI, FCC, provider pricing pages). Use news or blogs only to find the primary source.
3. Write facts in your own words, one claim per line, with dates in ISO form.
4. Set `last_verified` to today, `max_age_days` to match how fast it moves (30 for prices and programmes, 90 or more for stable standards), and `volatile` accordingly.
5. List the question ids the pack affects in `affects_questions`, and re-read those questions for changes.
6. If you only found secondary sources, say so in `verified_via` and keep a `primary_source_todo`.
7. If a fact came from memory, mark it so. Never present remembered facts as verified.
8. Run `python tools/validate.py --today <today>` and fix stale warnings.

## Judgement
- When sources disagree, record the disagreement and tell the user to verify rather than picking one.
- Do not give legal conclusions. State what the rule says and who must decide how it applies.
- Re-check fast movers (Cyber Trust Mark, AI Act dates, free tiers) before every release.
