# Research: CLI Hardening

Decision: verify a complete SHA-256 text inventory at CLI startup and retain verified content
in memory. Normalize CRLF to LF for text assets so Git line-ending settings do not change
meaningful content. Reject symlinks, missing/additional assets and invalid inventories. The
raw YAML parser is not a trust boundary and remains available for fixture/reference use.

Rationale: a valid YAML parse does not establish integrity. Re-reading templates after a check
would admit later replacement. Checksummed assets satisfy the threat model relative to a trusted
checkout. A manifest adjacent to assets does not authenticate a compromised distribution.

Alternatives: unsigned downloaded updates are refused by leaving update unavailable. A signing
service or publishing pipeline needs a real release identity and is outside this review. No
invented registry install command or unverifiable account claim is introduced.

Decision: test secret-bearing userinfo and authorization headers, shell punctuation, planted
repository instructions, wrong commit responses and existing consent/live-gate protections.
Run local policy/static checks using the already installed compiler rather than installing
another scanner. Clearly distinguish these checks from independent security testing.

Observed baseline: strict Python validation passed; all 9 personas passed; expression tests
passed 30 vectors and 7 error cases. Optional asvs:webrtc remains an accepted optional gap.

Primary-source research and concrete observed regressions are recorded with the final review.

Read-only research confirmed Node crypto hashing/native TypeScript stripping and npm provenance
limits in official documentation, plus non-global IPv6 ranges in the IANA registry. Another
observed regression was an internally consistent moved release tag accepted by generation;
the new generation guard compares that known release with the reviewed pack. The metadata
parser API retains its existing tests; it does not itself confer generation approval.

The initial serial asset reader caused timeouts; bounded batches of 8 reads and concurrent
directory discovery fixed the focused integrity regressions without raising any timeout.
Full parallel validation later showed variable timeouts in existing interview/Git tests.
Serial runs and focused checks are recorded explicitly, without changing Vitest configuration,
assertions, timeout values or persona budgets. The registry audit endpoint was unreachable;
the policy/lock checks do not substitute for a fresh advisory report.

Resolution: proposals repeatedly called setAnswer solely to test candidate eligibility, cloning
and validating the whole 343-question state for every suggestion on every queue iteration.
After an observed missing-helper test failure, validateAnswerForQuestion reused the same
definition/type/options/allowed-state/secret checks for that candidate only. resume still
validates the full input state, and accepted answers still use full setAnswer plus awaited
save. A read-only research review confirmed that boundary. Focused interview/state/helper
checks passed 21/21; the unchanged default npm test then passed 237/237 across 31 files.
