# Implementation Plan: Loader and Expressions

**Feature**: 002-loader-expressions | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)
**Status**: Expression core implemented; loader dependency installation pending.

## Summary

Load authoritative local YAML through a single read-only boundary, then evaluate declarative
expressions using a recursive-descent parser and explicit interpreter. No routing or prompts.

## Technical Context

Language: TypeScript 6.0.3, Node 26.13.0, ESM.
Dependencies: yaml 2.9.1 (approved; registry fetch blocked); @types/node 26.6.6 (approval pending).
Testing: Vitest, unchanged shared YAML vectors, real repository assets, malformed-input tests.
Storage: read-only filesystem access; no persisted state.
Platforms: Windows, macOS, Linux; all document paths use forward slashes.
Scope: six YAML source trees, bindings, expression parsing/evaluation and identifier extraction.
No performance budget is introduced or relaxed.

## Constitution Check

Data remains in YAML; syntax tokens and source-directory names are engine structure only.
Tests precede code, with recorded missing-module and semantic failures.
No eval, Function, shell execution, prompts, production connections, or generated files.
All nine scenarios, shared vectors, and question budgets remain unchanged.
Package names/versions are researched before approval; no staging or commits authorized.
Gate: expression core can proceed independently; loader installation and validation remain blocked.

## Project Structure

src/expressions/index.ts       AST, parser, evaluator, boolean wrapper, identifier traversal
src/data/loader.ts             safe YAML parse, contained file reads, deterministic kit discovery
src/data/types.ts              loaded document and kit interfaces
 tests/unit/expressions.test.ts supplemental grammar and Python-semantic checks
 tests/unit/expr-vectors.test.ts direct consumption of tests/expr-vectors.yaml
 tests/unit/loader.test.ts      authoritative-file inventory and malformed/path input checks

Existing src/index.ts stays an empty boundary until a public interface is intentionally designed.
Tests import internal modules directly. No duplicate question or recommendation content in source.

## Design and Contracts

Expression values are null, boolean, number, string, and recursive lists. Missing environment
keys are null; inherited object keys are never answers. Parsed expressions are a discriminated
AST. parse returns the AST, evaluate returns a value, check returns a boolean, identifiers returns
a set. ExprError represents invalid syntax or invalid membership operand types.

loadKit(root) returns every YAML document under the six source trees as root-relative paths and
parsed mapping values. loadYamlFile(root, path) reads one contained file, for shared vectors too.
parseYaml(source, path) rejects duplicate keys, unsupported tags, malformed documents, non-mapping
roots, and alias expansion beyond the parser's documented default. Failures identify the relative
file without including source text. Symlinks inside data trees are rejected, not followed.

## Implementation Strategy

1. Record the Python baseline and approved/needed package evidence.
2. Add supplemental expression tests; observe failure, implement core, and run checks.
3. Obtain and install verified loader prerequisites without lifecycle scripts.
4. Add shared-vector, inventory, malformed-data, and traversal tests before loader implementation.
5. Implement loader and run shared vectors directly, plus parse every expression in real assets.
6. Compare selected edge cases with Python and record any unresolved differences explicitly.
7. Run lint, typecheck, all tests, tooling probes, and all required Python checks.
8. Update quickstart and task status; report actual limits without staging or commits.

## Complexity Tracking

No exceptions proposed. No semantic-validator or decision-engine work is hidden in this step.
