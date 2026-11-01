# File Generation Research and Decisions

Verified: 2026-11-01. No packages installed.

## Official pins

The generation pack records these browser-verified values; runtime lookup independently
resolves them or visibly uses a dated pack when the network is unavailable:

| Item | Pin | Official source |
|---|---|---|
| Node LTS line | 26.13.0 | https://nodejs.org/dist/index.json |
| checkout v7.0.1 | 3d3c42e5aac5ba805825da76410c181273ba90b1 | https://github.com/actions/checkout/commit/3d3c42e5aac5ba805825da76410c181273ba90b1 |
| setup-node v7.1.0 | 949feb2413d6458794dcd2491c4babbbce0c15c1 | https://github.com/actions/setup-node/commit/949feb2413d6458794dcd2491c4babbbce0c15c1 |
| gitleaks v8.30.1 | 83d9cd684c87d95d656c1458ef04895a7f1cbd8e | https://github.com/gitleaks/gitleaks/commit/83d9cd684c87d95d656c1458ef04895a7f1cbd8e |
| PostgreSQL image | 18.6 | https://raw.githubusercontent.com/docker-library/official-images/master/library/postgres |
| Redis image | 8.10.3 | https://raw.githubusercontent.com/docker-library/official-images/master/library/redis |

Image publication manifests and Docker Hub agree. Older Redis versions.json endpoints showed
older values, so they are not the generation source. The canonical Docker Official Images
publication manifest, linked by https://hub.docker.com/_/redis, establishes published image
tags. No claim is made that the older JSON is current. The Redis template is retained rather
than choosing a different product; generated provenance points to its licence review page.

The PostgreSQL image docs at https://hub.docker.com/_/postgres specify a changed mount target
for 18+. The template now mounts /var/lib/postgresql and uses a command argument array for
pg_isready. Prerelease image tags, including 19rc1, are excluded. Pre-commit accepts revision
pins: https://pre-commit.com/#pre-commit-configyaml---repos . No pre-commit install is run.

## Resolver policy

Decision: only canonical Node, Docker Official Images, and the three declared GitHub repositories
are queried. No answers, contacts, local paths, credentials, or auth environment variables are
sent. Requests reject redirects, have a timeout/size cap, and support cancellation. Annotated
tags are peeled with a depth/cycle limit, then the commit is verified in the requested repo.
Malformed metadata never becomes a pack fallback. Unavailable networking may use an explicitly
dated, non-stale pin and must show that provenance. Floating defaults are rejected.

Decision: source-controlled YAML defines all template IDs/paths/applicability and resolver
copy. Markdown body text is escaped; skill frontmatter is parsed and serialized as YAML.
Configuration substitutions are constrained and parsed. GitHub expressions remain untouched.
Missing concrete bound questions are requested and accepted values are saved one at a time.

Decision: preview is the default. --write needs a terminal and typed generate confirmation.
All destinations are preflighted, every complete file is privately staged, then published
exclusively. Existing edits are never overwritten. A partial IO batch is reported honestly,
and earlier published files are preserved. Stronger filesystem race protection is later work.

## Failure evidence

Missing modules/commands failed before implementation. Hidden-file discovery in a new test
needed a recursive scan so dotfiles were actually included. Pre-aborted lookups initially made
a request; the new cancellation contract now stops before IO and never becomes a fallback.
The low-level network entry point initially lacked its own allowlist (the resolver already
checked sources); its direct-call regression now rejects before fetch. AI-01 records that
prevention and tests/security-scenarios/lookup-integrity.yaml contains the regression inputs.
