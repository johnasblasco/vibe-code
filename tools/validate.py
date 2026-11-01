#!/usr/bin/env python3
"""Validate the scaffolder kit: structure, cross-references, expressions, and coverage gaps.

Usage:  python tools/validate.py [--strict] [--today YYYY-MM-DD]

ERROR   (exit 1): malformed files, duplicate ids, unknown ids or tags, bad expressions, unbound placeholders.
GAP     (warning, exit 1 with --strict): backbone tags with no question; critical failure modes with no prevention.
WARNING: stale packs (needs --today), unresolved pack values, unused bindings.
"""
import sys, glob, os, re, datetime
from collections import defaultdict
import yaml

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from expr import parse, identifiers, ExprError

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TYPES = {"text", "number", "boolean", "single_select", "multi_select", "rank_priorities"}
SELECT = {"single_select", "multi_select", "rank_priorities"}
TIERS = ["T1", "T2", "T3", "T4", "T5"]
STAGES = {"idea", "plan", "design", "build", "production", "prelaunch", "operate"}
GATES = {"before-hardware-design-freeze", "before-production", "before-launch"}
RULE_SEVERITY = {"info", "warn", "block", "stop"}
PROTECTED_NS = {"beginner-ops", "safety", "en303645", "cra", "red"}
PLACEHOLDER = re.compile(r"(?<!\$)\{\{([a-z][a-z0-9_]*)\}\}")
errors, warnings = [], []

def valid_bank_metadata(value):
    """Only the version-only manifest is metadata, never a disguised question module."""
    if not isinstance(value, dict) or set(value) != {"schema", "bank_version"}:
        return False
    version = value.get("bank_version")
    return value.get("schema") == "question-bank/v1" and isinstance(version, str) and bool(re.fullmatch(
        r"(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?", version))

def rel(p): return os.path.relpath(p, ROOT)
def err(msg): errors.append(msg)

def load(path):
    try:
        with open(path, encoding="utf-8") as f:
            return yaml.safe_load(f)
    except Exception as e:
        err(f"{rel(path)}: cannot parse YAML: {e}")
        return None

def dig(d, dotted):
    for part in dotted.split("."):
        if not isinstance(d, dict) or part not in d:
            return KeyError
        d = d[part]
    return d

def main():
    strict = "--strict" in sys.argv
    today = None
    if "--today" in sys.argv:
        today = datetime.date.fromisoformat(sys.argv[sys.argv.index("--today") + 1])

    bb = load(os.path.join(ROOT, "knowledge-packs", "standards-coverage-backbone.yaml"))
    ns = bb["namespaces"]
    valid = {f"{n}:{t}" for n, d in ns.items() for t in d["tags"]}
    optional = {f"{n}:{t}" for n, d in ns.items() for t in d.get("optional", [])}

    Q = {}                      # id -> info
    flags = set()
    covered = defaultdict(list)
    expressions = []            # (where, src)
    count = 0

    def check_tags(where, tags):
        if not tags:
            err(f"{where}: no covers tags")
        for t in tags or []:
            if t not in valid: err(f"{where}: unknown tag '{t}'")
            else: covered[t].append(where)

    def add_question(path, q, module_info, kind):
        nonlocal count
        count += 1
        where = f"{rel(path)}::{q.get('id', '?')}"
        for k in ("id", "ask", "type"):
            if k not in q: err(f"{where}: missing '{k}'")
        qid = q.get("id")
        if qid in Q or qid in flags: err(f"{where}: duplicate id (also in {Q.get(qid, {}).get('file', 'router')})")
        if q.get("type") not in TYPES: err(f"{where}: bad type '{q.get('type')}'")
        if q.get("type") in SELECT and not q.get("options"): err(f"{where}: select type needs options")
        if q.get("type") == "single_select" and "default" in q and q.get("options"):
            if q["default"] not in q["options"] and q["default"] not in ("auto_detect", "pick_for_me"):
                err(f"{where}: default '{q['default']}' not in options")
        for g in (q.get("gate"), module_info.get("gate")):
            if g and g not in GATES: err(f"{where}: unknown gate '{g}'")
        if q.get("required_when"): expressions.append((f"{where}.required_when", q["required_when"]))
        check_tags(where, q.get("covers"))
        tags = set(q.get("covers", []))
        protected = bool(q.get("gate") or module_info.get("gate") or q.get("required_when") or any(t.split(":")[0] in PROTECTED_NS for t in tags))
        info = {"q": q, "file": rel(path), "protected": protected, "module": module_info.get("module")}
        if kind == "flag": flags.add(qid)
        else: Q[qid] = info

    # --- question bank
    qfiles = sorted(glob.glob(os.path.join(ROOT, "question-bank", "**", "*.yaml"), recursive=True))
    router = None
    for path in qfiles:
        d = load(path)
        if not d: continue
        base = os.path.basename(path)
        if base in ("depth-profiles.yaml",): continue
        if d.get("schema") != "question-bank/v1":
            err(f"{rel(path)}: schema must be question-bank/v1"); continue
        if base == "manifest.yaml":
            if not valid_bank_metadata(d): err(f"{rel(path)}: invalid bank metadata")
            continue
        if base == "00-router.yaml": router = d
        file_tier = d.get("tier_min")
        if file_tier and file_tier not in TIERS: err(f"{rel(path)}: bad tier_min {file_tier}")
        for fl in d.get("flags", []):
            add_question(path, fl, {}, "flag")
            if fl.get("ask_when"): expressions.append((f"router.flag {fl['id']}.ask_when", fl["ask_when"]))
        for m in d.get("modules", []):
            mi = dict(m)
            if m.get("tier_min") and m["tier_min"] not in TIERS: err(f"{rel(path)}::{m.get('module')}: bad tier_min")
            if m.get("stage") not in STAGES: err(f"{rel(path)}::{m.get('module')}: module needs a stage in {sorted(STAGES)}")
            if m.get("load_when"): expressions.append((f"{rel(path)}::{m.get('module')}.load_when", m["load_when"]))
            if file_tier and not m.get("gate") and False: pass
            for q in m.get("questions", []): add_question(path, q, mi, "q")

    known = flags | set(Q)

    # --- router tiers and loads
    if router:
        for t in router.get("tiers", []):
            expressions.append((f"router.tier {t['id']}", t["when"]))
            for a in t.get("adds", []):
                pat = os.path.join(ROOT, "question-bank", a)
                if not (glob.glob(pat) or glob.glob(pat + ".yaml")):
                    err(f"router tier {t['id']}: adds '{a}' matches no file")
        for s in router.get("stop_rules", []): expressions.append((f"router.stop {s['id']}", s["when"]))
        loaded = set()
        for t in router.get("tiers", []):
            for a in t.get("adds", []):
                for f in glob.glob(os.path.join(ROOT, "question-bank", a + ("" if "*" in a else ".yaml"))):
                    loaded.add(os.path.relpath(f, os.path.join(ROOT, "question-bank")))
        for path in qfiles:
            r = os.path.relpath(path, os.path.join(ROOT, "question-bank"))
            if r in ("00-router.yaml", "depth-profiles.yaml", "manifest.yaml"): continue
            if r not in loaded and not any(r.startswith(x.rstrip("*")) for x in sum([t.get("adds", []) for t in router["tiers"]], []) if x.endswith("*")):
                err(f"{r}: question file is never loaded by any router tier (orphan)")

    # --- step cards
    cards = {}
    for path in sorted(glob.glob(os.path.join(ROOT, "beginner-course", "step-cards", "*.yaml"))):
        d = load(path)
        if not d: continue
        for c in d.get("cards", []):
            where = f"{rel(path)}::{c.get('id', '?')}"
            for k in ("id", "stage", "teach", "verify", "gate", "undo", "covers"):
                if k not in c: err(f"{where}: missing '{k}'")
            if c.get("id") in cards or c.get("id") in Q: err(f"{where}: duplicate id")
            cards[c.get("id")] = rel(path)
            check_tags(where, c.get("covers"))
            if not c.get("verify"): err(f"{where}: card has no verify step")
    gp = load(os.path.join(ROOT, "beginner-course", "golden-path.yaml"))
    if gp:
        for s in gp.get("stages", []):
            if "card" in s and not os.path.exists(os.path.join(ROOT, "beginner-course", s["card"])):
                err(f"golden-path::{s['id']}: missing card file {s['card']}")

    # --- skills
    skill_names, nskills = set(), 0
    for path in sorted(glob.glob(os.path.join(ROOT, "skills", "**", "SKILL.md"), recursive=True)):
        nskills += 1
        text = open(path, encoding="utf-8").read()
        if not text.startswith("---\n") or "\n---\n" not in text[4:]:
            err(f"{rel(path)}: missing YAML frontmatter"); continue
        try:
            fm = yaml.safe_load(text[4:text.index("\n---\n", 4)])
        except Exception as e:
            err(f"{rel(path)}: frontmatter does not parse: {e}"); continue
        folder = os.path.basename(os.path.dirname(path))
        if not isinstance(fm, dict) or fm.get("name") != folder:
            err(f"{rel(path)}: frontmatter name must equal folder name '{folder}'")
        elif not fm.get("description") or len(fm["description"]) < 60:
            err(f"{rel(path)}: description missing or too short to trigger reliably")
        else:
            skill_names.add(fm["name"])
        if text.count("\n") > 500: warnings.append(f"{rel(path)}: over 500 lines")

    # --- packs
    packs = {}
    for path in sorted(glob.glob(os.path.join(ROOT, "knowledge-packs", "*.yaml"))):
        d = load(path)
        if not d: continue
        pid = d.get("id")
        packs[pid] = d
        for k in ("id", "last_verified", "sources"):
            if k not in d: err(f"{rel(path)}: missing '{k}'")
        for qid in d.get("affects_questions", []):
            if qid not in Q and qid not in cards: err(f"{rel(path)}: affects_questions names unknown id '{qid}'")
        if today and d.get("max_age_days") and d.get("last_verified"):
            lv = d["last_verified"]
            if isinstance(lv, str): lv = datetime.date.fromisoformat(lv)
            age = (today - lv).days
            if age > d["max_age_days"]: warnings.append(f"STALE {rel(path)}: {age} days old (max {d['max_age_days']})")
        vals = d.get("values")
        if isinstance(vals, dict):
            def walk(v, prefix=""):
                for k, x in v.items():
                    if isinstance(x, dict): walk(x, prefix + k + ".")
                    elif x is None: warnings.append(f"UNRESOLVED {pid}: {prefix}{k} is empty; the CLI must look it up at scaffold time")
            walk(vals)

    # --- templates and bindings
    b = load(os.path.join(ROOT, "outputs", "bindings.yaml"))
    ph_used = defaultdict(list)
    tfiles = [os.path.join(dp, fn) for dp, _, fns in os.walk(os.path.join(ROOT, "templates")) for fn in fns]   # os.walk so dotfiles (.env, .github) are included
    tfiles += glob.glob(os.path.join(ROOT, "skills", "project-templates", "**", "SKILL.md"), recursive=True)
    for f in tfiles:
        for m in PLACEHOLDER.finditer(open(f, encoding="utf-8").read()):
            ph_used[m.group(1)].append(rel(f))
    if b:
        resolvers = set(b.get("system_resolvers", {}))
        for name, spec in b["placeholders"].items():
            src = spec.get("from")
            if src == "question":
                if spec["id"] not in Q: err(f"bindings::{name}: unknown question id '{spec['id']}'")
            elif src == "pack":
                p = packs.get(spec["pack"])
                if not p: err(f"bindings::{name}: unknown pack '{spec['pack']}'")
                elif dig(p.get("values", {}), spec["field"]) is KeyError: err(f"bindings::{name}: pack '{spec['pack']}' has no value '{spec['field']}'")
            elif src == "system":
                if spec.get("resolver") not in resolvers: err(f"bindings::{name}: unknown resolver '{spec.get('resolver')}'")
                if spec.get("of") and spec["of"] not in Q: err(f"bindings::{name}: 'of' names unknown id")
            else:
                err(f"bindings::{name}: bad source '{src}'")
        for name, files in ph_used.items():
            if name not in b["placeholders"]: err(f"unbound placeholder {{{{{name}}}}} used in {', '.join(sorted(set(files)))}")
        for name in b["placeholders"]:
            if name not in ph_used: warnings.append(f"bindings: '{name}' is never used in a template")
    else:
        err("outputs/bindings.yaml missing")

    # --- depth profiles
    dp = load(os.path.join(ROOT, "question-bank", "depth-profiles.yaml"))
    if dp:
        for key in ("always", "quick", "full_only"):
            for qid in dp.get(key, []):
                if qid not in Q: err(f"depth-profiles::{key}: unknown id '{qid}'")
        for qid in dp.get("full_only", []):
            if qid in Q and Q[qid]["protected"]: err(f"depth-profiles: '{qid}' is protected (gate, required, safety, or security-critical) and cannot be full_only")
            if qid in dp.get("quick", []): err(f"depth-profiles: '{qid}' is in both quick and full_only")

    # --- failure modes
    fm_count, fm_sev5, fm_unprevented = 0, 0, []
    fm_ids = set()
    for path in sorted(glob.glob(os.path.join(ROOT, "failure-modes", "*.yaml"))):
        d = load(path)
        if not d: continue
        for e in d.get("entries", []):
            fm_count += 1
            where = f"{rel(path)}::{e.get('id', '?')}"
            for k in ("id", "title", "severity", "likelihood", "applies_when", "symptom", "cause", "prevention", "detection", "evidence"):
                if k not in e: err(f"{where}: missing '{k}'")
            if e.get("id") in fm_ids: err(f"{where}: duplicate id")
            fm_ids.add(e.get("id"))
            if e.get("evidence") == "researched" and not e.get("source"): err(f"{where}: researched entries need a source")
            expressions.append((f"{where}.applies_when", e.get("applies_when", "")))
            prev = e.get("prevention") or {}
            n_prev = 0
            for qid in prev.get("questions", []):
                n_prev += 1
                if qid not in Q: err(f"{where}: prevention question '{qid}' does not exist")
            for cid in prev.get("cards", []):
                n_prev += 1
                if cid not in cards: err(f"{where}: prevention card '{cid}' does not exist")
            for s in prev.get("skills", []):
                n_prev += 1
                if s not in skill_names: err(f"{where}: prevention skill '{s}' does not exist")
            for t in prev.get("templates", []):
                n_prev += 1
                if not os.path.exists(os.path.join(ROOT, "templates", t)): err(f"{where}: prevention template '{t}' does not exist")
            for pk in prev.get("packs", []):
                n_prev += 1
                if pk not in packs: err(f"{where}: prevention pack '{pk}' does not exist")
            if e.get("severity", 0) >= 4 and n_prev == 0: fm_unprevented.append(e.get("id"))
            if e.get("severity") == 5: fm_sev5 += 1

    # --- rules and recommendations
    ncontra = 0
    rl = load(os.path.join(ROOT, "rules", "contradictions.yaml"))
    seen = set()
    if rl:
        for r in rl.get("rules", []):
            ncontra += 1
            if r["id"] in seen: err(f"rules::{r['id']}: duplicate")
            seen.add(r["id"])
            if r.get("severity") not in RULE_SEVERITY: err(f"rules::{r['id']}: bad severity")
            expressions.append((f"rules::{r['id']}.when", r["when"]))
            for k in ("message", "fix"):
                if k not in r: err(f"rules::{r['id']}: missing '{k}'")
    rc = load(os.path.join(ROOT, "rules", "recommendations.yaml"))
    def check_sets(where, sets):
        for qid, val in (sets or {}).items():
            if qid not in Q: err(f"{where}: sets unknown question '{qid}'"); continue
            q = Q[qid]["q"]
            opts = q.get("options")
            if not opts: continue
            vals = val if isinstance(val, list) else [val]
            for v in vals:
                if v not in opts and v != "pick_for_me": err(f"{where}: '{v}' is not an option of {qid}")
    if rc:
        for p in rc.get("profiles", []):
            expressions.append((f"recommendations::{p['id']}.when", p["when"]))
            check_sets(f"recommendations::{p['id']}", p.get("sets"))
            for c in p.get("conditional", []):
                expressions.append((f"recommendations::{p['id']}.conditional", c["when"]))
                check_sets(f"recommendations::{p['id']}.conditional", c.get("sets"))

    # --- glossary and troubleshooting
    for fname, key, need in (("glossary.yaml", "terms", ("term", "plain")), ("troubleshooting.yaml", "entries", ("id", "match", "plain", "fix"))):
        d = load(os.path.join(ROOT, "beginner-course", fname))
        if d is None: err(f"beginner-course/{fname} missing"); continue
        seen = set()
        for e in d.get(key, []):
            for k in need:
                if k not in e: err(f"{fname}: entry {e.get('term') or e.get('id')} missing '{k}'")
            ident = e.get("term") or e.get("id")
            if ident in seen: err(f"{fname}: duplicate '{ident}'")
            seen.add(ident)

    # --- expressions
    for where, src in expressions:
        try:
            ids = identifiers(parse(src))
        except ExprError as e:
            err(f"{where}: bad expression {src!r}: {e}"); continue
        for i in ids:
            if i not in known: err(f"{where}: unknown identifier '{i}'")

    # --- gap report
    gaps = defaultdict(list)
    for n, d in ns.items():
        for t in d["tags"]:
            key = f"{n}:{t}"
            if key not in covered and key not in optional: gaps[n].append(t)
    gap_count = sum(len(v) for v in gaps.values()) + len(fm_unprevented)

    print(f"questions: {count}   step cards: {len(cards)}   packs: {len(packs)}   skills: {nskills}   failure modes: {fm_count} ({fm_sev5} critical)   rules: {ncontra}   backbone tags: {len(valid)}")
    for n, d in ns.items():
        tags = [t for t in d["tags"] if f"{n}:{t}" not in optional]
        hit = sum(1 for t in tags if f"{n}:{t}" in covered)
        tiers = f" (tiers {','.join(d['tiers'])})" if d.get("tiers") else ""
        print(f"  {n:20s} {hit}/{len(tags)} required tags covered{tiers}")
    if gaps:
        print("\nGAPS (backbone tags with no question or card):")
        for n, ts in gaps.items(): print(f"  {n}: {', '.join(ts)}")
    if fm_unprevented:
        print("\nGAPS (severity 4 or 5 failure modes with no prevention in the kit):")
        print("  " + ", ".join(fm_unprevented))
    unused_optional = sorted(o for o in optional if o not in covered)
    if unused_optional:
        print("\nOptional tags with no question (fine if the topic does not apply):\n  " + ", ".join(unused_optional))
    for w in warnings: print("WARNING", w)
    if errors:
        print(f"\n{len(errors)} ERROR(S):")
        for e in errors: print("  -", e)
        sys.exit(1)
    if strict and gap_count:
        print("\n--strict: gaps present"); sys.exit(1)
    print("\nOK: no structural errors" + (" and no gaps" if not gap_count else f"; {gap_count} gap(s) to review"))

if __name__ == "__main__":
    main()
