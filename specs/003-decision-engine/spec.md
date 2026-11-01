# Feature Specification: Decision Engine

Created: 2026-11-01. Status: implemented and verified locally.

## User Scenarios & Testing

### US1 - Route a project from its answers (P1)

Given answers and loaded kit data, select the first matching tier, load cumulative file additions,
and filter modules by tier_min and load_when. Acceptance: all nine unchanged persona files pass
against TypeScript, including applicability, contradictions, gates, and stop expectations.

### US2 - Ask questions at the appropriate depth and stage (P1)

Return quick, standard, and full selections and group questions by stage. T4/T5 quick requests
become standard. Respect full_only exclusions and protected questions. Idea budgets count visible
router flags and distinguish questions with defaults using property presence, including false.
Acceptance: unchanged scenario budgets pass, focused stage tests prevent future-stage questions
entering an idea queue, and stop decisions return no actionable queue.

## Requirements

- Load all content through the existing YAML loader. Never embed tier conditions or questions.
- Preserve the Python reference's ordered file expansion, deduplication, module filters, question
  IDs, named gate collection, applicable failure modes, contradictions, and stop conditions.
- Provide an inspectable decision snapshot and a stage/depth-specific actionable queue.
- Do not infer or accept recommended defaults, mutate supplied answers, save state, generate
  briefs or files, prompt users, or run external commands.
- Fail explicitly for missing engine documents, malformed structural data, unsupported depths,
  unknown stage requests, invalid tier references, or protected full_only exclusions.
- Preserve all nine acceptance files, shared vectors, source YAML, and budgets.

## Success Criteria

All nine scenarios pass against TypeScript; all expected fields are exercised. Additional tests
cover depth/stage behavior, cumulative low-tier extensions, hardware floors, fail-closed errors,
immutability, and stop enforcement. Existing TypeScript, tooling, dependency, and Python checks pass.

## Scope

This task computes gate names and applicable failure modes only. Live gate verification,
pre-mortem ranking/output, state/resume, interview UI, and recommendations are later tasks.
Question required_when marks an obligation, not a visibility condition: retain those questions
as the Python reference does. No additional package installation or commits are needed.
