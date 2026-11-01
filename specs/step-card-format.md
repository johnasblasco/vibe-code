# Beginner step card (step-card/v1)

One card teaches one thing, checks it, and gates the next stage.

| Field | Meaning |
|---|---|
| `teach` | Why this matters, in plain words, including what happens if it is skipped. |
| `choose` | One decision with a recommended default. Optional. |
| `do` | Exact commands, files to write, or clicks. Copy-paste ready. |
| `verify` | Checks the tool runs itself (`auto`) or asks honestly (`manual`, `record: true`). A card with no `verify` is invalid. |
| `if_fails` | The most common errors with a plain fix each. |
| `gate` | `blocks(stage-N)`: the next stage stays locked until verify passes or the learner defers with a recorded reason. |
| `undo` | How to reverse it, or a clear statement that it cannot be reversed. |
| `covers` | Backbone tags, same as questions. |

## Rules for good cards

- Plain words first. Explain a term the first time. Do not use jargon the learner has not met.
- One thing per card. If a card needs two verify groups that fail independently, split it.
- Prefer automated verification. "Did it work?" is what beginners cannot judge.
- Never ask a beginner to paste a secret into chat. Tell them where to put it.
- Show the date a pack was last verified whenever a card shows prices, limits, or deadlines.

## Cross-platform rule
Beginners use Windows, macOS, and Linux. Every command in `do`, `undo`, and `if_fails` must work in PowerShell, macOS, and Linux, or give a variant for each. Do not assume `rm`, `cp`, `export`, or forward slashes. Prefer a CLI-provided action (`vibecode undo stage-1`) over a raw shell command.
