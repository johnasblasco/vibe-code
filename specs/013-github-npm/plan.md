# Plan

Read the actual failed jobs, then write failing workflow and release-identity regressions.
Keep .github/workflows/ci.yml as the three-platform check and expose workflow_call. Add
publish.yml as the npm-registered entrypoint, calling CI before an OIDC publisher job.

tools/ci-environment.mjs creates a canonical runner-owned temporary directory and exports
TMPDIR/TEMP/TMP through GITHUB_ENV. The existing pre-mortem comparisons accept an explicit
SCAFFOLDER_PYTHON selected by setup-python, retaining the local fallback and every assertion.

tools/prepare-publish.mjs validates release context/metadata before calling the offline packager
and tools/smoke-release.mjs. It writes only the fresh checked tarball path to GITHUB_OUTPUT.
The workflow publishes the quoted path in a separate explicit npm step; release tags never
become shell program text. The package links to the exact GitHub repository for provenance.

Test workflow structure and refusal paths, actual canonical temp output, both release versions,
and the real smoke helper through the existing release-artifact test. Run all usual checks and
record remote limitations. npm settings and GitHub execution require the user's own account
setup/push; local success does not imply the hosted workflow ran or npm accepted publication.
