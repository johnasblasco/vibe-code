# Data Model

Expression: discriminated AST nodes for literal, identifier, list, not, and, or, and comparison.
No node contains executable code. Identifiers are flat keys, including dotted keys.

Value: null, boolean, number, string, or a recursive list of values. Environment: a read-only
mapping from identifier to value; absent and inherited keys are treated as unanswered (null).

LoadedDocument: portable root-relative path and parsed YAML mapping. LoadedKit: ordered
documents, with no copied question content and no mutable global cache.

No persisted state, migrations, or answer-state transitions are introduced by this feature.
