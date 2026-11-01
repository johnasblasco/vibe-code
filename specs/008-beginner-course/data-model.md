# Doctor and Course Data

Verification policy: finite process/network budgets, fixed command definitions, exact direct
hook text, benign/synthetic probe content, guard text, and safe ignore-path probes, in YAML.
Verify entries gain runner IDs, preserving their card IDs and indices.

Doctor context: project root, signal, explicitly granted probe/remote capabilities, optional
nonproduction URL/version/repository, injected process/network/manual adapters for tests.
Evidence: status (passed/manual/failed/unverified), nonsecret detail key, optional sanitized
version. Raw child output and HTTP bodies never enter persisted state or rendered diagnostics.

Course state: schema course-state/v1, current_stage stage-0..stage-3, manual_records and history.
Each history row identifies an attempted boundary, timestamp, and explicit manual/deferral
records. No persisted passed booleans are accepted. Cursor/history cannot bypass entry checks.

Runtime consent: separate typed confirmation for the isolated scanner probe and read-only
nonproduction remote checks. No capability is inferred from a saved cursor or old consent.
