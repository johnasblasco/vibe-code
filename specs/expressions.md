# Expression language

Used in `load_when`, `required_when`, router tier `when`, contradiction rules, failure-mode `applies_when`.
Reference implementation: `tools/expr.py` (no `eval`). Port the same grammar to the CLI and keep `tools/test_expr.py` as the shared test list.

```
expr   := or
or     := and ('or' and)*
and    := not ('and' not)*
not    := 'not' not | cmp
cmp    := atom (('==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'contains') atom)?
atom   := number | 'string' | true | false | otherwise | identifier | '(' expr ')' | '[' atom (',' atom)* ']'
```

- Identifiers are router flag ids (`physical`) or question ids (`product.platform`). The validator rejects unknown identifiers.
- Strings are single-quoted: `product.platform == 'mobile_app'`. Bare words are identifiers, never strings.
- `x contains 'a'` is true when answer `x` (a multi-select list or text) includes `'a'`. `x in ['a','b']` is true when `x` equals one of them.
- An unanswered identifier is `None`. **Every `==`, `!=`, `<`, `<=`, `>`, `>=`, `contains`, and `in` that involves an unanswered question is false**, including `!=` and `x == y` when both are unanswered. A rule therefore never fires because a question has not been answered yet.
- Exception, on purpose: `not x` is true when `x` is unanswered. Never write `not x` alone as a rule or a profile condition; pair it with a positive condition, as in `product.platform == 'hardware_device' and not physical`.
- The behaviour is defined by `tests/expr-vectors.yaml`. Every implementation (Python reference, TypeScript port) must load that file and pass every case. If the prose and the vectors ever disagree, fix both in the same change.
- Possible future change: three-valued logic (true, false, unknown) would remove the `not x` trap. It is not adopted because it makes every rule harder to reason about for authors.
- `otherwise` is true. Use it only as the last tier rule.
- Tiers are evaluated top to bottom; the first match is the project's tier. Loads are cumulative downwards.
