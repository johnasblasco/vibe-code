# Design Decisions

Date: 2026-11-01. No new dependency or network lookup is required.

## Gate contract

Decision: load card blocks(stage-N) and include every earlier applicable blocker. Keep manual
evidence separate from an automatic pass. Use an injected fresh verifier port, never execute
the prose in verify fields. Without a runner, the check is unverified and blocks.
Rationale: runners belong to the later doctor task, and treating saved progress as proof would
violate the CLI threat model. An alternative of shell-executing descriptions is rejected.
Hardware question completion is an obligation, with an additional fresh review required.

Explicit --deferrals is a user-selected YAML file, not an implicitly resumed pass claim. Its
gate and check IDs must match. Each entry needs owner, reason, and revisit_when. It never
changes answers or progress, and cannot override a safety stop or blocking contradiction.

## Ranking and report

Decision: reproduce tools/premortem.py ordering: score descending, severity descending, ID
ascending. Compare all nine source personas directly against Python output. Show all prevention
links, question states, unverified cards, evidence/source, and open status. Default display limit
matches the reference. Totals count all applicable risks before truncation.
Rationale: recorded design answers cannot establish risk prevention. Owners/acceptances must
come from the project owner, not invented assignments. The register provides review columns.

## Output integrity

Decision: resolve the actual template's question/system bindings from outputs/bindings.yaml;
reject missing answers, unsupported bindings, malformed placeholders, and invalid dates.
Escape inserted plain text for Markdown and HTML. Create a complete private temporary sibling,
fsync it, then publish with an exclusive hard link. Finally remove only the owned temporary file.
Rationale: atomic create-only publication preserves existing edits and prevents competing writes
from silently replacing a report. Platforms/filesystems without hard links fail without replacing
the destination. A generic renderer and version/action resolution are the next feature.

## Test-first evidence

Missing modules failed before core/output/gate implementation. Command integration failed with
usage errors before registration. The malformed-bank tests reproduced allowed=true with no checks
for both an empty verify group and a missing card file. Required files and nonempty groups now
reject. Existing AI-09 documents that cause and its prevention; the two mutation scenarios live
under tests/security-scenarios because the nine persona scenarios exercise decision routing,
not mutations of gate definitions. Their original expectations and budgets remain unchanged.
