# Gate and Risk Data

GateCheck: id, kind (auto/manual/question/review), description, optional card ID. Card checks use
card-ID/index; named question gates use question IDs plus a review check with the gate ID.

GateResult: id, allowed, stop, checks, active contradictions. Check status is passed, manual,
failed, unverified, answered, deferred, not_applicable, or unanswered. Only current appropriate
statuses satisfy an obligation. Deferred is not verified. Empty or missing verification groups
are errors; exceptions are failed checks without raw exception text.

GateDeferral: exactly owner, reason, revisit_when, all nonempty and without secret-shaped content.
Explicit input envelope: schema gate-deferrals/v1, gate, checks keyed by current check ID.
No new field is added to persisted state; no pass claim is loaded from disk.

RiskReport: rows in reference order, total applicable, researched count, practice count.
Risk: id, original YAML data, score, open status, question states, unverified cards.
Changed definitions make old answers unanswered for current coverage. No risk is automatically
marked prevented from an answer. Owner/revisit/acceptance fields are left for review.

Binding: actual outputs/bindings.yaml placeholder entry. Question bindings require a current
answered nonempty text value. Supported system resolvers here: today and premortem_table.
