# npm release

For repeat releases through GitHub Actions, use [GitHub/npm publishing](10-github-npm-publishing.md).
The 2026-11-01 artifact below is historical; build a new artifact for current source changes.

Package: @johnasblasco/vibecode@0.1.0. Command: vibecode. Owner: johnasblasco.
The user chose MIT and authorized public publication and bundling the already installed
locked runtime dependencies. No new dependency installation or git commit is part of this work.

## Build and review

Run npm.cmd run release:pack (npm run release:pack on macOS/Linux). This compiles into a
fresh .tooling-build/releases/vibecode-* directory and packs offline with scripts ignored.
The private root workspace cannot be published accidentally; only the staged manifest is public.

The packager checks all runtime asset digests, exact compiled/asset/dependency file inventory,
the LF executable shebang, dependency versions/declarations, licenses and absence of install
hooks. It bundles only the eight locked production packages already installed locally.
Each release directory is retained, including failed attempts, for inspection. Never publish
an earlier failed tarball: use only the artifact associated with a passing check and receipt.

npm 12 removed shrinkwrap and changed pack JSON. Following the user's approved contract
change, bundleDependencies ships the exact installed runtime tree; release-lock.json records
the original production lock entries. It does not instruct npm to enforce a lock. The receipt
contains the tarball SHA-256/SHA-512 and hashes of bundled files. These checks trust the local
checkout, compiler, npm and installed dependency contents; they are not signed provenance.

## Checks

Run npm.cmd run test:release. It packs the real artifact, extracts into a fresh OS temporary
directory outside the checkout, compares bundled byte hashes, runs --help, and runs
doctor --dry-run. The dry run correctly returns blocked (3), because planned checks do not
prove prerequisites. No subprocess checks, network requests or installs are triggered by it.
These are unpacked-artifact smoke checks, not an npm installation test. Retain their temporary
directory until deletion is explicitly approved.

Run the usual lint, typecheck, build, application, tooling, dependency, security and Python
checks too. CI includes release tests using the existing fully pinned actions. Local Windows
checks do not prove macOS/Linux CI, fresh registry audit, external review or signed provenance.

## Publication

Verify npm.cmd whoami --registry=https://registry.npmjs.org/ reports johnasblasco in your own
authenticated terminal. Never paste credentials, tokens or one-time codes into chat.

After all checks, publish the exact verified tarball using:

```powershell
npm.cmd publish "<verified tarball path>" --access public --ignore-scripts --registry=https://registry.npmjs.org/
```

Use npm instead of npm.cmd on macOS/Linux. Complete any npm authentication in your own terminal.
Do not publish the private repository root or modify version/dependency expectations to pass.
Registry publication cannot be claimed until npm reports success and the published version
has been independently queried. A failed auth/registry check leaves the package unpublished
by this process. No clean install, new audit result or provenance is implied by packing.

After confirmed publication, users can install with npm install --global
@johnasblasco/vibecode@0.1.0 --ignore-scripts and run vibecode init in a project folder.
The package requires Node >=26.13.0 and <27. Windows users can use npm.cmd and vibecode.cmd.

## Sources checked 2026-11-01

- [npm 12 changelog](https://docs.npmjs.com/cli/v12/using-npm/changelog/): shrinkwrap removal,
  bundleDependencies recommendation, changed JSON output.
- [npm publish](https://docs.npmjs.com/cli/v12/commands/npm-publish/): tarball publication.
- [Scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/).
- [MIT license](https://opensource.org/license/mit).

## Observed result, 2026-11-01

The checked artifact is
.tooling-build/releases/vibecode-SscOjf/johnasblasco-vibecode-0.1.0.tgz (382 files).
Its sibling receipt.json records this SHA-256, independently rechecked with Get-FileHash:

```text
f3ef476af6d648f3b0d9ca7076eede2db1fe3c9389a781789d7d3459445745bd
```

Passing checks: 247 application tests in 32 files; release tests 5/5 (including isolated
tarball extraction and CLI smoke checks); tooling 5/5; security policies 3/3; dependency
regressions 2/2; lint, typecheck, build and asset inventory verification. Python strict
validation has no structural errors or required coverage gaps; optional asvs:webrtc remains
uncovered. All 9 acceptance scenarios and 30 expression vectors plus 7 invalid cases pass.
The Python scenario and metadata regressions pass 1 and 2 tests respectively.

The approved publication attempt for this exact tarball failed with npm EACCES while
requesting https://registry.npmjs.org/@johnasblasco%2fvibecode. The earlier identity request
also failed with registry EACCES. No successful publication, fresh registry audit, clean npm
installation, signed provenance or independent platform testing is claimed.

From the repository root in the user's authenticated PowerShell terminal, the remaining command is:

```powershell
npm.cmd publish ".tooling-build/releases/vibecode-SscOjf/johnasblasco-vibecode-0.1.0.tgz" --access public --ignore-scripts --registry=https://registry.npmjs.org/
```

Then query npm.cmd view @johnasblasco/vibecode@0.1.0 version --registry=https://registry.npmjs.org/
to confirm the registry result before telling users to install it. No git commit was made.
