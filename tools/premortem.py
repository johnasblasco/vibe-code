#!/usr/bin/env python3
"""Pre-mortem: from a project's answers, list the failure modes that apply, ranked by severity x likelihood,
with what the kit does to prevent each one. Output is Markdown (the seed of docs/risk-register.md).

Usage: python tools/premortem.py tests/scenarios/05-plant-waterer-iot.yaml [--top 15]
"""
import sys, os, glob
import yaml
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from expr import check

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def main():
    path = sys.argv[1]
    top = int(sys.argv[sys.argv.index("--top") + 1]) if "--top" in sys.argv else 15
    sc = yaml.safe_load(open(path, encoding="utf-8"))
    env = sc["answers"]
    rows = []
    for p in sorted(glob.glob(os.path.join(ROOT, "failure-modes", "*.yaml"))):
        for e in yaml.safe_load(open(p, encoding="utf-8"))["entries"]:
            if check(e["applies_when"], env):
                rows.append(e)
    rows.sort(key=lambda e: (-(e["severity"] * e["likelihood"]), -e["severity"], e["id"]))
    print(f"# Pre-mortem: {sc['id']}\n")
    print(f"{sc['description']}\n")
    print(f"{len(rows)} failure modes apply. Top {min(top, len(rows))} by severity x likelihood:\n")
    print("| Rank | ID | Failure | S | L | Score | Prevented by | Status | Owner | Revisit when |")
    print("|---|---|---|---|---|---|---|---|---|---|")
    for i, e in enumerate(rows[:top], 1):
        pv = e["prevention"]
        parts = []
        for k, label in (("questions", "q"), ("cards", "card"), ("skills", "skill"), ("templates", "tpl"), ("packs", "pack")):
            if pv.get(k): parts.append(f"{label}: {', '.join(pv[k][:3])}{'…' if len(pv[k]) > 3 else ''}")
        print(f"| {i} | {e['id']} | {e['title']} | {e['severity']} | {e['likelihood']} | {e['severity'] * e['likelihood']} | {'; '.join(parts)} | open | | |")
    print("\n**Status** starts as `open`. Each row needs an owner and a revisit trigger, or a written acceptance with a reason.")
    ev = [e for e in rows if e["evidence"] == "researched"]
    print(f"\nEvidence: {len(ev)} of {len(rows)} applicable entries cite a source; the rest are engineering practice not yet backed by a citation.")

if __name__ == "__main__":
    main()
