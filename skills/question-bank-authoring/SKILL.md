---
name: question-bank-authoring
description: Add, edit, split, or review questions in question-bank/ (software, hardware, extensions, router) without breaking coverage. Use whenever the user wants a new question, a new module or extension pack, a new project type, a new flag or tier rule, or asks "are we missing anything", "what's not covered", or "check the questions". Also use when changing covers tags or the coverage backbone.
---

# Question bank authoring

A question exists to record a decision the AI would otherwise make silently. If answering it would not change the stack, the plan, the security posture, or the instructions the AI reads, do not add it.

## Format
Follow `specs/question-format.md`. Required: `id`, `ask`, `type`, `covers`. Add `why` when a beginner would not know why it matters, and `default` when a safe recommendation exists.

## Steps
1. Find the right file and module. Prefer extending a module over creating one.
2. Write the question in plain words, one decision per question. Split "A and B?" into two.
3. Choose `covers` tags from `knowledge-packs/standards-coverage-backbone.yaml`. Add a new tag only when no existing one fits, and say which standard clause it maps to.
4. Make options machine-friendly (`snake_case`). Add `pick_for_me` where the user may not know.
5. Give the module a `stage` so the question is asked when it matters, and add a recommended `default` wherever a safe one exists. Update `depth-profiles.yaml` only if the question belongs in `quick` or truly belongs in `full_only` (protected questions cannot).
5b. If a generated file needs the answer, add or reuse a placeholder in `outputs/bindings.yaml`.
5c. Write the question as a prevention for a failure in `failure-modes/` where one exists, and add the id to that entry.
6. Gate it if skipping would be expensive to undo later (hardware design freeze, production, launch).
7. Never rename an id. Retire it and add a new one.
8. Run `python tools/validate.py --today <today> --strict`, then `python tools/run_scenarios.py`. If a scenario now fails, decide whether the engine or the expectation is wrong. Do not edit a budget just to pass.

## Gap review
When asked "what are we missing?", run the validator, read the GAPS section, then think beyond it: the validator only knows the backbone. Ask which real incidents, laws, or failure modes the backbone does not yet name, and propose new tags with sources. Report that the validator passing is not proof of completeness.

## Pitfalls
- Questions that sound technical but mean nothing to the user ("which ORM?" with no `pick_for_me`).
- Questions that duplicate each other under different ids.
- Hardware questions with no gate.
- Regulatory questions that imply the tool can certify. Phrase them as "which rules apply" and route to a lab or advisor.
