#!/usr/bin/env python3
"""Run persona scenarios through the decision engine (router, loads, gates, failure modes, rules).

Usage: python tools/run_scenarios.py [-v]
Each file in tests/scenarios/ gives answers and expectations. A scenario fails if the engine's result differs.
This is a reference implementation of the CLI's decision logic; port it and keep the scenarios as acceptance tests.
"""
import sys, os, glob
import yaml
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from expr import check, ExprError

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QB = os.path.join(ROOT, "question-bank")
TIER_ORDER = ["T1", "T2", "T3", "T4", "T5"]

def ly(p):
    with open(p, encoding="utf-8") as f:
        return yaml.safe_load(f)

def tier_of(router, env):
    for t in router["tiers"]:          # listed T5 down to T1
        if check(t["when"], env):
            return t["id"]
    raise SystemExit("no tier matched")

def files_for(router, tier):
    out = []
    idx = TIER_ORDER.index(tier)
    for t in router["tiers"]:
        if TIER_ORDER.index(t["id"]) <= idx:
            for a in t.get("adds", []):
                pat = os.path.join(QB, a if "*" in a else a + ".yaml")
                for f in sorted(glob.glob(pat)):
                    r = os.path.relpath(f, QB).replace(os.sep, "/")[:-5]
                    if r not in out and r not in ("depth-profiles",):
                        out.append(r)
    return out

def load_modules(router, tier, env):
    idx = TIER_ORDER.index(tier)
    mods, files = [], files_for(router, tier)
    for r in files:
        d = ly(os.path.join(QB, r + ".yaml"))
        ftier = d.get("tier_min")
        for m in d.get("modules", []):
            mt = m.get("tier_min") or ftier
            if mt and TIER_ORDER.index(mt) > idx: continue
            if m.get("load_when") and not check(m["load_when"], env): continue
            mods.append((r, m, d))
    return files, mods

def run(path, verbose):
    sc = ly(path)
    env = dict(sc["answers"])
    router = ly(os.path.join(QB, "00-router.yaml"))
    depth_p = ly(os.path.join(QB, "depth-profiles.yaml"))
    tier = tier_of(router, env)
    files, mods = load_modules(router, tier, env)
    qids, gates, by_stage, qinfo = [], set(), {}, {}
    for r, m, d in mods:
        if m.get("gate"): gates.add(m["gate"])
        for q in m.get("questions", []):
            qids.append(q["id"]); qinfo[q["id"]] = (m.get("stage"), "default" in q)
            by_stage.setdefault(m.get("stage"), []).append(q["id"])
            if q.get("gate"): gates.add(q["gate"])
    fm = []
    for p in glob.glob(os.path.join(ROOT, "failure-modes", "*.yaml")):
        for e in ly(p)["entries"]:
            if check(e["applies_when"], env): fm.append(e)
    contra = [r for r in ly(os.path.join(ROOT, "rules", "contradictions.yaml"))["rules"] if check(r["when"], env)]
    stops = [s["id"] for s in router.get("stop_rules", []) if check(s["when"], env)]
    stop = bool(stops) or any(r["severity"] == "stop" for r in contra)
    full_only = set(depth_p["full_only"])
    standard = [q for q in qids if q not in full_only]
    quick = [q for q in qids if q in set(depth_p["quick"]) | set(depth_p["always"])]
    if tier in ("T4", "T5"): quick = standard  # hardware floor

    ex, problems = sc.get("expect", {}), []
    def need(cond, msg):
        if not cond: problems.append(msg)
    if "tier" in ex: need(tier == ex["tier"], f"tier {tier} != {ex['tier']}")
    for f in ex.get("loads_include", []): need(any(x == f or x.startswith(f.rstrip("*")) for x in files), f"file not loaded: {f}")
    for f in ex.get("loads_exclude", []): need(not any(x == f or x.startswith(f.rstrip("*")) for x in files), f"file wrongly loaded: {f}")
    for g in ex.get("gates_include", []): need(g in gates, f"gate missing: {g}")
    for q in ex.get("questions_include", []): need(q in qids, f"question not asked: {q}")
    for q in ex.get("questions_exclude", []): need(q not in qids, f"question wrongly asked: {q}")
    ids = {e["id"] for e in fm}
    for f in ex.get("failure_modes_include", []): need(f in ids, f"failure mode not applied: {f}")
    for f in ex.get("failure_modes_exclude", []): need(f not in ids, f"failure mode wrongly applied: {f}")
    cids = {r["id"] for r in contra}
    for c in ex.get("contradictions_include", []): need(c in cids, f"rule not fired: {c}")
    for c in ex.get("contradictions_exclude", []): need(c not in cids, f"rule wrongly fired: {c}")
    if "stop" in ex: need(stop == ex["stop"], f"stop {stop} != {ex['stop']}")
    if "max_standard_questions" in ex: need(len(standard) <= ex["max_standard_questions"], f"standard asks {len(standard)} > {ex['max_standard_questions']}")

    n_flags = sum(1 for f in router.get("flags", []) if not f.get("ask_when") or check(f["ask_when"], env))
    idea = [q for q in by_stage.get("idea", []) if q not in full_only]
    idea_input = [q for q in idea if not qinfo[q][1]]
    if "max_idea_questions" in ex: need(len(idea) + n_flags <= ex["max_idea_questions"], f"idea stage asks {len(idea) + n_flags} > {ex['max_idea_questions']}")
    if "max_idea_needing_input" in ex: need(len(idea_input) + n_flags <= ex["max_idea_needing_input"], f"idea stage needs input on {len(idea_input) + n_flags} > {ex['max_idea_needing_input']}")
    status = "PASS" if not problems else "FAIL"
    print(f"{status}  {sc['id']:28s} tier {tier}  questions: quick {len(quick):3d} / standard {len(standard):3d} / full {len(qids):3d}  idea-stage {len(idea) + n_flags:3d} ({len(idea_input) + n_flags} need input)  gates {len(gates)}  failure modes {len(fm):2d}  rules fired {sorted(cids) if cids else '-'}{'  STOP' if stop else ''}")
    for p in problems: print("      -", p)
    if verbose:
        print("      files:", ", ".join(files))
        print("      by stage:", {k: len(v) for k, v in by_stage.items()})
        print("      critical failure modes:", ", ".join(sorted(e['id'] for e in fm if e['severity'] == 5)))
    return not problems

if __name__ == "__main__":
    verbose = "-v" in sys.argv
    paths = sorted(glob.glob(os.path.join(ROOT, "tests", "scenarios", "*.yaml")))
    ok = [run(p, verbose) for p in paths]
    print(f"\n{sum(ok)}/{len(ok)} scenarios passed")
    sys.exit(0 if all(ok) else 1)
