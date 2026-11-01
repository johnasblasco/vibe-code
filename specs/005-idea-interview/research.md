# Interview Research

Date: 2026-11-01.

Verified exact packages and current stable versions:
- commander 15.0.0: https://www.npmjs.com/package/commander and
  https://github.com/tj/commander.js/releases/tag/v15.0.0 .
- @clack/prompts 1.8.1: https://www.npmjs.com/package/%40clack/prompts?activeTab=versions and
  https://bomb.sh/docs/clack/packages/prompts/ .

Installation approval received for both exact packages. The agent ran npm install --save-exact
--ignore-scripts commander@15.0.0 @clack/prompts@1.8.1 with a workspace-local cache and no fetch
retries. It failed with EACCES fetching the official registry's @clack/prompts metadata.
Both approved versions are declared in package.json. The lockfile is not synchronized yet;
run npm install --ignore-scripts in a terminal with registry access before using npm ci.
Core interview orchestration takes an injected prompt port, allowing test-first work independently
of the terminal adapter. The core uses existing engine/state modules for every decision/save.
Interface strings are a new YAML asset, not embedded English in application source.

Recommendations come only from question defaults and rules/recommendations.yaml. Preserve
explicit false defaults. Profile conditions use the expression engine, and provenance includes
the profile's explanation and the YAML verification date. Unresolved sentinels require input.
No new scenario expectations or question budgets are introduced.

## Core Execution Evidence

The core suite failed first on the missing interview module. Eight tests now pass, including
real-disk interruption/resume. A separate regression first reproduced the unknown cursor error
for a newly added bank question; its definition is now recorded before cursor persistence.
The edit-all fixture explicitly retains standard depth so its assertion examines editing all
currently applicable proposals rather than changing depth during the fixture.

The terminal adapter and CLI are not complete. Their package installation is blocked; core
test success does not establish real terminal cancellation, accessibility, or CLI correctness.
