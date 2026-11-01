# Scaffolder Kit

Everything collected for the guided project-setup CLI for vibe coders (beginner to connected hardware), organised as data, docs, and agent skills.

```
scaffolder-kit/
├── README.md                    this file
├── AGENTS.md                    rules for an AI agent working in this repo (copy to CLAUDE.md if needed)
├── docs/
│   ├── 01-plan.md               the design
│   ├── 02-research-findings.md  dated facts with sources
│   ├── 03-skills-research.md    skills worth using, and cautions
│   ├── 04-roadmap.md            build order
│   ├── 05-gap-analysis.md       what was missing, how it was found, what is still missing
│   ├── 06-scaffolder-requirements.md   what the CLI itself must be
│   └── 07-threat-model-cli.md   attacks on the scaffolder
├── specs/                       formats: question, step card, knowledge pack, expressions, failure mode
├── question-bank/               what the CLI asks (YAML), scheduled by stage
│   ├── 00-router.yaml           flags, tiers T1..T5, stop rules
│   ├── depth-profiles.yaml      quick / standard / full
│   ├── software/                phases 0.5 to 16 plus lifecycle, resilience, security extras
│   ├── hardware/                H1 to H15 (IoT and devices)
│   └── extensions/              ai-agents, mobile, payments, user-content, packages and CLIs, data/ML, browser/desktop, safety-critical
├── failure-modes/               pre-mortem catalog: how projects fail, linked to what prevents each failure
├── rules/                       contradiction rules and "pick for me" recommendation profiles
├── beginner-course/             golden path, step cards (stages 0 to 5), cache decision table, glossary, troubleshooting
├── templates/                   files the CLI generates into projects (AGENTS.md, constitution, CI, compose, ADR, threat model, risk register)
├── outputs/bindings.yaml        where every template placeholder gets its value
├── knowledge-packs/             dated facts with sources, tool versions, and the coverage backbone
├── tests/
│   ├── scenarios/               9 persona scenarios: acceptance tests for the decision engine
│   └── golden/                  a generated sample pre-mortem
├── tools/                       validate.py, run_scenarios.py, premortem.py, expr.py (+ test_expr.py)
└── skills/                      agent skills (SKILL.md folders)
    ├── scaffolder-builder/  question-bank-authoring/  beginner-step-cards/
    ├── iot-hardware-intake/  vibe-coding-security-baseline/  knowledge-pack-maintenance/
    ├── premortem-failure-modes/
    └── project-templates/       skills the scaffolder WRITES INTO users' projects: deploy-checklist, db-migration-rules, hardware-facts
```

## Quick start

```bash
pip install pyyaml
python tools/validate.py --today 2026-10-31 --strict     # structure, cross-references, coverage gaps, pre-mortem gaps
python tools/run_scenarios.py                            # 9 personas through the decision engine
python tools/test_expr.py                                # expression language tests
python tools/premortem.py tests/scenarios/05-plant-waterer-iot.yaml --top 12   # ranked ways this project fails
# Install the builder skills for Claude Code (project level):
mkdir -p .claude/skills && cp -r skills/{scaffolder-builder,question-bank-authoring,beginner-step-cards,iot-hardware-intake,vibe-coding-security-baseline,knowledge-pack-maintenance,premortem-failure-modes} .claude/skills/
```

`skills/project-templates/*` are not for this repo. They are templates the CLI copies into each generated project's `.claude/skills/`, after filling placeholders through `outputs/bindings.yaml`.

## CLI development

The repository root has an ESM TypeScript project with YAML loading, expression evaluation,
and a decision engine tested against the nine acceptance personas. State persistence and resume
and the idea-stage interview are implemented.
Run `npm run build`, then `npm run vibecode -- init` to start or resume it.
Use `npm run vibecode -- next` to resume; Ctrl+C preserves accepted answers.
The guided opening starts with name, description and project type. Optional sign-in, payments
and other routing features share one checklist. Budget, scale, detailed data choices and AI
workflow policies are asked later when needed. Ordinary opening questions accept a direct
answer; use `/defer` or `/na` in text fields, or the corresponding menu action, to record an
explicit alternative. See [the shorter interview guide](specs/011-short-interview/quickstart.md).
The state file defaults to `.scaffolder/state.json`, which is ignored by Git.
See [the interview guide](specs/005-idea-interview/quickstart.md) for limits and verification.
Use `npm run vibecode -- premortem --dry-run` to preview ranked failures, then omit `--dry-run`
to create `docs/risk-register.md`. Existing registers are never overwritten. A saved project
name is required. `npm run vibecode -- gates stage-1` inspects that boundary and returns a
blocked status for unverified checks. `gates stage-1 --verify` uses the supported doctor runners.
See [the gates and pre-mortem guide](specs/006-gates-premortem/quickstart.md).
Use `npm run vibecode -- generate` to preview applicable project files. It asks for missing
bound answers in a terminal. `--file ci` selects an output, `--offline` uses dated verified
pack pins, and `--write` requires preview and typed confirmation. Existing files are never
overwritten. No packages, hooks, containers, or project commands are installed or run.
See [the file-generation guide](specs/007-file-generation/quickstart.md) for provenance and limits.
Run `npm run vibecode -- doctor --dry-run` to list checks, then `npm run vibecode -- doctor`
for current machine readiness. `doctor --stage stage-1` adds Git/secret checks; stage-2 adds
explicitly approved nonproduction preview/CI checks. `next --course` shows beginner cards and
`next --course --advance` saves the next cursor only after fresh checks. No do/undo commands,
packages, hooks, or deployments run automatically. See [the course guide](specs/008-beginner-course/quickstart.md).
The CLI verifies its reviewed pack/template inventory before any command and uses a verified
snapshot for generation. Unexpected asset changes stop execution. Intentional source edits
need review before explicitly refreshing `integrity/assets.json`; see the
[hardening review](docs/08-cli-hardening-review.md) for all 11 threats, code/test evidence,
maintenance commands and release prerequisites. Run `npm run test:security` and
`node tools/update-integrity.mjs` alongside the existing checks.
Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run test:tooling`.
In Windows PowerShell use `npm.cmd` if execution policy blocks `npm.ps1`.
See [the skeleton validation guide](specs/001-project-skeleton/quickstart.md) for approved
dependency setup, Python checks, actual verification limits, and CI details.
The [loader and expressions guide](specs/002-loader-expressions/quickstart.md) records the
current module checks and the dependency advisory record.
The [decision engine guide](specs/003-decision-engine/quickstart.md) describes routing, depth,
stage scheduling, and reference compatibility checks.
The [state and resume guide](specs/004-state-resume/quickstart.md) documents answer states,
bank-version metadata, persistence checks, and limitations.

## Kit validation status and limits

Read `docs/05-gap-analysis.md` first. In short:
- The TypeScript CLI supports the idea interview, routing, state/resume, gate enforcement,
  pre-mortem risk registers, bound project file generation, doctor, and checked course guidance
  for stages 0–2. The CLI threat-model review is recorded with tested guards and explicit
  release gaps. Later course stages, publishing provenance and independent release testing remain.
- The checks pass: validator (strict), 9 of 9 scenarios, expression tests. Passing means the kit is consistent and every checklist tag has a question. It does not mean the questions are complete or correct.
- 65 failure modes are catalogued; 27 cite a source, 38 are engineering practice awaiting a citation.
- The coverage backbone is only partly verified: OWASP ASVS 5.0 chapter names, OWASP Top 10:2025 category names, and ETSI EN 303 645 provision names were written from memory.
- Most pack research was built from secondary sources on 2026-10-31. Generation pins were
  verified against primary sources on 2026-11-01 and are re-resolved at generation time, with
  dated fallback when networking is unavailable. Remaining lifecycle/regulatory facts still
  need the primary-source reviews recorded in their packs before shipping.
- No beginner has used it yet. Step cards cover stages 0 to 5 only. Only EU and US rules are covered.
- Skills have not been through the skill-creator evaluation loop.
- This kit does not certify anything. Regulatory, safety, and legal questions produce flags for qualified people.
