# Feature Specification: Loader and Expressions

**Created**: 2026-11-01
**Status**: Implemented; local acceptance and dependency compatibility checks pass
**Input**: Load all YAML files and port tools/expr.py and tools/test_expr.py to TypeScript.
Same grammar, same shared tests. No decision-engine or interview features yet.

## User Scenarios & Testing

### US1 - Read authoritative project data (P1)

A maintainer loads all YAML under question-bank, failure-modes, rules, beginner-course,
knowledge-packs, and outputs without duplicating content in application source.

Independent test: discover all YAML in these directories and compare the loader's document
paths and values to the real assets. Editing fixture data must change the loaded result.

Acceptance: deterministic portable paths; nested files included; no writes or execution;
malformed YAML reports its file; duplicate keys, unsafe tags, and alias abuse are rejected;
missing roots and invalid documents fail explicitly rather than producing partial success.

### US2 - Evaluate declarative expressions (P1)

A maintainer evaluates the documented grammar without JavaScript evaluation or execution.

Independent test: load tests/expr-vectors.yaml directly and execute every case and parse-error
expectation against TypeScript. Also verify identifier extraction from tools/test_expr.py.

Acceptance: preserve precedence, grammar, comparison and missing-answer behavior, recursive
list equality, Python-style truthiness, and boolean short-circuiting. Reject unsupported syntax
and trailing input. All expressions in real assets must parse and reference known identifiers.

## Requirements

- FR-001: Load all YAML from the six authoritative directories, including nested files.
- FR-002: Keep parsed values as data; do not copy questions, recommendations, or facts into code.
- FR-003: Expose parsing, evaluation, boolean checking, and identifier extraction functions.
- FR-004: Consume shared expression vectors unchanged and preserve the Python test assertions.
- FR-005: Reject malformed input without executing code or leaking file contents in diagnostics.
- FR-006: Resolve source paths independently of the current working directory when given a root.
- FR-007: Preserve root-relative slash-separated document paths across platforms.
- FR-008: Fail closed on symlinks in data trees and reject path traversal in single-file reads.
- FR-009: Parse every expression in the loaded assets and validate identifier references in tests.
- FR-010: Do not alter scenarios, budgets, question IDs, source content, or install unapproved packages.

## Success Criteria

- All shared vectors and syntax-error cases pass in TypeScript and Python.
- Every authoritative YAML file is represented once with its original parsed content.
- Negative loader and expression tests fail before their implementation and pass afterward.
- Lint, typecheck, tooling checks, strict Python validator, and all nine Python scenarios pass.
- No routing, persistence, prompts, file generation, or public CLI commands are added.

## Assumptions and Scope

The root is provided explicitly. The loader reads local trusted kit directories, not updates.
Update signatures and full semantic validator/coverage reporting are later work; this step
checks parsing, document roots, and expression references without claiming complete validation.
Schema versions stay in data. Missing comparisons return false; not on a missing answer is true.
If the Python reference and written contract disagree outside the vectors, document and ask
before changing either acceptance contract. No staging or commits are authorized.
