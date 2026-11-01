# Tasks: Doctor and Beginner Stages 0–2

Input: spec.md, plan.md, research.md, data-model.md, contracts/cli.md.

## Setup

- [x] T001 Read AGENTS.md, relevant skills/cards/threat model, and run the three Python baselines.
- [x] T002 Create specs/008-beginner-course/ and verify command/hook/CI behavior in primary documentation.

## US1: Current Readiness

- [x] T003 [US1] Write tests/unit/doctor.test.ts and observe missing-module failure.
- [x] T004 [US1] Bind existing source verify entries to runners via beginner-course/verification.yaml and card runner fields.
- [x] T005 [US1] Implement bounded sanitized processes in src/doctor/process.ts and current checks in src/doctor/index.ts.
- [x] T006 [US1] Exercise native versions/cancellation/environment isolation in tests/unit/doctor-process.test.ts; fix Windows Git null-device compatibility.

## US2: Guarded Scanner and Manual Evidence

- [x] T007 [US2] Write tests/unit/doctor-probe.test.ts and observe missing-module failure.
- [x] T008 [US2] Implement exact-hook recognition, controls, dual commit barriers, owned cleanup and no project mutation in src/doctor/probe.ts.
- [x] T009 [US2] Keep manual attestations explicit and persist them separately from pass claims in src/course/state.ts and src/doctor/cli.ts.

## US3: Preview and Course

- [x] T010 [US3] Write tests/unit/doctor-network.test.ts and observe missing-module failure; implement public/DNS-pinned bounded HTTPS in src/doctor/network.ts.
- [x] T011 [US3] Write tests/unit/course.test.ts and observe missing-module failure; implement resumption/entry/exit checks in src/course/index.ts and state.ts.
- [x] T012 [US3] Write tests/unit/doctor-cli.test.ts and observe command failures; register doctor, gates --verify, and next --course with data-backed UI.
- [x] T013 [US3] Reproduce/fix malformed-CI success, SIGINT listener leakage, and explicit deferral subsets without changing persona expectations.
- [x] T014 [US3] Verify native HTTP redirect/response/DNS constraints and document failure prevention in tests/security-scenarios/doctor-integrity.yaml.

## Verification

- [x] T015 Run compiled CLI dry-run/read-only/consent-cancellation checks; record actual missing prerequisites honestly.
- [x] T016 Run TypeScript, Python, tooling, dependency, and build checks; record results in quickstart.md.
- [x] T017 Finish README/spec/task evidence and review the diff without staging or commits.

## Dependencies and Independent Checks

Setup precedes slices. US1's runner contract supports US2/US3. Each slice starts with failing
tests, then implementation, then focused checks. US2 uses real Git with a controlled detector
fixture; it does not claim that Gitleaks itself was installed or exercised. US3 remote adapters
use controlled metadata, not production. Independent read-only checks may run concurrently;
implementation edits stay sequential. No extra package or agent is required.
