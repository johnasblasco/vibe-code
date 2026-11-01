# Feature Specification: CLI Threat-Model Hardening

**Created**: 2026-11-01
**Status**: Implemented and locally verified; release prerequisites remain explicit
**Input**: Review the CLI against docs/07-threat-model-cli.md and show code and tests for every threat.

## User Scenarios & Testing

### User Story 1 - Refuse altered instructions (Priority: P1)

A beginner must not receive instructions or generated files from an altered kit.

**Independent test**: Change a pack or template in a disposable kit copy and invoke the CLI.

**Acceptance scenarios**:

1. Given a reviewed kit, when help or another command starts, its complete asset inventory is verified before any prompt, project write, subprocess or lookup.
2. Given a changed, missing, additional or linked asset, or absent/malformed inventory, when any command starts, it fails with a generic diagnostic and no action.
3. Given successful verification, when on-disk content later changes, generation uses the verified snapshot rather than altered instructions.

### User Story 2 - Keep private input and execution boundaries safe (Priority: P1)

A beginner can supply names and metadata without causing command execution or disclosing credentials.

**Independent test**: Use synthetic secrets, malicious names, planted repository instructions and invalid remote responses through existing command boundaries.

**Acceptance scenarios**:

1. Credential-bearing URLs and authorization headers are refused before persistence or remote checks, without echoing input.
2. Shell punctuation in a project name cannot execute a command or escape the output directory.
3. Repository instructions do not activate an AI feature; unavailable update, stuck, AI and hook-install operations remain unavailable.
4. Lookups containing a mismatched commit or disallowed endpoint cannot become generated pins.
5. Repeated current checks and existing consent/cancellation protections remain intact.

### User Story 3 - Review evidence and release limits (Priority: P2)

A maintainer can assess every threat using a report with precise implementation and regression-test references.

**Independent test**: Compare all 11 threat rows with the report, run its commands, and check that release gaps are explicit.

**Acceptance scenarios**:

1. Every threat has code references, test references, observed results and remaining limits.
2. Checksums are described as dependent on a trusted checkout; they are never presented as authenticated signatures or protection against simultaneous code/manifest compromise.
3. Registry provenance, account 2FA, clean published install and independent external testing remain release prerequisites when unverified.
4. Existing persona expectations and question budgets remain unchanged.

### Edge Cases

Cross-platform line endings; duplicate inventory keys; missing and extra assets; directory links;
changes after verification; typed consent declined/cancelled; credential formats without a password;
wrong hashes with valid syntax; unpublished package; inspection APIs used directly with untrusted fixtures.

## Requirements

- **FR-001**: Verify the complete instruction/data inventory before CLI actions; refuse unverified content.
- **FR-002**: Use verified content snapshots throughout each CLI invocation.
- **FR-003**: Keep inventory regeneration a separate explicit maintainer action which shows changed paths; never auto-accept edits during CLI startup.
- **FR-004**: Preserve YAML authority, stable IDs, existing budgets and test expectations.
- **FR-005**: Extend secret refusal and test actual persistence/CLI boundaries without printing synthetic credentials.
- **FR-006**: Enforce execution/network/dependency policy in repeatable local and CI checks without installing new packages.
- **FR-007**: Map all 11 threats to concrete evidence and state partial/unverified protections honestly.
- **FR-008**: No production calls, package installation, registry publishing, staging or commits.

### Key Entities

- **Reviewed inventory**: schema, algorithm, sorted asset paths and content digests, anchored in a trusted source checkout.
- **Verified snapshot**: validated content used during one CLI invocation.
- **Threat evidence**: threat, implementation, tests, actual result and residual limit.

## Success Criteria

- All 11 threats have actionable evidence and explicit limitations.
- Each reproduced attack is blocked before its protected side effect.
- All 9 persona scenarios pass with unchanged expectations and budgets.
- Required local checks pass; unrun external checks are not described as passing.

## Assumptions

This is a review and hardening of the existing commands. It does not add AI, diagnostics sharing,
remote pack updates, hook installation or package publishing. The installed CLI code and reviewed
inventory originate from a trusted checkout. Checksums detect asset changes relative to that
inventory; a signed distribution and independent release review are separate prerequisites.
