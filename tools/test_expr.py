import sys, os
import yaml
sys.path.insert(0, os.path.dirname(__file__))
from expr import check, parse, identifiers, ExprError

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V = yaml.safe_load(open(os.path.join(ROOT, "tests", "expr-vectors.yaml"), encoding="utf-8"))
fails = []
for c in V["cases"]:
    got = check(c["expr"], c["env"])
    if got != c["expect"]:
        fails.append(f"{c['expr']!r} with {c['env']} -> {got}, wanted {c['expect']}")
for bad in V["errors"]:
    try:
        parse(bad); fails.append(f"should have raised an error: {bad!r}")
    except ExprError:
        pass
assert identifiers(parse("a and b.c == 'x' or d in ['y']")) == {"a", "b.c", "d"}
if fails:
    print("\n".join(fails)); sys.exit(1)
print(f"expr tests passed ({len(V['cases'])} vectors, {len(V['errors'])} error cases)")
