# Feature: Scoped npm Release Package

Created 2026-11-01. Owner: johnasblasco. License explicitly chosen by the user: MIT.
Proposed package: @johnasblasco/vibecode@0.1.0. Executable: vibecode.

## User Scenarios

1. A maintainer builds a reviewable npm tarball with the compiled CLI, every verified runtime
   asset, MIT license and executable launcher. No install or publication happens during packing.
2. A user installs the approved artifact and runs vibecode from their own project folder.
3. A maintainer can inspect the complete package inventory and checksum before publishing.

## Acceptance Requirements

- Root development workspace remains private; an explicit staged release manifest is public.
- Existing safety test expectations remain intact, including the private workspace/no root bin.
- Stage only compiled source, verified runtime assets, inventory, README, LICENSE, package.json
  and a production-only npm shrinkwrap. No answers, .env, credentials, dev tools or test fixtures.
- Compile into a new owned directory, including an LF shebang. Refuse missing/extra/linked files.
- Preserve pinned production dependencies and their locked transitive versions/integrity.
- Use executable/argument arrays for compiler/npm; no answer-built shell programs or lifecycle scripts.
- Check npm's actual packed file list against the expected set before reporting success.
- Create a SHA-256 receipt; preserve the stage and tarball for review. Never overwrite another release.
- New packages/clean-install tests and publication require the user's existing approval rules.
- No registry availability, account ownership, audit result, clean install or publication is claimed without evidence.

## Validation

Failing release tests first, then implementation; full existing checks and Python personas.
Packaging itself needs no additional dependency. A clean installation is a separate action
after an exact artifact is available for review and package-install approval.
