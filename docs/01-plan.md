# Plan: a guided project-setup CLI for vibe coders

Prepared 2026-10-31. Detail lives in the YAML; this file explains the design.

## Problem
Vibe coding fails at the start. The AI makes dozens of silent decisions about framework, data, auth, security, and deployment, nobody records why, and the project drifts. Beginners also never learn the setup steps that matter: secrets, access rules, backups, early deploys.

## Product
A CLI like create-next-app, but for the whole lifecycle and for projects from a static site to connected hardware, treating the user as a complete beginner.

Three layers: **Interview** (questions about the project and constraints), **Decision engine** (rules turn answers into a compatible stack and required steps), **Output** (project files plus a written spec the AI reads every session: CLAUDE.md or AGENTS.md, docs/decisions/, a Spec Kit constitution, and generated skills).

## How "nothing missing" is made checkable
No hand-written list can be proven complete, and the rules move. So the system makes gaps visible:
1. Router flags choose a tier (T1 to T5) and the modules to load.
2. Every question carries `covers` tags pointing at checklists in `knowledge-packs/standards-coverage-backbone.yaml`. `tools/validate.py` lists tags with no question.
3. Three answer states only: answered, deferred (owner and revisit trigger), not applicable (reason). Deferred items become tracked risks.
4. Gates block irreversible steps (for hardware: design freeze, production, launch).
5. Contradiction rules catch impossible combinations.
6. Each module ends with an unknown-unknowns probe.
7. Facts live in versioned packs with `last_verified` dates and sources.
8. Expert escalation: regulated and safety-critical work produces briefs for qualified people. A beginner cannot continue alone on T5.

## Tiers
| Tier | Example | Loads |
|---|---|---|
| T1 | Static site, script, CLI | product, stack, deploy |
| T2 | Web app with accounts | + auth, security, quality |
| T3 | Payments, multi-tenant, sensitive data, or AI | + extensions |
| T4 | Connected hardware / IoT | + H1 to H12 |
| T5 | Safety-critical or regulated | + safety-critical extension and expert flags |

## Beginner mode
Each step is a six-part card: why, choose, do, verify, if it fails, gate (plus undo). The golden path (stages 0 to 11) puts a safety net before secrets and deploys an empty page before building features. Add-ons like Redis are chosen by symptom, and "skip it for now" is a valid, recorded answer.

## Spec Kit integration
Spec Kit's flow is constitution, specify, clarify, plan, tasks, analyze, implement. This tool sits before it: answers generate the constitution, stack decisions pre-fill the plan step, and `specify init` runs last. Hardware artifacts (BOM review, certification plan, hazard analysis) are not covered by Spec Kit and should be built as a preset or extension. Install from the official repository and pin a release tag.

## Commands
`scaffold init`, `doctor`, `next`, `explain <term>`, `stuck`, `undo`, `coverage`, `update`, `audit`.

## Generated skills
The scaffolder writes project skills (see `skills/project-templates/`) into each new project's `.claude/skills/` so every AI session loads the recorded decisions. It also ships a skill describing how an agent drives the CLI.

## Limits
The tool cannot certify anything or replace a lab, a safety engineer, or a lawyer. Packs go stale; each shows its date and links to sources.
