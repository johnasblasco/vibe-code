# Skills

Agent Skills (open SKILL.md format). Two kinds:

**Builder skills** help an AI agent work on this repo. Copy into `.claude/skills/`:
`scaffolder-builder`, `question-bank-authoring`, `beginner-step-cards`, `iot-hardware-intake`, `vibe-coding-security-baseline`, `knowledge-pack-maintenance`, `premortem-failure-modes`.

**Project templates** (`project-templates/*`) are copied by the scaffolder INTO each generated project's `.claude/skills/`, after filling the `{{placeholders}}` from the user's answers: `deploy-checklist`, `db-migration-rules`, `hardware-facts`.

Not evaluated yet. Before relying on any skill, write 2 or 3 realistic prompts, run them with and without the skill, and tune the description with the skill-creator workflow.
