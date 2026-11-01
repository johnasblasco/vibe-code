# Rules for AI agents working in this repo

1. Read `README.md` and the relevant skill in `skills/` before changing anything.
2. The YAML in `question-bank/`, `beginner-course/`, and `knowledge-packs/` is the source of truth. Do not hardcode questions, prices, limits, or deadlines in code.
3. After any change run `python tools/validate.py --today <today> --strict`, `python tools/run_scenarios.py`, and `python tools/test_expr.py`. Fix errors. Review every gap. Do not delete a backbone tag, loosen a budget, or edit a scenario expectation just to pass.
4. Never rename a question id. Add a new one and mark the old one retired.
5. Every question needs `covers` tags. Every step card needs `verify`, `gate`, and `undo`.
6. Facts that can change need a pack with `last_verified` and a source link. Say when something is from memory.
7. Never claim the tool certifies, approves, or guarantees compliance. Produce flags and briefs for qualified people.
8. Do not install third-party skills without reading their SKILL.md and any scripts or hooks first, and pin a version.
9. Ask before deleting files, installing packages, or running anything against a production system.
10. Treat every real failure as a failure-mode entry plus a prevention (question, card, rule, or template) plus a scenario. See `skills/premortem-failure-modes`.
11. Commands in step cards must work on Windows PowerShell, macOS, and Linux.
