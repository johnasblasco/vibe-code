# Gap analysis: what the kit was missing, how we found it, what is still missing

Date: 2026-10-31. This is an honest audit of the first version of the kit, done by testing it rather than re-reading it.

## The idea behind it
The first version worked forward: ask questions, record answers. A project fails backward: it fails in specific, repeatable ways. Reversing the approach (start from known failures, then prove each is prevented) exposed gaps that re-reading never would.

## Found by building the missing pieces (the kit contradicted itself)
| # | Problem | How it showed up | Fix |
|---|---|---|---|
| 1 | Skill templates used 15 placeholders; none were connected to any question, and `project_name` had no question at all | Writing `outputs/bindings.yaml` | Bindings file, `product.name` question, validator checks every placeholder |
| 2 | `load_when` and `required_when` expressions had no defined syntax and used inconsistent forms (bare words, `mentions`) | Writing an evaluator | Grammar, safe evaluator, unit tests, all expressions parsed and checked against known ids |
| 3 | The router's harm options did not match the hardware safety question's options | Evaluating tier rules | Options aligned |
| 4 | "Quick, standard, full" depth was named but not implementable | Trying to count questions | `depth-profiles.yaml` plus protected-question rules |
| 5 | Contradiction rules were promised in the plan but not written | Reading our own docs | 18 rules, including router-consistency |
| 6 | "Generate AGENTS.md, constitution, ADRs" had no templates | Reading our own docs | 12 templates, with pinned-action CI and a Postgres compose file |

## Found by running scenarios (the engine was wrong)
| # | Problem | Fix |
|---|---|---|
| 7 | Extension questions (mobile, command-line packages, AI) never loaded for T1 and T2 projects, because extensions were attached only to T3 | Extensions now load at every tier and gate themselves with `load_when` |
| 8 | A beginner's to-do app would be asked 133 questions at standard depth (243 for a device), 57 of them before any code | Questions are scheduled by project stage, hardware flags are asked only for physical projects, recommended defaults added; idea stage is now 43 asks, 26 needing thought. Budgets are enforced in the scenario tests |
| 9 | Nothing checked a user who says "hardware device" but answers "no" to every physical question | Rule C-019 |

## Found by attacking the tester (the validator was wrong)
| # | Problem | Fix |
|---|---|---|
| 10 | The validator skipped dotfiles, so `.env.example`, `.github/workflows/ci.yml` and other templates were never checked | Directory walk instead of glob; 10 deliberate-error tests confirm each check fires |

## Missing content added, from research
- **AI-assisted development hygiene.** Models invent package names and attackers register them (slopsquatting). One study found at least 5.2% of packages suggested by commercial models were invented, and a name that exists is not proof it is safe. Invented dependencies have also spread through agent skill files. New questions: dependency policy and checks, outdated-API guard, diff review, commit cadence, skills policy.
- **Hardware field reliability.** Update bricking, flash wear, expired certificates, config overwritten by updates, hardware-revision mismatch. 21 new hardware questions across field reliability, electrical design practice, and compliance documents (labelling, export control, open-source licence conditions, warranty, counterfeit parts).
- **Product validation, team process, data lifecycle, resilience, security extras** (SSRF, CSRF, admin areas, CI hijacking, lockfiles), and extension packs for packages and CLIs, data and ML pipelines, browser extensions and desktop apps.
- **Pre-mortem catalog:** 61 failure modes (28 software, 9 AI-assisted development, 24 hardware), each linked to the questions, cards, templates, skills, and packs that prevent it. 27 cite a source; 34 are engineering practice that still needs a citation.
- A glossary (51 terms), a troubleshooting library with redaction rules, and stale-version protection (Node.js changed LTS line on 2026-10-28; generated files must never hardcode versions).

## Still missing (be honest about these)
1. **The CLI engine does not exist.** This kit is data, specs, tests, and reference tools. Scenarios and `tools/run_scenarios.py` are the acceptance tests for the real engine.
2. **Step cards cover stages 0 to 5 only.** Stages 6 to 11 are specified but not written. Windows variants exist only as a rule and one fix.
3. **Many hardware questions are free text but behave like checklist items.** Asking 243 questions in total (spread over weeks) is still heavy; convert them to confirm-and-note checklists.
4. **No real beginner has used it.** Wording, order, and defaults are untested with people. This is the largest risk.
5. **Unverified names.** OWASP ASVS 5.0 chapter names, OWASP Top 10:2025 category names, and ETSI EN 303 645 provision names were written from memory.
6. **Packs rest on secondary sources.** Confirm against primary sources before shipping. Postgres, Redis or Valkey, and gitleaks versions are intentionally empty until resolved at scaffold time.
7. **Regions.** Only EU and US rules are covered. Other countries' radio approval, privacy, consumer, and import rules are not.
8. **Domains not covered:** games, realtime media, robotics and drones, automotive, e-commerce specifics, blockchain, accessibility testing procedures.
9. **Idea intake.** Letting a user paste a paragraph and having the tool propose answers is designed in `06-scaffolder-requirements.md` but not specified at field level.
10. **Skills are untested.** None has been through the skill-creator evaluation loop.
11. **Evidence gaps.** 34 failure modes have no citation.

## How to keep finding gaps
Every real incident, support case, or surprised user becomes a failure-mode entry and, if the kit would not have prevented it, a new question, card, or rule. A failure with no prevention is a defect in the kit.
