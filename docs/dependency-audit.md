# Dependency Audit: GHSA-g3hv-75wg-m249

Reviewed 2026-11-01. Status: patched dependency installed; local compatibility checks passed.

## Evidence

The user's npm audit JSON reports 11 moderate findings. Only minimatch has a direct advisory;
the other ten findings propagate through ESLint and typescript-eslint's dependency graph.
The affected installed version was minimatch 10.2.6, used by eslint 10.14.0, @eslint/config-array 0.23.5, and
@typescript-eslint/typescript-estree 8.72.1. It is a development dependency; the application
loader does not import it. This classification does not dismiss CI or developer exposure.

The upstream advisory lists versions below 11.0.1 as affected. It describes CPU/memory
amplification from attacker-controlled glob patterns at optimizationLevel >= 2:
https://github.com/advisories/GHSA-g3hv-75wg-m249

## Applied Change

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
so compatibility was checked after installation. The package exposes both ESM and
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
4. Record the registry audit result and verify the patched dependency graph.
5. Inspect the lockfile diff. Do not claim remediation complete until these checks pass.

The user approved minimatch 11.0.3. The agent's installation attempt was blocked by EACCES at
the registry. The user then ran npm.cmd install --ignore-scripts successfully and supplied
the result: added 1 package, changed 1 package, audited 132 packages, found 0 vulnerabilities.

The agent independently verified:

- All three affected consumers use 11.0.3; no affected minimatch copy remains in the lockfile.
- The new @isaacs/nonrecursive-glob-match helper is 1.0.3; brace-expansion remains 5.0.12.
  Resolved archives use registry.npmjs.org, include integrity hashes, and declare no install scripts.
- Both dependency regression checks pass, including full source/unit-test lint discovery.
- Lint, typecheck, 84 Vitest tests, and all 5 tooling checks pass.
- Strict Python validation, all 9 scenarios, and all shared expression cases pass.
- The lockfile diff was reviewed. No audit thresholds, test expectations, or budgets changed.

The clean registry audit result is from the user's terminal output; the agent's session still
cannot reach the advisory endpoint and does not claim an independent live audit. Compatibility
has been checked locally on Windows; hosted CI and other platforms remain unrun.
No staging changes or commits were made by the agent.
Remove/reconsider the overrides when supported upstream dependency ranges include the patch.
