# Research: Loader and Expressions

Date: 2026-11-01.

Use yaml 2.9.1, verified in https://eemeli.org/yaml/ and the official npm versions page:
https://www.npmjs.com/package/yaml?activeTab=versions . User approved installation.
The install attempt failed with EACCES reaching registry.npmjs.org; no successful install claimed.
The documented parser offers duplicate-key checks, document errors/warnings, and alias limits.
Use YAML 1.2 core scalar resolution so dates remain human-readable strings rather than Date objects.
Reject parser warnings as well as errors; this rejects unknown tags instead of accepting fallback values.

Node filesystem typings need @types/node 26.6.6. Name, published version, and TypeScript 6 support
were verified at https://www.npmjs.com/package/%40types/node?activeTab=versions . Approval received.
Its installation attempt also failed with EACCES reaching the official npm registry.
Both packages were subsequently installed by the user in a terminal with registry access.
The installed versions and synchronized lockfile have now been verified locally.
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

## Loader Preparation Evidence (Before Successful Installation)

Loader and direct shared-vector tests first failed with a missing src/data/loader.js module.
The implementation is now written, but those suites stop on missing yaml, and typecheck stops
on missing yaml and Node types. No claim is made that the loader passes. Both approved direct
dependencies are now declared in package.json. The lockfile cannot be synchronized until
installation succeeds; do not use npm ci until npm install has resolved these approved additions.
Existing user staging was present at the start of this turn and has not been altered.

## Final Local Verification

- npm ls --depth=0 confirms yaml 2.9.1 and @types/node 26.6.6 alongside the approved toolchain.
- npm run lint and npm run typecheck: exit 0.
- npm test: 5 files passed, 84 tests passed, including direct YAML shared-vector loading.
- npm run test:tooling: all 5 checks passed, including deliberate lint, type, and assertion failures.
- Direct Node invocation of loadKit: 42 authoritative YAML documents loaded. Counts: question-bank
  18, failure-modes 3, rules 2, beginner-course 10, knowledge-packs 8, outputs 1.
- Strict Python validator: no structural errors or required gaps. Existing unresolved tool versions
  and optional asvs:webrtc coverage warning remain visible.
- Python scenarios: 9/9 passed. Python expressions: 30 vectors and 7 error cases passed.
- Python Windows-path regression: passed. Source YAML, vectors, scenario expectations, and budgets
  remain unchanged. git diff --check passes.

The user's audit JSON identifies one root advisory, GHSA-g3hv-75wg-m249 in minimatch 10.2.6,
propagated through ten other lint-tool packages. docs/dependency-audit.md records the primary
sources, the failing lockfile regression test, and a candidate scoped override to 11.0.3.
Installation approval and compatibility/audit verification remain pending. No clean audit is
claimed. No forced fix or package installation was made. Hosted CI remains unrun in this session.
