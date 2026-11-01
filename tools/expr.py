"""Tiny safe expression language used by load_when, required_when, tier rules, contradiction
rules and failure-mode applicability. No eval(). See specs/expressions.md.

  expr   := or
  or     := and ('or' and)*
  and    := not ('and' not)*
  not    := 'not' not | cmp
  cmp    := atom (('=='|'!='|'<'|'<='|'>'|'>='|'in'|'contains') atom)?
  atom   := number | 'string' | true | false | otherwise | identifier | '(' expr ')' | '[' atom (',' atom)* ']'
"""
import re

class ExprError(ValueError):
    pass

_TOKEN = re.compile(r"\s*(?:(?P<num>\d+(?:\.\d+)?)|(?P<str>'[^']*')|(?P<op>==|!=|>=|<=|>|<|\(|\)|\[|\]|,)|(?P<id>[A-Za-z_][A-Za-z0-9_.]*))")
_KW = {"and", "or", "not", "in", "contains", "true", "false", "otherwise"}

def _tokens(src):
    pos, out = 0, []
    src = src.rstrip()
    while pos < len(src):
        m = _TOKEN.match(src, pos)
        if not m or m.end() == pos:
            raise ExprError(f"unexpected character at {pos}: {src[pos:pos+12]!r}")
        pos = m.end()
        kind = m.lastgroup
        val = m.group(kind)
        if kind == "id" and val in _KW:
            out.append(("kw", val))
        elif kind == "num":
            out.append(("num", float(val) if "." in val else int(val)))
        elif kind == "str":
            out.append(("str", val[1:-1]))
        else:
            out.append((kind, val))
    return out

class _P:
    def __init__(self, toks):
        self.t, self.i = toks, 0
    def peek(self):
        return self.t[self.i] if self.i < len(self.t) else (None, None)
    def take(self, kind=None, val=None):
        k, v = self.peek()
        if k is None or (kind and k != kind) or (val is not None and v != val):
            raise ExprError(f"expected {val or kind}, found {v!r}")
        self.i += 1
        return v
    def parse(self):
        node = self.or_()
        if self.i != len(self.t):
            raise ExprError(f"unexpected {self.peek()[1]!r}")
        return node
    def or_(self):
        n = self.and_()
        while self.peek() == ("kw", "or"):
            self.i += 1
            n = ("or", n, self.and_())
        return n
    def and_(self):
        n = self.not_()
        while self.peek() == ("kw", "and"):
            self.i += 1
            n = ("and", n, self.not_())
        return n
    def not_(self):
        if self.peek() == ("kw", "not"):
            self.i += 1
            return ("not", self.not_())
        return self.cmp()
    def cmp(self):
        a = self.atom()
        k, v = self.peek()
        if (k == "op" and v in ("==", "!=", "<", "<=", ">", ">=")) or (k == "kw" and v in ("in", "contains")):
            self.i += 1
            return ("cmp", v, a, self.atom())
        return a
    def atom(self):
        k, v = self.peek()
        if k == "num": self.i += 1; return ("lit", v)
        if k == "str": self.i += 1; return ("lit", v)
        if k == "kw" and v in ("true", "false"): self.i += 1; return ("lit", v == "true")
        if k == "kw" and v == "otherwise": self.i += 1; return ("lit", True)
        if k == "id": self.i += 1; return ("id", v)
        if (k, v) == ("op", "("):
            self.i += 1
            n = self.or_()
            self.take("op", ")")
            return n
        if (k, v) == ("op", "["):
            self.i += 1
            items = [self.atom()]
            while self.peek() == ("op", ","):
                self.i += 1
                items.append(self.atom())
            self.take("op", "]")
            return ("list", items)
        raise ExprError(f"unexpected {v!r}")

def parse(src):
    if not isinstance(src, str) or not src.strip():
        raise ExprError("empty expression")
    return _P(_tokens(src)).parse()

def identifiers(node):
    t = node[0]
    if t == "id": return {node[1]}
    if t == "lit": return set()
    if t == "list": return set().union(*[identifiers(x) for x in node[1]])
    if t == "not": return identifiers(node[1])
    if t in ("and", "or"): return identifiers(node[1]) | identifiers(node[2])
    if t == "cmp": return identifiers(node[2]) | identifiers(node[3])
    return set()

def _truthy(x):
    if x is None: return False
    if isinstance(x, (list, tuple, set, str)): return len(x) > 0 and x != "false"
    return bool(x)

def evaluate(node, env):
    t = node[0]
    if t == "lit": return node[1]
    if t == "id": return env.get(node[1])
    if t == "list": return [evaluate(x, env) for x in node[1]]
    if t == "not": return not _truthy(evaluate(node[1], env))
    if t == "and": return _truthy(evaluate(node[1], env)) and _truthy(evaluate(node[2], env))
    if t == "or": return _truthy(evaluate(node[1], env)) or _truthy(evaluate(node[2], env))
    if t == "cmp":
        op, a, b = node[1], evaluate(node[2], env), evaluate(node[3], env)
        if op in ("==", "!=") and (a is None or b is None):
            return False          # spec: comparisons with an unanswered question are false, including !=
        if op == "==": return a == b
        if op == "!=": return a != b
        if op == "contains":
            if a is None: return False
            return b in a
        if op == "in":
            if b is None: return False
            return a in b
        if a is None or b is None: return False
        try:
            return {"<": a < b, "<=": a <= b, ">": a > b, ">=": a >= b}[op]
        except TypeError:
            return False
    raise ExprError(f"bad node {t}")

def check(src, env):
    return bool(_truthy(evaluate(parse(src), env)))
