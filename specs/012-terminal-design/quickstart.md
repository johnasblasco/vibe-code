# Modern terminal interview

From the repository root in PowerShell:

```powershell
npm.cmd run build
npm.cmd run vibecode -- init
```

The first interview displays the Vibecode artwork, short welcome, saved-progress guidance,
and sections such as Your project and What it needs. Each new question gets a session number;
there is no fixed total because answers change the route. Retried questions keep their number.
Menus show at most seven options at once and scroll to the remaining choices.

Ordinary answers remain masked. The privacy notice appears once per adapter session, help is
wrapped into guided lines, and /defer and /na retain explicit metadata. Reasons, sources and
verification dates remain available in the defaults review. Short review labels come from YAML
and do not change question IDs, answers, applicability or recommendation values.

Ctrl+C preserves accepted answers. Run npm.cmd run vibecode -- next to resume with a compact
welcome. Completion shows doctor/generate commands; cancellation or safety stops do not show
the completed brief screen. init resumes an existing state rather than resetting it.

For an independent fresh preview without touching your current state:

```powershell
New-Item -ItemType Directory -Path .tooling-build/visual-trial
npm.cmd run vibecode -- init --state .tooling-build/visual-trial/state.json
```

Use a new directory name if visual-trial already exists. No saved state needs deletion.

## Accessibility and color

Narrow terminals use the compact wordmark. Clack's ACCESSIBLE mode remains supported instead
of being forced globally. To request it for a command in PowerShell, set $env:ACCESSIBLE='1'
before starting the CLI; restore your previous setting afterward. The decorative artwork is
omitted in this mode. Node/Clack handle terminal color capabilities and NO_COLOR. Help and
noninteractive commands never open the interactive welcome.

## Evidence

All ten new UI regressions failed for their missing behavior before implementation. Existing
Clack assertions remain unchanged; its mock gained the new log.step/log.message methods.
Application tests passed 257/257 in 33 files on the final standalone run. One earlier run with
a concurrent PTY preview exceeded the existing five-second native Git-probe test limit; no
timeout, budget or expectation was changed. Lint, typecheck and build pass. Security policy
checks passed 3/3, tooling 5/5, dependency regressions 2/2.

A native Windows PowerShell PTY displayed the fresh banner, accepted a masked project name,
cancelled on the next question, and resumed without asking that name again. A later cancellation
at the feature checklist left its unconfirmed flags absent. The resumed portfolio flow reached
the defaults review and completion screen with exit 0. A separate readonly adapter preview
confirmed the shortened review labels and sources on screen. Demo state and that preview helper
remain in the ignored .tooling-build directory; they contain only synthetic project information.

Final verification on 2026-11-02: strict Python validation reports no structural errors or
required coverage gaps (optional asvs:webrtc remains uncovered); all nine personas pass;
expression tests pass 30 vectors plus seven invalid cases. Python scenario/metadata regression
checks also passed one and two tests respectively. Release tests pass 5/5, including actual
packing and isolated extraction of the 382-file tarball, bundled file hashes, --help and
doctor --dry-run. The doctor dry run correctly returns blocked rather than claiming readiness.
Asset integrity verification and git diff --check pass.

An additional PowerShell try/finally probe captured NODE_EXIT=130 after Ctrl+C; the terminal
wrapper's earlier exit 1 did not represent the Node exit code. The completed synthetic demo
contains 25 accepted answers, a null question cursor and the unchanged idea stage. Completing
the idea interview does not advance course gates.

This is local Windows validation, not independent macOS/Linux terminal testing or a fresh audit.
The assets are intentionally reviewed and their inventory refreshed; no questions, acceptance
scenario expectations or budgets were changed. No dependency was installed and no commit made.

These changes are local source/build changes. Previously packed or published npm versions do
not update automatically. Publishing this design requires a separate versioned release; do
not reuse the older vibecode-SscOjf tarball for these changes.

API source reviewed: https://bomb.sh/docs/clack/packages/prompts/ (2026-11-01), together with
the installed @clack/prompts 1.8.1 declarations and renderer/settings implementation.
