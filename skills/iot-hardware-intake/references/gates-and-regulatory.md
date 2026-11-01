# Gates and regulatory landscape

Dates as verified on 2026-10-31 from secondary sources. See `knowledge-packs/` for the maintained versions and confirm on primary sources.

## Gates
| Gate | Blocks | Must be answered |
|---|---|---|
| before-hardware-design-freeze | Schematic and PCB layout freeze | environment, platform and radio approach, power budget, connectivity, security basics, safety, markets and regulatory path |
| before-production | Tooling and first production order | EVT/DVT/PVT plan, contract manufacturer, second sources, factory provisioning of keys, end-of-line tests, battery shipping |
| before-launch | Public release | update path tested, vulnerability contact live, support period stated, reporting process owner named, certification evidence in hand or consciously deferred |

## Landscape
- **EU CRA**: reporting obligations from 2026-09-11 (24h, 72h, 14 days); full requirements 2027-12-11. Needs a product category decision, an SBOM habit, a vulnerability process, and a support period.
- **EU RED cybersecurity**: applies after 2025-08-01 for radio equipment; EN 18031 series is the usual route.
- **ETSI EN 303 645**: 13 security and 5 data-protection provisions for consumer IoT; a common baseline for design reviews.
- **US**: FCC rules for radio devices; the voluntary Cyber Trust Mark is still rolling out.
- **Batteries**: lithium needs UN 38.3 transport tests plus cell or pack safety approvals.
- **Product safety, EMC, substances (RoHS, REACH, WEEE)**: depend on markets and product type.
- **Sector rules**: medical (IEC 62304 and device regulation), automotive (ISO 26262), industrial (IEC 61508), aviation (DO-178C), rail (EN 50128) share a pattern: hazards, classification, process evidence. Stop and escalate.

## Build stages
EVT proves the design works, DVT proves it builds repeatably, PVT proves the line is ready. Certification choices belong in schematic and layout, not after PVT.
