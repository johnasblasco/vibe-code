# Tasks: Bound File Generation

Input: spec.md, plan.md, research.md, data-model.md, contracts/cli.md.

## Setup

- [x] T001 Read AGENTS.md, relevant source/skills, templates including dotfiles, and run the Python baseline.
- [x] T002 Verify pins in official sources and record design/contracts in specs/007-file-generation/.

## US1: Binding and Rendering

- [x] T003 [US1] Write tests/unit/file-generation.test.ts and observe missing-module failure.
- [x] T004 [US1] Declare every supplied template/skill and conditional output in outputs/files.yaml.
- [x] T005 [US1] Implement current question/pack/system bindings, missing inputs, context-aware rendering and provenance in src/outputs/generate.ts.
- [x] T006 [US1] Keep resolver/interface copy in outputs/resolvers.yaml and beginner-course/generation-ui.yaml; preserve GitHub expressions and parse generated YAML/frontmatter.

## US2: Official Pins

- [x] T007 [US2] Write tests/unit/output-lookups.test.ts and observe missing-module failure.
- [x] T008 [US2] Implement bounded official requests, tag peeling, stable versions, cancellation and dated fallback in src/outputs/lookups.ts.
- [x] T009 [US2] Update knowledge-packs/tool-versions.yaml and templates with verified pins and PostgreSQL 18+ layout; keep dynamic values out of code.
- [x] T010 [US2] Reproduce and close the lower network-layer allowlist gap; record prevention in AI-01 and tests/security-scenarios/lookup-integrity.yaml.

## US3: Review and Publication

- [x] T011 [US3] Write tests/unit/output-publish.test.ts and observe missing-module failure; implement preflight/create-only publication in src/outputs/publish.ts and paths.ts.
- [x] T012 [US3] Write tests/unit/generate-cli.test.ts and observe command failures; implement prompts/confirmation in src/outputs/command.ts and register generate in src/cli/program.ts.
- [x] T013 [US3] Verify owned-temp cleanup and honest partial-batch reporting in tests/unit/output-publish-io.test.ts.

## Final Verification

- [x] T014 Run full TypeScript/Python/tooling/dependency checks plus compiled CLI preview, cancellation and confirmation checks; record results in quickstart.md.
- [x] T015 Finish README/spec/task evidence and review the diff without staging or commits.

## Dependencies and Execution

Setup precedes slices. US1 and US2 can be researched independently; final rendering uses US2.
US3 uses complete plans from US1. Failing tests precede each implementation slice. Independent
read-only checks can run concurrently; edits remain sequential. No extra package or agent is needed.

Independent acceptance: US1 covers every source template/current binding; US2 rejects malicious
or unresolved lookup data; US3 writes only after consent and never replaces existing output.
