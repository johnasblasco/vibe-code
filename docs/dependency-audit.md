# Dependency Audit: GHSA-g3hv-75wg-m249

Reviewed 2026-11-01. Status: candidate remediation approved; installation blocked by session registry access.

## Evidence

The user's npm audit JSON reports 11 moderate findings. Only minimatch has a direct advisory;
the other ten findings propagate through ESLint and typescript-eslint's dependency graph.
Installed minimatch is 10.2.6, used by eslint 10.14.0, @eslint/config-array 0.23.5, and
@typescript-eslint/typescript-estree 8.72.1. It is a development dependency; the application
loader does not import it. This classification does not dismiss CI or developer exposure.

The upstream advisory lists versions below 11.0.1 as affected. It describes CPU/memory
amplification from attacker-controlled glob patterns at optimizationLevel >= 2:
https://github.com/advisories/GHSA-g3hv-75wg-m249

## Proposed Change

Keep the current lint toolchain. Temporarily override minimatch to exactly 11.0.3 for its
three known consumers. Do not run npm audit fix --force or apply the suggested old ESLint
and typescript-eslint versions. No audit threshold or acceptance expectation is changed.

Package identity/API documentation:
https://github.com/isaacs/minimatch/blob/v11.0.3/README.md
Current published version lookup:
https://www.npmjs.com/search?q=minimatch
Release and exact package metadata:
https://github.com/isaacs/minimatch/releases/tag/v11.0.3
https://raw.githubusercontent.com/isaacs/minimatch/v11.0.3/package.json
Override mechanism:
https://docs.npmjs.com/cli/v12/configuring-npm/package-json/#overrides

This crosses the parents' declared 10.x dependency ranges. Version 11 changes matching internals,
so compatibility must be demonstrated after installation. The package exposes both ESM and
CommonJS entry points and supports the installed Node version. Its declared dependencies include
@isaacs/nonrecursive-glob-match and brace-expansion; review their resolved lockfile entries too.

## Test-First Evidence and Completion Criteria

Added tests/tooling/dependencies.node.test.mjs before changing package overrides.
Observed result: affected-version lockfile check failed on minimatch 10.2.6; the independent
lint file-discovery comparison passed. CI now runs this separate dependency guard.

After successful installation:

1. Confirm all three consumers resolve the patched version, without affected nested copies.
2. Confirm the lockfile guard and lint file-discovery comparison pass.
3. Run lint, typecheck, all Vitest tests, tooling probes, and the required Python checks.
4. Obtain npm audit JSON and verify this advisory and its propagated findings are gone.
5. Inspect the lockfile diff. Do not claim remediation complete until these checks pass.

The user approved minimatch 11.0.3. The agent ran npm install --ignore-scripts with install
scripts disabled, a workspace-local cache, and no fetch retries. It failed with EACCES while
fetching https://registry.npmjs.org/minimatch. No additional permission is being requested.
The lockfile and installed packages still contain 10.2.6. The candidate is not an installed
or verified fix. No staging or commits made.
Remove/reconsider the overrides when supported upstream dependency ranges include the patch.
