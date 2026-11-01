# Research

Reference: tools/run_scenarios.py; contracts: specs/question-format.md and specs/expressions.md.
Baseline: strict validator and all nine Python scenarios pass; shared Python vectors pass.

Decisions:
- Use the loaded router order for first-match routing and cumulative lower-tier inclusion.
- Expand additions against already loaded portable paths, using Node's built-in POSIX glob matcher.
  This performs no filesystem traversal and installs no glob package.
- Keep all loaded questions in the inspection snapshot; select depth/stage queues separately.
- Required_when does not hide questions. Only router ask_when and module load_when filter visibility
  in this task, matching the reference.
- Suppress actionable questions on stop, but preserve the loaded safety questions and stop reasons
  for later expert-brief generation. No brief is generated here.
- Preserve whole question/module data in results; do not copy teaching content into code.

## Execution Evidence

Both the persona harness and focused engine suite first failed on the missing engine module.
All nine original YAML acceptance files then passed, with no edits to them. The harness asserts
every expectation key was consumed, so adding an unsupported assertion causes a test failure.

A protected-depth test initially selected a software fixture with no required_when question.
Its fixture was corrected to the existing hardware persona; the expectation remained rejection
of a protected full_only exclusion. This did not alter any acceptance expectation or budget.

Seven focused tests pass. False recommended defaults reduce needs-input counts without becoming
answers. Hardware quick is standard. Stops preserve evidence and return an empty action queue.

A separate exact comparison generated snapshots from tools/run_scenarios.py functions into
ignored .tooling-build/decision-oracle.json and compared them with the compiled TypeScript engine.
All nine matched for tier, file order, full/standard/quick question order, stage groups, gates,
flags, applicable failures, contradictions, stop-rule IDs, and stop result. No oracle data or
question content is embedded in application code. Typecheck and lint passed after implementation.
