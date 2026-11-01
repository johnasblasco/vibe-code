# Doctor and Beginner Course

Read AGENTS.md first in every session. Use npm.cmd in PowerShell and npm on macOS/Linux.

```powershell
npm.cmd run build
npm.cmd run vibecode -- doctor --dry-run
npm.cmd run vibecode -- doctor
npm.cmd run vibecode -- doctor --stage stage-1 --dry-run
npm.cmd run vibecode -- next --course
npm.cmd run vibecode -- next --course --advance
```

Doctor installs nothing. Missing tools, unsupported hooks, missing manual confirmation, or
unavailable preview/CI evidence are blockers, not successful checks. The default machine check
is read-only and refuses remote Docker endpoints. Stage-1 secret testing needs --probe-secrets
and typed consent; it uses an isolated guarded repository and creates no commit. Arbitrary
project hooks are never executed. Stage-2 checks need a designated nonproduction preview,
expected version, repository and explicit consent. Never provide credentials or production URLs.
Use --attest for current manual 2FA confirmations. They are saved as manual records in
.scaffolder/course.json, not automatic passes. Stored history is never used to skip verification.
The supported direct-hook setup and exact hook are shown before probe consent. Other hook
frameworks remain unverified; no pre-commit environments are installed automatically.

For an already designated nonproduction public preview, supply --preview-url, --expected-version,
--repository owner/name, and --non-production. The tool shows the origin/repository before typed
consent. It uses public metadata only, never requests a token, and refuses credentials/private
addresses/redirects. Latest matching CI evidence must identify the current commit and branch.
Run gates stage-1 --verify to use the same stage-0 runners; ordinary gates remains inspection-only.

Only stages 0–2 are supported for course advancement. Later teaching and automated setup are
outside this feature. Run the TypeScript suite and all three AGENTS.md Python checks after changes.
Observed local CLI: help/build passed. --dry-run returned 3 with every check unverified and no
child/network action. Actual doctor detected Node 26.13.0 and Git 2.55.0, but the local Docker
engine did not answer, so it correctly returned 3. This does not establish that Docker works in
this environment. The course view returned 0 and rendered source teaching without executing steps.
A real PowerShell PTY Ctrl+C at probe consent returned 130 before starting the probe.

Native Git controls ran in disposable repositories with a controlled detector fixture, created
no commits, preserved the original repository/index, and cleaned owned probe data. These tests
do not claim that the actual Gitleaks executable was installed or exercised. Native HTTP tests
use controlled DNS/HTTPS adapters; no deployed production or preview target was contacted by
the agent. Live Docker/scanner/preview/private-CI readiness is not claimed.

The existing nine persona expectations and budgets are unchanged. The new CLI cleanup failure
entry raises the catalog to 62; it affects the CLI persona without adding questions. Optional
asvs:webrtc remains the existing uncovered optional tag.

Final local verification on 2026-11-01: lint, typecheck and build passed; Vitest passed all
219 tests in 28 files; dependency regression checks passed 2/2; tooling checks passed 5/5.
The strict Python validator reported no structural errors or gaps, all 9 persona scenarios
passed, and expressions passed 30 vectors plus 7 error cases. git diff --check passed.
The compiled CLI again returned 3 for doctor dry-run, 3 for the current Docker blocker,
and 0 for the stage-0 course view. No fresh registry audit or hosted CI run was performed.

No package installation, staging change, or commit was made by the agent. Hosted CI, macOS/Linux
terminal execution, source update signing, binary provenance, and filesystem race hardening
remain unverified or later work.
