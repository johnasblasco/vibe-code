# Research: Project Skeleton

Lookup date: 2026-11-01. All six listed packages approved by the user. They are now available
locally, and package-lock.json records the npm dependency graph.

## Proposed Direct Dependencies

| Package | Proposed version | Primary evidence |
| --- | --- | --- |
| typescript | 6.0.3 | https://github.com/microsoft/TypeScript/releases/tag/v6.0.3 |
| eslint | 10.14.0 | https://github.com/eslint/eslint/releases |
| @eslint/js | 10.0.1 | https://www.npmjs.com/package/%40eslint/js?activeTab=versions |
| typescript-eslint | 8.72.1 | https://github.com/typescript-eslint/typescript-eslint/releases/tag/v8.72.1 |
| vitest | 5.0.5 | https://github.com/vitest-dev/vitest/releases/tag/v5.0.5 |
| PyYAML (Python checks only) | 6.0.3 | https://pypi.org/project/PyYAML/ |

## Package Name Verification

- TypeScript: https://www.typescriptlang.org/download/
- ESLint and TypeScript lint packages: https://typescript-eslint.io/getting-started/
- Vitest: https://vitest.dev/guide/
- PyYAML: https://yaml.com/projects/pyyaml/

## Decisions

Use TypeScript 6.0.3 as a proposed compatibility pin instead of the independently current 7.0.2.
The official lint compatibility page supports TypeScript >=4.8.4 <6.1.0 and ESLint 10:
https://typescript-eslint.io/users/dependency-versions/
The proposed typescript-eslint release manifest confirms the same peer ranges:
https://raw.githubusercontent.com/typescript-eslint/typescript-eslint/main/packages/typescript-eslint/package.json

Use npm.cmd in Windows PowerShell because npm.ps1 is blocked by local execution policy.
Do not change execution policy system-wide. Use locked installs after the initial approved resolution.
Do not install commander or @clack/prompts in the skeleton; add them when implementing commands.

## Execution Prerequisites and Outcomes

- Installation approval received for the six packages listed above.
- Python reference checks now run with PyYAML 6.0.3 and pass after the Windows path fix below.
- npm ls --depth=0 confirms the five approved exact direct versions. No additional direct
  packages or Node typings were needed for this skeleton.
- Runtime and full action hashes verified below; workflow implemented with those pins.
- ignore-scripts=true is recorded in .npmrc; the installed Vitest toolchain runs successfully.
- npm audit remains blocked by the registry advisory endpoint; no clean audit claimed.

Network limits: shell requests to registry.npmjs.org failed to connect. Several registry/browser
requests returned access errors. GitHub release pages and official documentation were accessible.
Source manifests on main establish package identity and peer ranges, not publication by themselves.

## Verified Runtime and Actions

Node 26.13.0 is listed as LTS in https://nodejs.org/dist/index.json and matches the installed runtime.
The hashes below were obtained by following each official release's commit link on 2026-11-01.

| Action | Release | Full commit and primary source |
| --- | --- | --- |
| actions/checkout | v7.0.1 | https://github.com/actions/checkout/commit/3d3c42e5aac5ba805825da76410c181273ba90b1 |
| actions/setup-node | v7.1.0 | https://github.com/actions/setup-node/commit/949feb2413d6458794dcd2491c4babbbce0c15c1 |
| actions/setup-python | v7.1.0 | https://github.com/actions/setup-python/commit/6d4fd22b20465ccc0f7354476588e8df7c9ca0e0 |

## Initial Execution Evidence

- python -m venv .venv: exit 0; local environment created.
- Local pip install PyYAML==6.0.3: exit 1; no matching distribution. An explicit official
  PyPI index retry also failed. This is not evidence that the package/version does not exist.
- node --test tests/tooling/skeleton.node.test.mjs before implementation: exit 1;
  two failures for missing package.json and missing .github/workflows/ci.yml.
- npm install with ignore-scripts and explicit official registry: exit 1, EACCES fetching
  https://registry.npmjs.org/@eslint%2fjs. No lockfile produced.
- Dependent implementation paused on failed installation. No commits or staging performed.

## Resumed Execution Evidence

- Dependencies became available between sessions: PyYAML 6.0.3 and all five approved npm
  packages. Existing package-lock.json retained; no additional installation was necessary.
- Strict Python validator passes: 343 questions, 10 cards, 8 packs, 61 failure modes,
  18 rules, no structural errors or required coverage gaps.
- Initial scenario run: 1/9 passed. Eight failed because os.path.relpath returned backslashes
  in loaded module identifiers on Windows, while expectations use forward slashes.
- Added tools/test_run_scenarios.py first and observed its failure. Normalized the path
  separator in the Python reference; regression test and all 9 unchanged scenarios pass.
- Shared expression suite passes all 30 vectors and 7 parse-error cases.
- Vitest smoke test first failed on missing src/index.js, then passed after src/index.ts
  supplied an empty ESM module boundary.
- Tooling tests first failed for missing lint configuration and tsconfig.json. The completed
  suite passes 5 tests, verifying real nonzero exits for lint/typecheck/assertion failures,
  the package script contract, and the pinned workflow/platform matrix.
- npm run lint, npm run typecheck, and npm test pass locally on Windows.
- npm audit --audit-level=high fails to reach the registry advisory endpoint. Hosted CI has
  not been run and macOS/Linux execution is unverified. No staging or commits performed.

The pinned setup action input schemas were checked against their exact commits:
https://raw.githubusercontent.com/actions/setup-node/949feb2413d6458794dcd2491c4babbbce0c15c1/action.yml
https://raw.githubusercontent.com/actions/setup-python/6d4fd22b20465ccc0f7354476588e8df7c9ca0e0/action.yml
