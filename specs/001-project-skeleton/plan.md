# Implementation Plan: Project Skeleton

**Feature**: 001-project-skeleton | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)
**Status**: In progress; package installation blocked by session network permissions.

## Summary

Create development tooling at the repository root, with no application features. Use TypeScript
ESM, ESLint, and Vitest. Run identical checks in CI across Windows, macOS, and Linux.
Keep existing data and acceptance contracts unchanged. Do not stage or commit changes.

## Technical Context

**Language/Version**: TypeScript 6.0.3 proposed; official typescript-eslint support excludes 7.x.
**Runtime**: Installed Node 26.13.0; CI runtime pin still requires official release verification.
**Primary Dependencies**: typescript, eslint, @eslint/js, typescript-eslint, vitest.
**Reference Dependency**: PyYAML 6.0.3 approved; local installation failed.
**Storage**: No application state; tooling configuration and eventual lockfile only.
**Testing**: Vitest; targeted negative fixtures for lint, type errors, and failing assertions.
**Target Platform**: Windows PowerShell, macOS, Linux.
**Project Type**: CLI development skeleton; no executable application commands yet.
**Performance Goals**: Checks terminate without watch mode; no new performance budget.
**Constraints**: No package installation without approval; no implicit npx downloads; no commits.
**Scale/Scope**: One root project, one workflow, three local validation commands.

## Constitution Check

- Data authority: existing YAML and templates stay unchanged.
- Test first: write each tooling acceptance test, observe failure, then implement configuration.
- Threat boundaries: no application execution, production access, or secret handling.
- Supply chain: exact versions and action hashes require official-source evidence.
- Beginner scope: no interview, routing, generation, or teaching implementation in this feature.
- User steering: no staging, commits, or branch mutations.
- Baseline: all three Python checks currently stop because PyYAML is absent.

Pre-design review: scope conforms. Package approval and action/runtime source verification are
complete. Implementation gate remains blocked on installation, reference baseline, and final
dependency graph verification. See research.md for actual command results.

## Project Structure

### Documentation

specs/001-project-skeleton/spec.md
specs/001-project-skeleton/checklists/requirements.md
specs/001-project-skeleton/plan.md
specs/001-project-skeleton/research.md

Data-model and interface-contract artifacts are unnecessary: this skeleton exposes no application
interface and persists no domain entities. Add a quickstart when exact setup commands are verified.
Generate tasks only after research prerequisites are resolved.

### Source Code (repository root)

package.json                  ESM metadata and lint, typecheck, test scripts
package-lock.json             Approved dependency graph
.npmrc                        Exact save behavior and install-script policy
.gitignore                    Generated tooling artifacts and local environment exclusions
eslint.config.js              Flat lint configuration
tsconfig.json                 Strict typecheck configuration
vitest.config.ts              Non-watch test discovery and fixture exclusions
src/                          Minimal module boundary only; no application features
tests/tooling/                Skeleton validation and negative fixtures
.github/workflows/ci.yml      Verified action hashes and platform matrix

Do not create future application module directories until their feature needs them.

## Implementation Sequence

1. Obtain approval for PyYAML, create a local environment, and record all reference check results.
2. Finish official version, peer-dependency, runtime, and action-hash verification; obtain approval
   for the exact development packages before installing any of them.
3. Write a tooling acceptance test first and record its failure before adding project configuration.
4. Implement ESM metadata and the three validation commands with exact dependencies and lockfile.
5. Verify lint, typecheck, and test failure propagation with isolated fixtures; exclude deliberate
   failures from normal discovery without suppressing real application failures.
6. Add CI using checkout, runtime setup, and Python setup actions pinned to verified full hashes;
   use empty default permissions, read-only source access, and disable checkout credential persistence.
7. Document tested commands and dependency evidence. Run all local checks and Python references.
8. Review changes and report real results. Leave all changes unstaged and uncommitted.

## Complexity Tracking

No exceptions proposed. Unresolved verification is a blocker rather than a waived requirement.
