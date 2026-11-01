---
name: beginner-step-cards
description: Write or revise beginner step cards and the golden path in beginner-course/. Use whenever the user wants to teach setup steps to complete beginners, add a stage, write instructions for databases, Redis or caches, deployment, environment variables, secrets, backups, CI, monitoring, or extensions, or says "make it easier for beginners", "what must they do before the next step", or "add a verify check".
---

# Beginner step cards

A beginner cannot judge whether a step worked, so every card teaches one thing, checks it automatically, and locks the next stage until it passes.

## Card anatomy (see `specs/step-card-format.md`)
`teach` (why, plus what happens if skipped), `choose` (one decision with a default), `do` (exact, copy-paste), `verify` (automatic where possible), `if_fails` (3 to 5 common errors with plain fixes), `gate`, `undo`, `covers`.

## Writing rules
- Plain words. Define a term at first use. No unexplained acronyms.
- One thing per card. Split if two checks can fail independently.
- Put a safety net before the danger: `.gitignore` and a secret scanner before any secret; ownership rules before real data; a staging copy before production.
- Deploy an empty page first. Surprises in the first deploy are cheap while the app is tiny.
- Choose add-ons by symptom, not by tool name. "Skip it for now" is valid and must be recorded as deferred with a trigger.
- Show the date of any limit, price, or deadline, and link its pack.
- Never ask a beginner to paste a secret into chat. Tell them where it goes.
- Dangerous actions need a typed confirmation word and an `undo` or a plain "cannot be undone".

## Cross-platform
Every command must work in PowerShell, macOS, and Linux, or give a variant for each. Do not assume `rm`, `cp`, `export`, or forward slashes. Prefer a CLI action over a raw shell command.

## Verify patterns
Command prints a version; URL returns 200 and shows the version string; database insert, read, delete round trip; fake secret commit is refused; logged-out request returns zero rows; other user's id returns nothing; built browser files contain no secret.

## Golden path order
Machine ready, safety net, hello world live, environments and secrets, database, access control, cache or queue (only if a symptom), one slice, quality net, watching, pre-launch gate, launch. Keep to it unless you can explain why a change helps a beginner.

After editing, run `python tools/validate.py --today <today>`.
