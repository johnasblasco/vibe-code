# Tasks: npm Release

- [x] T001 Read project rules, inspect release setup and verify npm/MIT documentation.
- [x] T002 Obtain public npm username and explicit MIT license choice; establish Python baseline.
- [x] T003 Write tests/tooling/release.node.test.mjs and observe missing-module/manifest failure; observe bundling/metadata drift failures before implementation.
- [x] T004 Add tools/create-release.mjs with fresh compilation, verified assets, approved locked runtime bundles and strict pack-list checking. The user explicitly approved replacing the new shrinkwrap contract for npm 12.
- [x] T005 Add LICENSE, scoped root/lock metadata and executable shebang without altering original safety expectations.
- [x] T006 Wire release commands and CI; document operation and user approvals in docs/09-npm-release.md.
- [x] T007 Run the full checks and create the actual reviewable tarball/receipt.
- [x] T008 Report exact artifact, unpacked smoke evidence and unverified clean-install status.
- [ ] T009 Confirm public registry publication. Authorized attempt failed with registry EACCES; authenticated user-terminal handoff is documented.

No packages were installed and no commits were made. An npm installation test remains separate
from the passing unpacked-artifact checks and follows the user's package approval rule.
