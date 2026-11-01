# State and Resume Decisions

Date: 2026-11-01.

The YAML assets had schema IDs but no bank version. The user approved the first proposed
option: bank metadata starting at 1.0.0. question-bank/manifest.yaml uses the existing
question-bank/v1 schema and adds no questions or routing modules.

Use JSON for human-editable state and Node built-ins for hashing and filesystem operations;
no package installation is required. Temp-file flush then rename prevents partial JSON from
replacing an existing state. This does not claim cross-process locking or race-proof I/O.

Only answered values enter the expression environment. Deferred and not-applicable records
remain tracked explicitly. Unknown historical IDs are preserved but excluded from current
routing. Changed definitions trigger re-asking. Pack comparisons use both old and new affected
question lists, so removing a dependency link cannot hide an affected saved answer.

Secret checks cover recognizable credential prefixes, private key headers, credential-bearing
URLs, token/key/password assignments, and JWT-shaped strings. These are heuristics rather
than a guarantee that every possible secret is detected. No suspect value is echoed.

Observed failing tests preceded implementation: missing state module, invalid SemVer accepted,
temporary cleanup attempted after failed exclusive creation, removed pack links unreported,
and unrelated existing files overwritten. Each regression was corrected without weakening
its assertion. All state I/O uses synthetic fixtures and owned temporary paths.

The reference validator initially classified manifest.yaml as an orphan question file. A
test-first helper now accepts exactly schema plus valid bank_version metadata and rejects
module-bearing manifests. Existing question-file orphan checks remain in place. CI runs the
two metadata regression tests; no existing scenario expectation or budget changed.
