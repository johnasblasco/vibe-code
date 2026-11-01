# Skills research (as of 2026-10-31)

Agent Skills is an open format created by Anthropic (late 2025) and since adopted by OpenAI, Cursor, GitHub Copilot, and others. A skill is a folder with a `SKILL.md` (name and description in YAML frontmatter, instructions below) that the agent loads when a task matches. Install with `npx skills add owner/repo` or copy the folder into `.claude/skills/`.

Your organisation's own skill catalog returned nothing relevant at research time. Everything below is public.

## Worth considering
| Purpose | Skill | Notes |
|---|---|---|
| Process | obra/superpowers: brainstorming, writing-plans, test-driven-development, systematic-debugging, verification-before-completion, requesting-code-review, subagent-driven-development | Encodes a disciplined plan-test-verify loop. |
| CLI building | mblode `scaffold-cli` | Scaffolds a TypeScript ESM CLI with commander, @clack/prompts, vitest, biome, changesets, GitHub Actions, and an agent skill. Matches this project's stack. |
| CLI building | Commander + clack skill (agents-inc) | Wizard state machines, config hierarchies, exit codes, Ctrl+C handling. |
| CLI building | alexanderchan `cli` | Stack choice, confirmations and dry-run, distribution. |
| Authoring skills | anthropics/skills `skill-creator` | Draft, test, and tune your own skills. |
| MCP | anthropics/skills `mcp-builder` | Only if you expose the scaffolder to agents as an MCP server (`coverage`, `next`). |
| Web UI | anthropics/skills `frontend-design`, `webapp-testing` | Only if you build a dashboard or docs site. |
| Security | Trail of Bits: `static-analysis` (CodeQL, Semgrep, SARIF), `insecure-defaults`, `supply-chain-risk-auditor`, `differential-review` | Run on your own CLI, which executes commands and writes files. |
| Threat modelling | `openai-security-threat-model` (listed in Trail of Bits' curated repo) | Repository-grounded threat models. |
| Hardware | edesto-dev | Generates a SKILLS.md teaching the agent compile, flash, and validate loops for Arduino, PlatformIO, ESP-IDF, Zephyr; includes datasheet guidance. |
| Hardware | Community `embedded-systems`, `embedded-iot` | Small installs. Treat as drafts to review. |

## Cautions
- Trail of Bits reports published skills have been found with backdoors and malicious hooks, and the ecosystem has no built-in quality gate.
- Directory blurbs can be wrong (one index described mcp-builder as a Minecraft add-on generator). Read the actual SKILL.md.
- Install counts show popularity, not safety.
- Rules: prefer official or known repositories, read the SKILL.md and any scripts or hooks before installing, pin a commit, install per project not globally.

## Starter kit for month one
superpowers (brainstorming, writing-plans, TDD, systematic-debugging), `scaffold-cli`, the Commander/clack skill, `skill-creator`, Trail of Bits `static-analysis` and `supply-chain-risk-auditor`. Add hardware skills when H modules start.

## Skills this kit provides itself
See `skills/` and the README.
