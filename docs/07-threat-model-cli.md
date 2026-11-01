# Threat model: the scaffolder itself

The CLI downloads data, writes files, installs hooks, runs commands, reads project folders, and may call an AI. That makes it an attractive target and a powerful footgun.

## Assets
User secrets in `.env`. The user's machine and accounts. Trust in generated files. The registry account that publishes the CLI. The knowledge packs and templates (they are instructions that become code).

## Trust boundaries
Registry to user machine. Pack and template server to CLI. User answers to shell commands and generated files. Repository contents to any AI that reads them. CLI to third-party APIs (version and hash lookups).

## Threats (STRIDE)
| Threat | Category | Mitigation | Test |
|---|---|---|---|
| Malicious or tampered pack or template update | Tampering | Signed or checksummed packs; refuse unsigned; show a diff of changed facts | Corrupt a pack; CLI refuses |
| User answer injected into a shell command or file path | Elevation | Never build commands from answers by string concatenation; use argument arrays; validate slugs and names | Answer `a; rm -rf ~` as project name |
| Secrets copied into state file, `stuck` output, or telemetry | Information disclosure | Refuse key-shaped values; redact and preview; telemetry off by default | Put a fake key in `.env`, run `stuck` |
| Hijacked CI action or tag in generated workflow | Tampering | Resolve and write full commit hashes; empty default permissions; show the lookup date | Template contains no tag references |
| Typosquatted or hijacked CLI package | Spoofing | Publish with provenance and 2FA; documented exact install command; checksum on first run | Reproduce a clean install from the docs |
| Invented or malicious dependency added by the AI or by us | Tampering | Dependency policy; lockfile; scanner in CI; no install scripts in the CLI | `npm ci` only; audit in CI |
| Prompt injection through repository content read by an AI feature | Elevation | AI features read only files the user selects; outputs are suggestions; no auto-run | Plant instructions in a README, confirm nothing runs |
| Lookup service returns a malicious value (version, hash) | Tampering | Verify lookups against official hosts only; compare with the pack; show the source | Mock a wrong hash |
| Hooks or scripts installed without clear consent | Repudiation | Show what will be installed, require confirmation, log it in `docs/decisions/` | Decline each prompt |
| State file edited to skip a gate | Tampering | Gates re-verified from live checks, not from stored claims | Edit state to mark a stage passed; verify reruns |
| Beginner trusts a wrong recommendation | Misleading output | Show verification dates, never claim certification, show the expert escalation | Review wording against the liability rules |

## Review

The 2026-11-01 implementation review, code/test links for every row, observed results and
unverified release prerequisites are in [08-cli-hardening-review.md](08-cli-hardening-review.md).
The table above remains the original requirements; this link does not mark every threat solved.
Before each release: rerun this table against what changed; run the Trail of Bits-style static analysis and supply-chain checks on the CLI; have someone outside the team try to break the install and the `stuck` redaction.
