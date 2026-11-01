# Scaffolder Constitution

## Core Principles

### I. Data Is the Source of Truth

The engine MUST load questions, failure modes, recommendations, teaching content, and facts
from the repository's YAML assets. It MUST NOT copy their content into application code.
Question IDs MUST remain stable; retired IDs MUST stay readable. Generated files MUST use
outputs/bindings.yaml, contain no unresolved placeholders, and never guess values.

### II. Test First and Preserve Acceptance Contracts

Each implementation step MUST begin with a test and an observed failure before code changes.
The TypeScript engine MUST consume the nine existing scenario files and shared expression
vectors directly. Test expectations, coverage tags, and budgets MUST NOT be weakened to pass.
Comparisons involving unanswered values MUST return false; not retains the documented exception.

### III. Protect the User and Their Machine

Commands MUST use executable names and argument arrays, never shell strings assembled from
answers. Validate paths before writes. Never run against production systems. Never request,
print, or commit secrets. Reject secret-shaped state values. Redact diagnostics and preview
before explicit approval to share. Telemetry MUST default to off. Gates MUST be verified from
checks rather than trusted state claims. Dangerous actions MUST offer a dry run and require
typed confirmation. Updates MUST satisfy the threat model's integrity requirements.

### IV. Verify Dependencies and Changing Facts

Before installing ANY package, state its exact name, verify it in official documentation,
look up its current version, and wait for explicit user approval. Never invent package names.
Dependencies MUST be pinned and locked. CI actions MUST use verified full commit hashes.
Changing facts MUST carry sources and verification dates in knowledge packs. Live lookups
MUST use official hosts and validate returned values. No install lifecycle scripts may be
added to the CLI. Third-party skills require prior inspection and a pinned version.

### V. Guide Beginners Honestly

Ask questions at their specified stage and respect depth profiles and budgets. Support exactly
three answer states: answered with a value, deferred with owner and revisit trigger, and not
applicable with reason. Persist after each answer. Record manual checks honestly. Handle Ctrl+C.
Support Windows, macOS, Linux, and accessible plain-text output. Teaching content MUST live in
data. Regulatory outputs MUST identify qualified expert follow-up. Never claim certification
or compliance, or guarantee safety or security.

## Technical Constraints

The application lives at the repository root and uses TypeScript, Node.js, ESM, commander,
@clack/prompts, and Vitest. Python tools are behavioral references, not the runtime engine.
Existing YAML, templates, specs, scenarios, and expression vectors remain authoritative.
The first feature is tooling and CI only, without interview or engine features.

## Development Workflow

Read AGENTS.md first in every new session, then the relevant repository skill and design.
Work through the user's nine tasks in order, in small test-first steps. Resolve material
ambiguities with the user. Do not stage changes or create commits: the user withdrew commit
authorization. If later reauthorized, keep commits atomic by feature, fix, or documentation concern.
Exclude unrelated user changes. Show actual command
output and report failures and limitations without claiming unrun checks.

After changes, run python tools/validate.py --today YYYY-MM-DD --strict,
python tools/run_scenarios.py, and python tools/test_expr.py, plus relevant TypeScript checks.
Review every reported gap. Missing prerequisites block checks; they do not constitute passes.
Never delete files without asking. New real failures require a failure-mode entry, prevention,
and scenario as described in AGENTS.md.

## Governance

This constitution records the user's rules and repository constraints for Spec Kit plans and
reviews. Explicit user instructions take precedence. Amendments MUST record their rationale,
update the version and amendment date, and identify affected plans or tasks. Use semantic
versioning: major for incompatible principle changes, minor for new requirements, and patch
for clarifications. Review each feature's plan and final diff against these principles.

**Version**: 1.0.1 | **Ratified**: 2026-11-01 | **Last Amended**: 2026-11-01
