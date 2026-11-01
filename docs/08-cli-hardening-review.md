# CLI threat-model review

Reviewed 2026-11-01 against all 11 rows in [the original threat model](07-threat-model-cli.md).
Scope: existing CLI commands, generated files, state, doctor and course stages 0–2.
This is a local source review with executable regressions, not an independent penetration test
or a certification. Release prerequisites below remain open.

## Evidence for every original threat

| Original threat | Code/control | Executable evidence | Status and limits |
|---|---|---|---|
| Malicious or tampered pack or template update | [loadVerifiedKit](../src/security/integrity.ts), [strict inventory and bounded asset reads](../src/security/assets.ts), [verified template reads](../src/outputs/paths.ts), [risk template snapshot](../src/outputs/risk-register.ts). Every CLI invocation checks all 68 runtime assets before actions. | [asset-integrity.test.ts](../tests/unit/asset-integrity.test.ts): altered pack before doctor IO; missing/extra/modified templates; absent/duplicate/malformed/traversal inventory; links; CRLF normalization; replacement after verification. | Checksummed relative to a trusted inventory. No remote updater exists. [Maintainer tool](../tools/update-integrity.mjs) lists changed paths and refreshes only with explicit --write; review actual source diffs too. No signature authenticates a replaced manifest or CLI binary. |
| User answer injected into a shell command or file path | [runProcess](../src/doctor/process.ts) uses executable/argument arrays, shell:false, fixed executables and a sanitized environment. [validateReadCommand](../src/doctor/process.ts) restricts operation grammar. [portablePath](../src/outputs/paths.ts) and [publishPlan](../src/outputs/publish.ts) validate fixed manifest paths. | [hardening.test.ts](../tests/unit/hardening.test.ts): name `a; rm -rf ~` stays inert in bound output. [output-publish.test.ts](../tests/unit/output-publish.test.ts): traversal, absolute paths, Git internals, Windows devices, collisions and links. [doctor.test.ts](../tests/unit/doctor.test.ts): tampered command descriptor rejected before execution. | Implemented for existing commands. No answer becomes a shell program or destination path. Portable pathname checks do not guarantee resistance to a hostile local process replacing ancestor directories concurrently. |
| Secrets copied into state, stuck output or telemetry | [noSecrets, saveState and loadState](../src/state/index.ts) refuse known key formats, credential-bearing URLs and authorization headers. [runDoctorCli](../src/doctor/cli.ts) and [doctor](../src/doctor/index.ts) validate metadata before IO. [CLI registration](../src/cli/program.ts) provides no stuck/telemetry feature. | [hardening.test.ts](../tests/unit/hardening.test.ts): credential refusal, forged save/load, unchanged previous file, no doctor IO, unavailable commands with planted README/.env. [state.test.ts](../tests/unit/state.test.ts): secret metadata rejection without echoing. [doctor-process.test.ts](../tests/unit/doctor-process.test.ts): credentials absent from child environment. | Refusal is heuristic, not detection of every arbitrary secret. Existing CLI does not upload project data or provide diagnostics sharing. Absence of stuck is tested; a future redaction/export implementation is not covered or claimed. |
| Hijacked CI action or tag in generated workflow | [prepareGeneration](../src/outputs/generate.ts) enforces full hashes and rejects movement of a reviewed tag. [resolvePins](../src/outputs/lookups.ts) checks official release/ref/tag/commit metadata. [CI template](../templates/project/.github/workflows/ci.yml.tmpl) starts with empty permissions. Template itself is checksummed. | [file-generation.test.ts](../tests/unit/file-generation.test.ts): rendered full action hashes and intact GitHub expressions. [hardening.test.ts](../tests/unit/hardening.test.ts): wrong commit evidence and a moved reviewed release rejected. [security.node.test.mjs](../tests/tooling/security.node.test.mjs) and [skeleton.node.test.mjs](../tests/tooling/skeleton.node.test.mjs): CI pins/permissions. | Existing reviewed tag/SHA cannot silently change in generation. New releases still depend on trustworthy official metadata and human preview; a fully compromised official service is not solved by syntactic validation. |
| Typosquatted or hijacked CLI package | [package.json](../package.json) stays private:true with no registry bin or publishing lifecycle. [CI](../.github/workflows/ci.yml) uses the lockfile and disabled install scripts. Runtime checksums protect assets relative to the checkout. | [security.node.test.mjs](../tests/tooling/security.node.test.mjs): private/unpublished package, exact dependencies and registry integrity. [skeleton.node.test.mjs](../tests/tooling/skeleton.node.test.mjs): no bin/postinstall. | **Release prerequisite open.** No published artifact, registry ownership/2FA, signed build provenance, independently obtained artifact checksum or clean published install has been verified. Do not infer an approved global npm install command from the local package name. |
| Invented or malicious dependency added by AI or by us | [package.json](../package.json) exact versions; [package-lock.json](../package-lock.json) registry URLs and SHA-512 integrity; [CI](../.github/workflows/ci.yml) npm ci --ignore-scripts and npm audit --audit-level=high. No runtime installer exists. | [security.node.test.mjs](../tests/tooling/security.node.test.mjs): exact root/lock match, registry sources, integrity, no root lifecycle hooks. [dependencies.node.test.mjs](../tests/tooling/dependencies.node.test.mjs): known minimatch advisory floor and lint discovery. | Offline policy checks are repeatable. Fresh registry audit failed to reach its endpoint in this session; no new zero-vulnerability claim. CI audit fails at high/critical, so moderate findings can pass that threshold. Registry-hosted integrity alone cannot establish publisher intent or package safety. |
| Prompt injection through repository content read by an AI feature | [CLI command registration](../src/cli/program.ts) has no AI command. [doctor](../src/doctor/index.ts) uses fixed read operations; [probe](../src/doctor/probe.ts) refuses arbitrary hooks. Generator previews instructions without executing them. | [hardening.test.ts](../tests/unit/hardening.test.ts): planted README plus synthetic .env cannot activate ai/update/stuck/install-hooks/telemetry. [doctor-probe.test.ts](../tests/unit/doctor-probe.test.ts): unsupported hook not executed. [generate-cli.test.ts](../tests/unit/generate-cli.test.ts): preview/decline/cancel boundaries. | AI repository ingestion is unavailable, not implemented and security-tested. Generated instruction text needs review before use by an external AI; this CLI cannot guarantee how that separate system interprets it. Future AI must require selected files and suggestions without auto-run. |
| Lookup service returns a malicious version or hash | [requestOfficial/resolvePins](../src/outputs/lookups.ts): exact official hosts/repos, no credentials/redirects, bounded requests, stable version/hash validation, tag peeling and commit equality. [prepareGeneration](../src/outputs/generate.ts) additionally compares known release hashes with the pack. [doctor network](../src/doctor/network.ts): DNS pinning and non-global address refusal. | [output-lookups.test.ts](../tests/unit/output-lookups.test.ts): bad hosts/data, bounds, abort and dated fallback. [hardening.test.ts](../tests/unit/hardening.test.ts): wrong commit and moved release. [doctor-http.test.ts](../tests/unit/doctor-http.test.ts): redirects/private or mixed non-global DNS never followed. | Malformed/inconsistent metadata does not become a generated pin. Low-level resolvePins parses metadata; generation is the additional reviewed-tag trust boundary. Fully consistent compromise of an approved service/new release still requires independent review. No production preview was contacted during this review. |
| Hooks or scripts installed without clear consent | [runDoctorCli](../src/doctor/cli.ts) displays the supported hook before typed probe consent and remote origin/repo before typed network consent. [probeSecretHook](../src/doctor/probe.ts) executes only owned controls in an isolated repository. [runGeneration](../src/outputs/command.ts) requires preview/typed write consent. | [doctor-cli.test.ts](../tests/unit/doctor-cli.test.ts): noninteractive flags do not grant capabilities, exact hook and targets before consent. [doctor-probe.test.ts](../tests/unit/doctor-probe.test.ts): no commit, original index unchanged, unsupported hook refused. [generate-cli.test.ts](../tests/unit/generate-cli.test.ts): decline/cancel creates no outputs. | There is no project hook/script installer, so no installation decision log is claimed. Generated pre-commit config is only a file; it does not install/verify a scanner. The controlled detector fixture is not proof of real Gitleaks execution. |
| State file edited to skip a gate | [evaluateGate](../src/gates/index.ts), [doctor](../src/doctor/index.ts), [guideCourse](../src/course/index.ts) recheck current entry/exit obligations. [course state](../src/course/state.ts) records a cursor/manual history, not automatic passes. | [gates.test.ts](../tests/unit/gates.test.ts): fresh checks each evaluation, stop rules and explicit deferrals. [course.test.ts](../tests/unit/course.test.ts): edited cursor cannot bypass entry, forged pass fields rejected. [state.test.ts](../tests/unit/state.test.ts): corrupt/forged claims refused. | Implemented for supported gates/course stages. Manual attestation stays manual; stored confirmations never replace a fresh check. This is not verification of unsupported later course stages. |
| Beginner trusts a wrong recommendation | [interview proposals](../src/interview/index.ts) load dated YAML recommendations; [Clack review](../src/interview/clack.ts) shows reason/date and requires one explicit review. [router stop rule](../question-bank/00-router.yaml) escalates safety-critical beginner work. [generation record](../templates/project/docs/decisions/0001-scaffolder-generation.md.tmpl) discloses unverified setup. | [clack.test.ts](../tests/unit/clack.test.ts): recommendation date appears in review. [interview.test.ts](../tests/unit/interview.test.ts): cancelled defaults not accepted, contradictions displayed, safety stop. [engine-scenarios.test.ts](../tests/unit/engine-scenarios.test.ts): all 9 personas including medical stop. [file-generation.test.ts](../tests/unit/file-generation.test.ts): provenance/fallback output. | Dates and explicit review help assess advice; they do not establish that every recommendation is correct. Standards/lifecycle research and expert review gaps in README and packs remain. No regulatory certification or security guarantee is claimed. |

## New guards and observed failures

The initial tests failed before implementation: altered YAML reached doctor IO; username-only
credential URLs and authorization headers were accepted; IPv6 benchmarking/documentation DNS
destinations passed; an official lookup could move an already reviewed action tag.

The runtime boundary now checks the complete inventory before command setup:

```ts
try { kit = await loadVerifiedKit(kitRoot); }
catch {
  // Generic bootstrap diagnostic; no unverified UI or content is printed.
  return EXIT.ERROR;
}
```

Verified content is retained, and output readers receive `kit.verifiedAsset`. The complete
implementation includes a bounded strict UTF-8 reader and a private snapshot lookup; raw
`loadKit` and raw template readers remain low-level fixture/reference APIs without a trust claim.

Generation also refuses a different hash for an existing reviewed release, even when the
official response is internally consistent:

```ts
if (config.kind === 'github' &&
    pin.tag?.replace(/^v/, '') === String(config.tag).replace(/^v/, '') &&
    pin.value !== field(toolPack.values, text(config.field))) {
  throw new LookupError('Previously reviewed release changed');
}
```

Regression inputs and failure-mode links are in
[cli-hardening.yaml](../tests/security-scenarios/cli-hardening.yaml): AI-06, SW-20, SW-27, SW-30, SW-31.
Existing 9 persona files and their budgets were not edited. The catalog gains two CLI-specific
practice entries; catalog size alone is not evidence of completeness.

Full verification initially exposed interview timeouts. Proposal eligibility repeatedly
cloned/validated the whole bank through setAnswer. [validateAnswerForQuestion](../src/state/index.ts)
now reuses the same candidate rules while [interview acceptance](../src/interview/index.ts) still
performs full validation and awaited saving. [proposal-validation.test.ts](../tests/unit/proposal-validation.test.ts)
covers false values, unchanged input, invalid options/types/states and credential refusal.
The existing cancellation/persistence tests were not changed. Default npm test subsequently
passed all 237 tests with the original concurrency configuration and timeout values.

## Integrity maintenance

`node tools/update-integrity.mjs` is read-only and fails on changed assets. To accept intentional
source edits, review `git diff -- question-bank failure-modes rules beginner-course knowledge-packs
outputs templates skills/project-templates` and any new files, then explicitly run
`node tools/update-integrity.mjs --write`. Review the inventory diff too. Never regenerate hashes
merely to hide an unexpected integrity failure. This tool neither downloads nor authenticates updates.

Algorithm: SHA-256 over strict UTF-8 text with CRLF normalized to LF. BOMs and other content are
preserved. File/directory counts, depth, bytes and total snapshot size are bounded. Inventory
syntax, duplicate keys, portable paths and complete asset membership are checked. The manifest
is the trusted checkout's reference, not a signature or independently secured trust root.

## Local checks and release prerequisites

Run `npm.cmd run test:security` for the AST capability and supply-chain policy checks. These
checks confine execution/network imports, reject dynamic eval/shell mode, and inspect the
actual manifest/lock/CI files. They are narrow policy checks, not Semgrep/CodeQL or a Trail of
Bits engagement. Their success cannot prove the absence of malicious code.

The fresh `npm.cmd audit --json --ignore-scripts --fetch-retries=0 --fetch-timeout=10000` request
returned exit 1: the registry audit endpoint could not be reached. No packages were installed.
The dependency advisory status therefore remains unverified by this session's network check.

Final test/build/CLI command output and any local runner limitations are recorded in
[the validation guide](../specs/009-cli-hardening/quickstart.md).

Before release, verify artifact/source provenance and independent checksums, registry identity
and 2FA, a clean published install on supported platforms, fresh advisory results, outside-team
attack testing, real scanner operation, and the remaining primary-source pack reviews. Future
update/AI/stuck/hook-install features need their own security design/tests. Concurrent hostile
filesystem replacement remains outside the portable pathname protections demonstrated here.

## Primary-source checks

- [Node crypto](https://nodejs.org/api/crypto.html#cryptocreatehashalgorithm-options) documents the hash primitive; [Node TypeScript](https://nodejs.org/api/typescript.html#type-stripping) documents the maintainer script's native type stripping.
- [IANA IPv6 special registry](https://www.iana.org/assignments/iana-ipv6-special-registry) lists 2001:2::/48 benchmarking and 3fff::/20 documentation as non-global. The filter conservatively rejects their enclosing prefixes; tests include public/non-global mixed DNS results.
- [npm provenance](https://docs.npmjs.com/generating-provenance-statements/) describes linking builds to source; it does not establish benign code. [npm audit](https://docs.npmjs.com/cli/v11/commands/npm-audit/) documents advisory checks and failure thresholds.
- [Vitest maxWorkers](https://vitest.dev/config/maxworkers) documents worker concurrency independently of assertion/test timeouts. Local parallel runs and their actual results are retained in the validation record.

These sources were checked on 2026-11-01. No claim is made that the unrelated standards and
regulatory packs were fully researched as part of this CLI review.
