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
The user subsequently completed npm install --ignore-scripts and reported zero vulnerabilities.
Both approved versions are installed and locked; npm ls --depth=0 verified the exact versions.
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

## Adapter and CLI Evidence

The adapter/CLI suites first failed because both modules were absent. Their tests now cover
cancel at the state/value/deferral/review prompts, false booleans, allowed states, proposal date
display, pre-aborted signals, help without a terminal, rejected piped input/unknown arguments,
and on-disk cancelled progress. A further test failed before data-backed help labels were added.

The compiled command was exercised in a real PowerShell PTY: select Answer now, save a No answer
for user_accounts, then Ctrl+C at physical. The shell reported CLI_EXIT=130. The JSON contained
answered false and current_question physical. A second next invocation began at physical,
and Ctrl+C again returned 130. Non-TTY init returned 1 and did not create a default state file.
That original implementation used Clack's masked password primitive with a warning. The user's
later [direct interview requirement](../014-direct-project-interview/spec.md) supersedes it:
ordinary project text is visible and that warning is removed.
This verifies local terminal behavior, not screen-reader usability or hosted CI execution.
