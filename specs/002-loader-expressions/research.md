# Research: Loader and Expressions

Date: 2026-11-01.

Use yaml 2.9.1, verified in https://eemeli.org/yaml/ and the official npm versions page:
https://www.npmjs.com/package/yaml?activeTab=versions . User approved installation.
The install attempt failed with EACCES reaching registry.npmjs.org; no successful install claimed.
The documented parser offers duplicate-key checks, document errors/warnings, and alias limits.
Use YAML 1.2 core scalar resolution so dates remain human-readable strings rather than Date objects.
Reject parser warnings as well as errors; this rejects unknown tags instead of accepting fallback values.

Node filesystem typings need @types/node 26.6.6. Name, published version, and TypeScript 6 support
were verified at https://www.npmjs.com/package/%40types/node?activeTab=versions . Approval pending.
No custom ambient Node declarations will replace the official definitions.

Expression reference: tools/expr.py; shared acceptance: tests/expr-vectors.yaml.
Use a recursive-descent parser and an explicit AST interpreter. Never eval or Function.
Identifiers are dotted flat keys, not object-property traversal. Access only own environment keys.
Preserve Python truthiness for empty lists and the string false, numeric boolean equality, and
recursive list equality instead of relying on JavaScript coercion or reference identity.

Baseline: strict validator passes; 9/9 Python scenarios pass; 30 expression vectors and 7 errors pass.
Existing optional uncovered tag and unresolved version-pack values remain recorded source gaps.

## Expression Implementation Evidence

The supplemental suite first failed because the module did not exist. It then reproduced a
Python list-ordering difference before that behavior was implemented. All 25 tests now pass.
Lint and typecheck pass with no new dependencies installed.

Independent shared conformance also passed: compile the expression module with the existing
TypeScript compiler, read the unchanged YAML vectors using installed PyYAML, and pass their
JSON representation through stdin to the compiled TypeScript evaluator in Node. Result:
30 vectors and 7 syntax-error cases passed. This is verification only, not a Python-backed
application loader. Direct Node YAML integration tests remain pending dependency installation.

The explicit written rule for unanswered comparisons is applied to both operands of contains
and in. The Python reference only guards one side for those operators; tests cover the stated
contract's false result for an unanswered right operand instead of propagating TypeError.
