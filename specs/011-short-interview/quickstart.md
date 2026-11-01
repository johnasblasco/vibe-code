# Shorter Opening Interview

From the repository root:

```powershell
npm.cmd run build
npm.cmd run vibecode -- init
npm.cmd run vibecode -- next
```

The first three questions are project name, description and project type. Sign-in is an
optional choice in one capability checklist, rather than a separate first question. A second
hardware checklist appears only when hardware applies. The harm question and safety stops remain.

Ordinary text/number/yes-no/single-choice questions need one answer screen. Text is masked and
secret-checked. Type /defer or /na to explicitly collect the required metadata; select the same
actions from ordinary choice menus. The capability checklist explicitly states that unchecked
features mean No; flags are saved only after confirmation. Cancelled or invalid selections
never save guessed flags. Existing answered flags are preserved and excluded from later checklists.

Budget, regions, scale, offline requirements, AI-tool/workflow policy and detailed data/features
now belong to planning. They retain the same IDs/types/options/tags and can still be requested
when file generation needs a concrete answer. No safety question was silently answered or removed.
The initial unpublished bank version remains 1.0.0; compatible answer definitions remain readable.

The nine persona scenarios and their budgets were not edited. The legacy adapter API remains
available for existing integrations; CLI init/next explicitly use the shorter guided flow and
direct-answer adapter.

## Observed results, 2026-11-01

The compiled terminal-independent flow completed both the static website and login-app cases
in 12 prompts plus one defaults review. Both opened with product.name, product.summary and
product.platform, with standaloneLogin=false. The underlying reference engine's software
idea queue decreased from 43 items (26 without defaults) to 25 (17 without defaults); the
guided checklist combines six boolean decisions into one screen. No acceptance budget changed.

Native PowerShell PTY: entered a demo name and description, selected Website or web app,
then cancelled the capability checklist. Exit 130. Saved IDs were product.name, product.summary,
product.platform; the cursor was user_accounts; no unconfirmed login flag was saved. Demo
state is in the ignored .tooling-build/short-opening-demo folder. No real project state was used.

Build, lint and typecheck passed. The default application suite passed 247 tests across 32
files, security policies 3/3, dependency regression checks 2/2 and tooling checks 5/5.
Strict Python validation reported 343 questions and no structural errors or gaps; all 9
personas passed; expression tests passed 30 vectors plus 7 invalid cases. Asset inventory
verification and git diff --check passed. Optional asvs:webrtc remains unchanged.

At the time of these interview checks, release packaging was blocked by npm 12 removing
shrinkwrap support. The subsequent authorized bundling change and its evidence are tracked
separately in specs/010-npm-release and docs/09-npm-release.md. These interview checks alone
do not establish a clean installation or publication.

Publication remains a separate task. No package installation or publication is performed here.
