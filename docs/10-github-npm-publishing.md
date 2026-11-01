# Publish Vibecode with GitHub Actions

Repository: [johnasblasco/vibe-code](https://github.com/johnasblasco/vibe-code).
Package: @johnasblasco/vibecode. CI: .github/workflows/ci.yml.
Trusted publishing entrypoint: .github/workflows/publish.yml.

## What changed

The observed [failed run](https://github.com/johnasblasco/vibe-code/actions/runs/41324651348)
ran TypeScript/Python parity tests before installing PyYAML. On Windows the reference also
assumed a local .venv; on macOS strict state-path checks rejected symlinked temp ancestors.
CI now installs the existing pinned PyYAML first, passes setup-python's executable explicitly,
and creates a physical runner-owned temporary directory. No application path guard, persona,
assertion, budget or timeout was relaxed. The Python-reference harness changes its executable
selection only; the ranking/score comparisons are unchanged.

A published stable GitHub Release calls the complete reusable three-platform CI workflow.
After success, an Ubuntu publisher checks repository/version/tag/commit and root lock metadata,
builds a fresh staged public package, verifies its inventory, unpacks it and checks bundled
hashes plus --help/doctor --dry-run. It publishes that exact tarball with provenance. The
workspace stays private. Only the publishing job receives id-token: write; PR and branch CI
have read-only contents access. All remote actions use reverified full commit hashes.

## Connect npm once

First get the committed files onto your GitHub main branch using your usual review/push
process. This task does not commit or push them. The workflow file must exist in GitHub.

Sign into npm as johnasblasco. Open your package's Settings -> Trusted publishing -> add a
GitHub Actions publisher. Enter:

| npm field | Value |
|---|---|
| Organization or user | johnasblasco |
| Repository | vibe-code |
| Workflow filename | publish.yml |
| Environment | Leave blank (the workflow uses no named environment) |
| Allowed actions | Enable direct npm publish |

Enter only publish.yml, without .github/workflows/. No NPM_TOKEN secret is needed.
Publish soon after creating the trust configuration; npm expires an unused new configuration
after two days. Complete npm account authentication privately in its own UI.

If the package does not yet exist, first perform one manual publish with account 2FA enabled:

```powershell
npm.cmd login --auth-type=web --registry=https://registry.npmjs.org/
npm.cmd run release:pack
```

Review the NEW tarball path, inventory and checksum printed by release:pack, then publish
that exact path with npm.cmd publish "<printed tarball path>" --access public --ignore-scripts
--registry=https://registry.npmjs.org/. Confirm its version with npm view. Then configure the
package's trusted publisher. Never paste login codes, recovery codes or tokens into chat.

## Publish each update

Check the registry in your own terminal:

```powershell
npm.cmd view @johnasblasco/vibecode version --registry=https://registry.npmjs.org/
```

Choose a version that has not been published. If 0.1.0 exists and you want the next patch:

```powershell
npm.cmd version patch --no-git-tag-version
```

That updates package.json and package-lock.json without committing or creating a git tag.
For the current 0.1.0 manifest it produces 0.1.1. CI compares exact manifest/lock/release tag
versions; the release tests no longer freeze the project to its initial version. The npm-12
JSON-layout fixture deliberately retains 0.1.0 independently of the current package version.

Review and push the version change and workflow files through your normal Git process.
On GitHub open Releases -> Draft a new release. Choose/create v0.1.1 (or the exact v-prefixed
version in package.json), targeting the intended reviewed commit on main. Publish a normal
release, with the prerelease checkbox off. Tags alone do not trigger npm publication.

Open Actions -> Publish to npm. It first runs CI on all three operating systems; publication
waits for every check. Successful npm publication is a separate result after those checks.
The GitHub release/CI job logs provide the actual outcome; local tests do not establish that
npm trust is configured or that a hosted run succeeded. A failed publish never triggers an
automatic version bump. If a run fails, fix the cause before rerunning; check whether its
version already exists before attempting a second publish.

Confirm the result, substituting your released version:

```powershell
npm.cmd view @johnasblasco/vibecode@0.1.1 version dist.integrity --registry=https://registry.npmjs.org/
```

Users can then install @johnasblasco/vibecode without a version to get the applicable latest
release. Their existing installation does not update automatically.

## Local verification and limits

Run npm.cmd run test:publishing, the usual application/security/tooling/dependency checks and
npm.cmd run test:release. The release check now also exercises the same smoke helper used
by publication and rejects an altered tarball checksum. No npm installation is needed for
the extracted-artifact smoke test. No dependency versions were changed or installed locally.

The new workflow has not been pushed or executed by this task. No npm settings were changed
and no release was published by this task. npm package availability could not be verified
from this environment. The package version is intentionally unchanged until the maintainer
chooses the next unpublished version. See specs/013-github-npm/quickstart.md for local results.

## Official references (checked 2026-11-02)

- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).
- [npm provenance](https://docs.npmjs.com/generating-provenance-statements/).
- [GitHub reusable workflows](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows).
- [GitHub npm publishing](https://docs.github.com/en/actions/tutorials/publish-packages/publish-nodejs-packages).
- Exact action release/commit resolutions and original failures: specs/013-github-npm/research.md.
