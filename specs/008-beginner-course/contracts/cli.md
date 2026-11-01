# CLI Contract

doctor [--stage stage-0|stage-1|stage-2] [--project <directory>] [--state <file>]
       [--probe-secrets] [--attest] [--preview-url <https-url>] [--expected-version <text>]
       [--repository <owner/name>] [--non-production] [--dry-run]

Default stage-0 checks machine tools. Higher stages evaluate cumulative earlier blockers.
Missing/unsupported evidence stays unverified; raw diagnostics are never echoed. --dry-run
shows checks without starting child processes, network requests, or consent prompts.
The scanner probe and remote checks require interactive typed consent. No installations or
project scripts run. Manual 2FA confirmations require --attest and remain labelled manual.

gates <gate> --verify uses the same doctor runner options for supported course boundaries.
Without --verify, the existing inspect-only behavior remains unchanged.

next --course [--advance] [doctor options]

Render the source cards for the current course stage. Freshly check its entry boundary first.
--advance also checks the exit boundary and saves the new cursor only when allowed. Stop at
the stage-3 boundary; do not execute stage-3 teaching/actions. Existing next without --course
continues the idea interview. Explicit --deferrals applies only to the current invocation.

Named exits remain: success 0, input/IO error 1, usage 2, blocked 3, stop 4, cancellation 130.
