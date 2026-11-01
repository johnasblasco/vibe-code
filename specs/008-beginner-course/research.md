# Doctor Research

Date: 2026-11-01. No package installation required.

Decision: read runner IDs from the existing verify entries; never shell-execute their prose.
Descriptors are checked against a technical read-only operation grammar before any process;
the data cannot turn a version check into git push. Process bounds must be supplied explicitly
from the source policy rather than silently copied into native-adapter defaults.
Native processes have fixed executable names, argument arrays, sanitized Git/Docker/scanner
environments, bounded buffers/time, and cancellation. Docker daemon reads require a local
Unix socket or named pipe; remote contexts/DOCKER_HOST cannot be used accidentally.
Source: https://docs.docker.com/reference/cli/docker/context/inspect/ .

Decision: a direct Gitleaks hook is compared to the source-controlled supported shape and
tested only in an isolated repository. The scanner version must match the kit pin. Benign
content must reach a prepare-commit-msg guard; synthetic content must be stopped before it.
The guard aborts every commit and HEAD is checked afterwards. This honors the no-commit rule
while testing actual Git pre-commit behavior. Arbitrary/framework hooks are not executed and
no pre-commit environment may be installed implicitly.
Sources: https://git-scm.com/docs/githooks ,
https://raw.githubusercontent.com/gitleaks/gitleaks/v8.30.1/cmd/git.go ,
https://raw.githubusercontent.com/gitleaks/gitleaks/v8.30.1/cmd/root.go .

Decision: stage-2 GETs require explicit nonproduction designation and typed consent. Validate
the URL and all DNS results, reject private/reserved addresses, and pin the validated DNS
result into the HTTPS connection. Reject redirects, credentials and query strings. Capture
only bounded page text for comparison; never show or persist it. CI must be completed/success
for the local HEAD/branch and expected workflow; an older successful run cannot mask a newer
failed/pending run. No authenticated requests or token prompts.
Source: https://docs.github.com/en/rest/actions/workflow-runs#list-workflow-runs-for-a-workflow .

Native regression evidence: Windows Git rejected Node's \\.\nul null-device spelling; using
Git's NUL form made actual initialization pass. The guarded Git controls passed with a clearly
identified detector fixture, not an installed Gitleaks binary. Malformed CI run numbers initially
looked successful; nonnumeric/invalid sequence values now block. A course-load exception initially
leaked SIGINT listeners; load now happens inside the cleanup scope. Explicit deferral files are
validated for the requested exit and filtered to earlier entry obligations without weakening them.
Redirect bodies are destroyed immediately. Secret-shaped repository input rejects before IO.
Consent reviews show the actual hook and designated preview origin/repository. Course output
renders teaching text, not internal runner/record metadata. Every regression has a focused test;
doctor-integrity.yaml and failure entries AI-03/AI-07/AI-09/SW-29 document the relevant causes.

Decision: doctor stage-N evaluates the cumulative boundary stage-(N+1). Course mode separately
renders the source cards and verifies entry/exit boundaries. Persist only cursor/history; fresh
automatic checks and explicit current manual evidence are needed again after resuming. Stored
deferrals are history only; current deferrals require an explicit input file as before.
