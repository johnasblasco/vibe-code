# Requirements for the scaffolder itself

The kit describes what the CLI asks. This file describes what the CLI must be.

## Users
- **First-timer**: has an idea and an AI tool, no development experience, may not speak English as a first language, may be on Windows.
- **Experienced developer**: wants the decisions recorded and the setup done right, fast, at `quick` or `standard` depth.
- **Small hardware team**: needs gates, certification awareness, and an honest "get an expert" when out of depth.

## Jobs to be done
Decide the stack without fear. Know what must happen before the next step. Never leak a secret or expose data by accident. Keep the AI on the rails across sessions. Find out early how this kind of project fails.

## Success measures (collect only with opt-in)
Time from install to a live empty page (target under 60 minutes). Share of users whose logged-out access test passes before real data. Share who finish stages 0 to 5. Number of questions deferred and later answered. Stuck-command resolution rate.

## Non-goals
Certifying anything. Replacing a lawyer, a test lab, or a safety engineer. Writing the whole product. Supporting every framework.

## Platforms and language
Windows (PowerShell and WSL), macOS, Linux. Every command shown must work on each or have a variant. Output must work with screen readers (no colour-only meaning, plain-text progress). All teaching text lives in data files so it can be translated; do not hardcode English in code. Short sentences, no idioms.

## Commands
`init`, `doctor`, `next`, `explain <term>`, `stuck`, `undo`, `coverage`, `premortem`, `scan`, `update`, `audit`.
- `premortem`: lists applicable failure modes ranked by severity times likelihood and writes `docs/risk-register.md` (see `tools/premortem.py`).
- `scan` (existing project): detect stack, find missing decisions, secrets, missing tests, missing ownership rules, then ask only what is missing. Read-only unless the user approves each change.
- `idea` intake (optional): the user pastes a paragraph; the tool proposes answers for confirmation. Every proposed answer is shown as a suggestion with its source sentence. Never auto-accept, because a wrong early answer misroutes the whole interview.

## State and versioning
- State file stores answers, answer states (answered, deferred, not applicable), progress, and `bank_version`.
- Question bank and packs use semantic versions. When a newer bank arrives: keep answers, show new questions, re-ask any question whose options changed, flag packs that changed facts the user relied on.
- Ids never change. Retired ids stay readable.
- State files are plain text, human-editable, never contain secrets. The CLI refuses to store a value that looks like a key.

## Privacy and telemetry
Off by default. If offered: opt-in, shows the exact payload before sending, no project content, no answers, no paths. Works fully offline except live lookups (versions, pricing, action hashes), which fall back to packs with a stale warning.

## Redaction (`stuck` and anything shared)
Remove `.env` contents, tokens, passwords, connection strings, emails, and home-directory paths. Show the redacted text to the user and require approval before it leaves the machine or is copied.

## Distribution and supply chain
Published with provenance, two-factor on the registry account, pinned and audited dependencies, minimal install scripts (none), signed releases. Packs and templates are signed or checksummed; the CLI refuses unsigned updates. See `07-threat-model-cli.md`.

## Wording and liability
Never say "compliant", "certified", "secure", or "safe". Say what was checked and what was not. Every regulatory output ends with who must confirm it.

## Quality gates for releasing a bank or pack
`python tools/validate.py --strict`, `python tools/run_scenarios.py`, `python tools/test_expr.py` all pass. Stale or unresolved packs block release. At least five real beginners complete stages 0 to 5 with an observer and the findings are fed back.
