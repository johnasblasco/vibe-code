# Expression Module Contract

Module: src/expressions/index.ts.

- parse(source: string): Expression; throws ExprError for empty or unsupported syntax.
- evaluate(node: Expression, environment: Environment): Value.
- check(source: string, environment: Environment): boolean.
- identifiers(node: Expression): Set<string>; includes identifiers inside nested lists.

The grammar is specs/expressions.md; the shared conformance source is tests/expr-vectors.yaml.
Boolean operators short-circuit. An identifier lookup never traverses an object path or reads
an inherited property. Comparisons with an unanswered operand return false. The documented
not exception remains true. No expressions are passed to eval, Function, a shell, or a process.

The YAML loader is implemented in src/data/loader.ts:

- parseYaml(source: string, path: string): Readonly<Record<string, unknown>>.
- loadYamlFile(root: string, path: string): Promise<LoadedDocument>.
- loadKit(root: string): Promise<LoadedKit>.

Loader failures use DataError and identify the relative file without including input excerpts.
Kit documents are sorted by portable root-relative path. The loader does not perform complete
domain-schema or coverage validation and does not authenticate downloaded updates.
