# Current Interview Verification

Read AGENTS.md first. This feature is incomplete: terminal adapter and CLI are pending.

```powershell
node node_modules/vitest/vitest.mjs run tests/unit/interview.test.ts
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:tooling
npm.cmd run test:dependencies
```

Eight core tests pass: stage scope/batched defaults, cancellation before an answer, cancellation
on review, YAML contradiction/stop display, invalid-input retry, real-disk resume, individual
default edits, and new-question cursor persistence. A missing-module failure and a new-question
cursor failure were observed before implementation/fix. Existing persona files/budgets remain
unchanged. The user-facing Clack and Commander behavior has not been implemented or verified.

commander 15.0.0 and @clack/prompts 1.8.1 were approved, but the session's install failed with
EACCES reaching registry.npmjs.org. The exact versions are now declared in package.json.
Run npm.cmd install --ignore-scripts from a terminal with registry access to update the lockfile.
Do not use npm ci until it succeeds. No packages were installed or silently replaced by the
agent. No staging changes or commits were made by the agent.
