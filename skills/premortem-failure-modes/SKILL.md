---
name: premortem-failure-modes
description: Run a pre-mortem on a project or maintain the failure-mode catalog in failure-modes/. Use whenever the user asks "what could go wrong", "what will break", "reverse engineer my app early", "find all possible issues", "risk register", "is this ready to launch", or after any incident, bug, leak, outage, or surprise that the kit did not prevent. Also use when adding questions or step cards, to check each one prevents a real failure.
---

# Pre-mortem and failure-mode catalog

Questions work forward. Failures work backward. This skill starts from how projects like this one actually fail and checks that the kit prevents each failure.

## Run a pre-mortem
1. Get the project's answers (a scenario file in `tests/scenarios/` or the user's state file).
2. Run `python tools/premortem.py <scenario.yaml> --top 15`. It lists applicable failure modes ranked by severity times likelihood.
3. For each row, check whether its prevention questions are answered and its cards passed. Mark status open, prevented, or accepted.
4. Every open row needs an owner and a revisit trigger, or a written acceptance with a reason. Write the result to `docs/risk-register.md` using the template.
5. Say which entries have no citation (`evidence: practice`) so the user knows how much weight to give them.

## Add a failure mode
Read `specs/failure-mode-format.md`. Required fields: id, title, severity, likelihood, `applies_when`, symptom, cause, prevention, detection, evidence. Cite a source for anything marked `researched`. If the kit does not already prevent it, add the missing question, card, rule, or template in the same change, then run `python tools/validate.py --strict`.

## Rules
- A severity 4 or 5 failure with no prevention is a defect in the kit, not a note.
- Write the cause so a beginner would recognise it, and the detection as something that can be run.
- Prefer one entry per distinct cause. Merge entries that share a prevention.
- Do not inflate likelihood to look thorough. Likelihood is for beginners using AI tools, not for experts.
- Never present the catalog as complete. It covers failures someone has seen.

## After an incident
Write the entry, find the question or card that should have caught it, fix or add it, add a scenario that would have exposed it in `tests/scenarios/`, and run all checks.
