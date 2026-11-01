# Failure-mode catalog (failure-modes/v1)

The question bank works forward (ask, then decide). The catalog works backward (start from how projects like this fail, then prove the kit prevents each one). This is the pre-mortem.

| Field | Meaning |
|---|---|
| `id` | `SW-` software, `AI-` AI-assisted development, `HW-` hardware. Stable. |
| `title` | Short name. |
| `severity` | 1 to 5: impact if it happens (5 = data breach, injury, bricked fleet, legal exposure). |
| `likelihood` | 1 to 5 for the target audience (beginners using AI tools). |
| `applies_when` | Expression over flags and answers (`otherwise` = always). |
| `symptom` | What the user sees. |
| `cause` | Why it happens. |
| `prevention` | Ids that stop it: `questions`, `cards`, `skills`, `templates`, `packs`. |
| `detection` | An automated or manual check that would reveal it. |
| `evidence` | `researched` (has a source URL) or `practice` (engineering experience, no citation yet). |
| `source` | URL when researched. |

## Rules the validator enforces
- Every referenced id exists.
- Every failure mode with severity 4 or 5 has at least one prevention.
- Every `applies_when` parses and uses known identifiers.

## Pre-mortem command (`scaffold premortem`)
1. Compute applicable entries from the user's flags and answers.
2. Rank by severity times likelihood.
3. For each, show whether its prevention questions are answered and its cards passed.
4. Write open items into `docs/risk-register.md`. Each open item needs an owner and a revisit trigger, or a recorded acceptance.

Add an entry whenever a real incident, postmortem, or support case reveals a failure the catalog did not know. A failure with no prevention is a gap in the kit, not a footnote.
