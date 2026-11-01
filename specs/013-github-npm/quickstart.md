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

## Windows archive follow-up, 2026-11-02

After the maintainer pushed the initial CI fix, [run 41326819793](https://github.com/johnasblasco/vibe-code/actions/runs/41326819793)
passed on Ubuntu and macOS. Windows passed its application tests but failed in release smoke
extraction. The original local PowerShell check resolved Windows BSD tar; Git Bash resolves
GNU tar. GNU treats the archive's drive colon as a remote host and rejects native backslash
destination spelling. This was reproduced locally with the installed Git Bash GNU tar.

The fix feeds the already checksum-verified archive bytes through stdin and sets the extraction
directory through the subprocess cwd. It does not pass either Windows path as a tar argument.
The separate extraction in the existing release test uses the same portable invocation; all
inventory/hash/license/version assertions remain intact.

New test:archive checks binary content (including NUL and non-ASCII bytes) and destination
spaces with both native Windows BSD tar and Git Bash GNU tar. The GNU fixture includes its
bundled gzip on PATH, matching Git Bash. The regression was observed failing before the fix;
it also caught the destination-path issue after the first stdin-only change.

The updated Windows code has not been pushed or run on GitHub by this task. The green Unix
results above describe the inspected hosted run, not a hosted run of these new extraction edits.
Push this fix to start a new CI run; rerunning the old commit cannot pick up local changes.

Final local follow-up results: archive tests 2/2 (BSD and GNU), release tests 5/5 with Git's
usr/bin first on PATH, publishing tests 5/5, security policies 3/3, lint and typecheck passed.
The normal standalone application run passed 257/257 in 33 files. A broader run using the
GNU-first environment hit the already observed five-second Git-probe limit (256/257); that
probe then passed 2/2 in isolation with GNU first, and the normal standalone suite passed
without changing any timeout, assertion or budget. This archive fix does not address that
intermittent local probe timing. Python strict validation, nine personas and expression tests
pass; the optional asvs:webrtc coverage gap remains unchanged. No package install, commit,
push or publication was performed.
