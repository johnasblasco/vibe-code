# Architecture notes

```
scaffold init
  ├─ load packs, question-bank, golden-path
  ├─ router: ask flags -> tier -> module list
  ├─ interview loop: question -> state(answered|deferred|n/a) -> save state file
  ├─ gate check before each stage
  ├─ beginner course: card -> do -> verify (auto/manual) -> gate
  └─ outputs: AGENTS.md/CLAUDE.md, docs/decisions/, constitution, .claude/skills/
```

## Commands
`init`, `doctor`, `next`, `explain <term>`, `stuck`, `undo`, `coverage`, `update`, `audit`.

## Data contracts
Question, step card, and pack formats are in `specs/`. The coverage backbone is `knowledge-packs/standards-coverage-backbone.yaml`.

## Outputs per tier
- All tiers: project instruction file, decisions log, deferred-items list, project skills.
- T2+: security checklist, access-control test.
- T4+: hardware facts folder, certification brief, gate report.
- T5: expert brief and a stop for beginners.

## Design decisions to record as ADRs
State-file format, how expressions in `required_when` and `load_when` are evaluated (use a small safe evaluator, never `eval`), and how live pricing fetches fall back to packs.
