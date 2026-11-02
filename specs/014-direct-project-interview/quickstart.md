# Direct interview: try it locally

From the repository root in PowerShell, with the already approved dependencies installed:

```powershell
npm.cmd run build
npm.cmd run vibecode -- init
```

On macOS/Linux use npm instead of npm.cmd. init resumes an existing state. To see the complete
new opening without resetting any answers, select a fresh directory:

```powershell
New-Item -ItemType Directory -Path .tooling-build/direct-trial
npm.cmd run vibecode -- init --state .tooling-build/direct-trial/state.json
```

Choose another directory name if direct-trial already exists. No existing state needs deletion.

The opening asks name, project description, project type, audience and first-version features.
Ordinary answers are visible while typing. Each prompt has a short numbered title; explanatory
paragraphs and the hidden-input notice are gone. A single checklist records optional capabilities,
then the builder selects their experience. A software project without hardware or AI actions
needs seven prompts and one review of two proposed defaults. Unchecking defaults asks them
individually. Explicit deferral and not-applicable choices retain their required metadata.

Business validation, scope/risk planning and AI collaboration policies remain in YAML at plan
stage. Generation can request missing bound answers. The physical-harm question is conditional
on hardware/physical flags, declared hardware type or AI actions. Saved serious-harm answers
still affect tiers and stop rules. No unanswered harm flag is silently recorded as none.

## Observed local verification, 2026-11-02

The new tests initially exposed masked typing, warning/explanation clutter and irrelevant
opening questions. Four regressions now cover visible text, generic credential refusal, both
static-site and account-app paths, and hardware/AI/saved-answer stop behavior. The earlier UI
tests and contracts were updated for the user's explicit replacement of masking; the nine
acceptance scenarios, their expectations, timeouts and budgets were not changed.

Actual final application output:

```text
Test Files  34 passed (34)
     Tests  261 passed (261)
```

One preceding full run hit the existing five-second native Git-probe test limit (260 passed,
one timed out). That test passed in isolation, and the unmodified full test command subsequently
passed all 261. No concurrency configuration or timeout was changed.

Lint, typecheck and build passed. Security policies passed 3/3, tooling 5/5, dependencies 2/2,
publishing policies 5/5 and both Windows system/Git GNU tar extraction checks 2/2. Release tests
passed 5/5, including actual packing and extracted-artifact --help and doctor --dry-run checks
(382 files). These checks do not publish anything or establish registry advisory status.

Strict Python validation passed with 343 questions, 65 failure modes and no structural or
required-coverage gaps. The existing optional asvs:webrtc gap remains. All nine personas passed;
expression tests passed 30 vectors and seven invalid cases. The seven intentional runtime asset
diffs were reviewed before refreshing their checksums; read-only inventory verification passed.

A native Windows PowerShell PTY showed the following real input before Enter, with no mask:

```text
1. Project name?
Portfolio demo
```

The walkthrough then accepted a portfolio description, website type, audience and feature list,
an empty capabilities checklist and beginner experience. Its only defaults were First usable
version and Standard depth. It completed without accident, business-proof or AI-policy questions
and printed NODE_EXIT=0. Synthetic state remains in the ignored
.tooling-build/direct-demo-20261102a directory. No user answers were reset.

These are local Windows checks, not a macOS/Linux visual review or a new registry audit.
Previously installed or published npm packages keep their old design until a new version is
published and installed. The local commands above run the changed source build. Earlier packed
tarballs do not contain these changes. No package was installed, no commit made and no package
published. The pre-existing 0.1.1 manifest/lock change was preserved.
