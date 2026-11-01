# Research findings (as of 2026-10-31)

Gathered by web search, mostly from secondary sources. Confirm against primary sources before shipping. Machine-readable versions are in `knowledge-packs/`.

## Hardware
- Cost of change rises sharply across EVT, DVT, and PVT. EVT shows the design works, DVT that it builds repeatably, PVT that the factory line is ready.
- Choices that decide FCC, CE, and battery test results are made in schematic, layout, and mechanical design. Retrofitting compliance after PVT is among the costliest mistakes.
- Lithium batteries add UN 38.3 transport testing plus cell or pack safety certification.
- Firmware updates need a bootloader that verifies and can roll back to a fallback partition. Provisioning commonly uses X.509 certificates or symmetric key injection.

## Regulation and standards
- EU CRA: reporting obligations from 2026-09-11 (24h / 72h / 14 days), full requirements 2027-12-11.
- EU RED cybersecurity delegated act applies after 2025-08-01; EN 18031 series harmonised January 2025.
- ETSI EN 303 645: 13 security plus 5 data-protection provisions, V3.1.3 (2024-09).
- US Cyber Trust Mark: voluntary; ioXt Alliance lead administrator since April 2026; rollout lead named 2026-10-28.
- EU AI Act: high-risk deferred to 2027-12-02 and 2028-08-02; Article 50 transparency stayed at 2026-08-02.
- Completeness checklists: ISO/IEC 25010:2023 (nine characteristics, Safety added), OWASP ASVS 5.0 (17 chapters, about 350 requirements), OWASP Top 10:2025, OWASP LLM Top 10 (2026) and Agentic Top 10, arc42 (12 sections), safety standards family (IEC 61508, ISO 26262, IEC 62304, DO-178C, EN 50128).

## Vibe-coding failures
- Missing row-level security is the most common serious flaw. One AI social network exposed about 1.5 million API tokens within days: its database key was in browser code and row-level security was off. Row-level security is off by default on tables created in SQL.
- AI-assisted commits leaked secrets about twice as often as the baseline (GitGuardian).
- A scan of 5,600 deployed vibe-coded apps found 2,000+ high-impact vulnerabilities, 400+ exposed secrets, and 175 cases of exposed personal data. A small study of 100 apps found 41% with exposed secrets and 21% with unauthenticated API endpoints (treat as a hint).
- A `.env` file pushed to a public repo stays exposed after deletion; rotate the secrets.

## Hosting
- Free database tiers cap something different each time and change often; pausing looks like an outage. Supabase free projects pause after 7 days of inactivity. Heroku free and ElephantSQL are gone; PlanetScale dropped its free tier in April 2024.
- Without a connection pooler, serverless apps exhaust Postgres connections quickly.
