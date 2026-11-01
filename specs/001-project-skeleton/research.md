# Research: Project Skeleton

Lookup date: 2026-11-01. No packages installed.

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

## Unresolved Execution Prerequisites

- Explicit installation approval for each proposed direct package.
- Python reference checks blocked on missing PyYAML; no baseline pass claimed.
- Confirm final graph and Node typings requirements before installation. If @types/node or any
  additional direct package is needed, verify its name and current version and obtain approval.
- Verify an exact supported Node release for CI from the official Node release source.
- Resolve full commit hashes for actions/checkout, actions/setup-node, and actions/setup-python
  from their official repositories. Never copy hashes from memory.
- Verify install-script policy with the selected toolchain before writing CI.

Network limits: shell requests to registry.npmjs.org failed to connect. Several registry/browser
requests returned access errors. GitHub release pages and official documentation were accessible.
Source manifests on main establish package identity and peer ranges, not publication by themselves.
