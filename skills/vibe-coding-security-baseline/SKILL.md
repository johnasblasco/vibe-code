---
name: vibe-coding-security-baseline
description: Apply the minimum security baseline to AI-built apps and to what the scaffolder generates. Use whenever the work touches secrets, API keys, .env files, a database exposed to browsers, Supabase or row-level security, login, user data access, CORS, webhooks, uploads, pre-launch checks, or when someone asks "is this safe to launch", "audit my vibe-coded app", or "what do I check before deploy".
---

# Vibe-coding security baseline

The recurring disasters in AI-built apps are few and preventable: a database that answers anyone, secrets in code or in the browser, endpoints with no login check, and unverified webhooks. Check these first, then everything else.

## The seven checks
1. **Ownership on every table with user data.** Row-level security or an equivalent check in every query. Test it: request with no login returns nothing; user A asking for user B's record returns nothing.
2. **Secret keys server-side only.** The browser may hold only the public or publishable key. Search the built browser files for secret strings.
3. **`.gitignore` before the first secret**, a secret scanner as a pre-commit hook, and CI scanning. If a secret was ever committed, rotate it. Deletion does not un-leak it.
4. **Every API route checks the caller** and checks that the caller may touch that record.
5. **Validate all input** with a schema library before use. Never build SQL, HTML, or shell strings from user text.
6. **Verify webhooks** (signature) and make handlers safe to run twice.
7. **Rate limits** on login, signup, password reset, and expensive or AI-backed endpoints.

## Before launch
Run the access test again on production data shapes, confirm backups restore, set billing alerts, check security headers and HTTPS, scan dependencies, and confirm error pages show nothing sensitive.

## Reporting
List each check as pass, fail, or not applicable with evidence (the command or request and its result). Do not report "secure". Report what was tested and what was not. If a check cannot be run here, say so.

## Escalate
Regulated data (health, children, payments), multi-tenant products, and anything physical need a qualified reviewer. Say that plainly.
