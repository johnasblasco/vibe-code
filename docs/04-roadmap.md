# Roadmap

1. **Narrow path first.** One stack end to end (for example Next.js, Postgres, auth, one host) with beginner step cards for stages 0 to 5. Done here as data; build the runner.
2. **Core engine.** Load YAML, evaluate router flags and `load_when`, run the three answer states, persist progress in a state file, resume.
3. **Coverage.** Port `tools/validate.py` logic into `vibecode coverage` so users see their own gaps.
4. **Outputs.** Generate AGENTS.md/CLAUDE.md, `docs/decisions/`, a Spec Kit constitution, and project skills from `skills/project-templates/`.
5. **Verify runners.** `doctor`, secret-scan test, URL 200 check, database round-trip, row-level access test. Automated checks are the product.
6. **Security and deploy stages (6 to 11).** Write the remaining step cards.
7. **Knowledge packs in the loop.** Fetch live pricing and limits where possible; warn when stale; `vibecode update`.
8. **Hardware.** Enable H1 to H3 and the gates first, then the rest. Add contradiction rules. Recruit expert reviewers for regulatory and safety packs.
9. **Extras.** More stacks, extension packs, `vibecode audit` (check the project against its recorded decisions).

## Team skills
TypeScript and Node CLI engineering; rule and schema design; beginner-facing writing and UX (test with real beginners); security engineering (secrets, supply chain, threat modelling) with an external review; DevOps; and expert reviewers (embedded engineer, compliance consultant, safety engineer, privacy counsel) for the packs.

## Added after the gap analysis (see 05-gap-analysis.md)
- Build the engine against `tests/scenarios/` first; the scenarios are the acceptance tests.
- Write step cards for stages 6 to 11 with Windows, macOS, and Linux variants.
- Convert checklist-like hardware text questions into confirm-and-note items.
- Specify `scan` (existing projects) and idea intake at field level (see 06-scaffolder-requirements.md).
- Run a five-person beginner study on stages 0 to 5 before any public release.
- Replace secondary sources in packs with primary sources, and cite the 34 uncited failure modes or retire them.
- Add regions beyond EU and US, and the missing domains (games, robotics, automotive, e-commerce, accessibility testing).
- Threat-model review (`07-threat-model-cli.md`) before the first release.
