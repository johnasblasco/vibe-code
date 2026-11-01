# CLI Hardening Validation

Read AGENTS.md first. Do not install packages or stage/commit for this feature.

Run npm.cmd test, npm.cmd run lint, npm.cmd run typecheck, npm.cmd run build,
npm.cmd run test:security, npm.cmd run test:dependencies, npm.cmd run test:tooling,
and node tools/update-integrity.mjs. In macOS/Linux use npm instead of npm.cmd.
Run all three AGENTS.md Python checks with the current UTC date.

Use disposable test copies for corruption tests. Never edit installed production assets to
test refusal. The review in docs/08-cli-hardening-review.md records code/test evidence for
every original threat and explicitly separates local protections from release prerequisites.

## Observed local results, 2026-11-01

The final default npm.cmd test passed 237 tests in 31 files. Lint, typecheck and build passed.
Security policy tests passed 3/3, dependency regression checks 2/2 and tooling checks 5/5.
The strict Python validator found no structural errors/gaps; all 9 personas passed; expressions
passed 30 vectors and 7 error cases. Python scenario-regression tests passed 1/1 and metadata
tests 2/2. The only uncovered optional tag remains asvs:webrtc. git diff --check passed.

Actual final compiled checks:

```text
node dist/cli/main.js --help
CLI_HELP_EXIT=0

node dist/cli/main.js doctor --dry-run
[unverified] env.install_tools/0
[unverified] env.install_tools/1
[unverified] env.install_tools/2
DOCTOR_DRY_RUN_EXIT=3

Compiled runCli with a disposable corrupted pack and guarded doctor adapters:
Kit integrity check failed. No actions were started.
CORRUPTED_KIT_EXIT=1 IO_CALLS=0

node tools/update-integrity.mjs
Asset inventory verified.
```

The corrupted-kit compiled API check used a one-off ignored helper under .tooling-build and
a disposable temp copy. Permanent reproduction is tests/unit/asset-integrity.test.ts, which
also covers missing/extra/template/inventory/link cases and post-verification replacement.
No real production/preview was contacted, hook installed, project commit made or package installed.

Initial full/serial runs exposed existing interview/Git timeouts; those failures were retained
and investigated. Repeated whole-bank validation for each proposed default was removed via a
candidate-only validator using the same answer rules. Actual answer acceptance still performs
full validation and awaited saving. The new helper test failed before implementation; unchanged
interview/cancellation/persistence tests and the final default full suite then passed. No test
expectation, timeout, Vitest configuration, concurrency setting or persona budget was changed.

The fresh npm registry audit request failed to reach its endpoint and returned exit 1. Offline
policy/lock checks passed, but a fresh zero-vulnerability report is not claimed. Hosted CI,
macOS/Linux execution, actual Gitleaks, a deployed preview, private CI, signed registry release,
account 2FA, clean published install and outside-team testing remain unverified. See the full
review for trust-root, concurrent filesystem replacement and future-feature limits.

No staging or commits were performed. There are no Spec Kit extension hooks in this checkout.
