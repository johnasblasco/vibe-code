# Verification: GitHub/npm workflow

Checked locally on Windows, 2026-11-02. Operational steps are in
[GitHub/npm publishing](../../docs/10-github-npm-publishing.md).

The five new publishing tests were observed failing before the workflows/helpers existed:
the real PyYAML order bug, absent publish workflow, missing identity/temp helpers and missing
public repository metadata. They now pass. The temp test also creates a directory alias and
checks the exported temp directory resolves physically beneath the owned target.

Actual results:

- Application: 257 tests across 33 files, with SCAFFOLDER_PYTHON explicitly set to the installed
  approved interpreter. All nine Python/TypeScript pre-mortem parity comparisons remain intact.
- Publishing checks: 5/5, including both 0.1.0 and 0.1.1 and rejected tag/repo/commit/lock cases.
- Release: 5/5. The shared publisher smoke helper runs on the real packed artifact and rejects
  an altered SHA-256. The existing independent packed inventory/license/version/hash/CLI checks
  remain. Extracted --help succeeds; doctor --dry-run correctly returns blocked (3).
- Security policies: 3/3; tooling checks: 5/5; dependency regressions: 2/2.
- Lint, typecheck and build passed. No dependency version was changed or installed.
- Strict Python validation: no structural errors or required gaps; optional asvs:webrtc remains
  uncovered. Nine personas pass; expressions pass 30 vectors plus seven invalid cases. Additional
  Python scenario and metadata regression suites pass one and two tests respectively.
- Reviewed asset inventory and git diff --check pass. Nine acceptance YAML files, safety
  expectations, budgets and timeouts were not loosened.

An additional local release:prepare simulation used a synthetic release event, current HEAD,
the real root/lock metadata, and an owned GITHUB_OUTPUT file. The command exited 0 after packing
and smoke-testing the actual artifact, and emitted its path plus SHA-256:

```text
Verified @johnasblasco/vibecode@0.1.0
SHA-256: a12512ae445d9ac518806a9c7ddd2a5e279cb91aeb4c9075df654c2294a3e283
```

The artifact is under .tooling-build/releases/vibecode-Kq9RgD. This was a local preparation
exercise, not an actual GitHub release or an OIDC authentication test. A first synthetic event
written with PowerShell's UTF-8 BOM was rejected as invalid JSON before packing; the fixture
was rewritten as UTF-8 without BOM to match GitHub's event file. Production code was unchanged.

Current package version remains 0.1.0. Registry availability and npm trusted-publisher account
settings were not accessible/changed here. The new hosted workflow has not run because these
changes have not been committed or pushed by this task. No release or npm publication was
triggered, and no provenance assertion is made for this uncommitted local simulation. After
choosing the next unpublished version, use a fresh GitHub release workflow artifact.
