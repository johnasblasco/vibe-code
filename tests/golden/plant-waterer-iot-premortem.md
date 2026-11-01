# Pre-mortem: plant-waterer-iot

A beginner builds a battery-powered ESP32 plant waterer with a pump, sold in the EU and US, with several risky hardware choices.

50 failure modes apply. Top 12 by severity x likelihood:

| Rank | ID | Failure | S | L | Score | Prevented by | Status | Owner | Revisit when |
|---|---|---|---|---|---|---|---|---|---|
| 1 | SW-01 | Database answers anyone (row-level security off or missing) | 5 | 5 | 25 | q: sec.access_test, auth.roles, features.multi_tenant; card: access.own_data_only; skill: vibe-coding-security-baseline | open | | |
| 2 | SW-02 | Secret committed to git | 5 | 5 | 25 | q: sec.secrets, aic.no_secrets_in_prompts; card: git.init_ignore, git.secret_scanner; tpl: project/.gitignore.tmpl, project/.pre-commit-config.yaml.tmpl | open | | |
| 3 | HW-01 | Interrupted update bricks the device | 5 | 4 | 20 | q: hw.fw.bootloader, hw.fw.confirm_boot, hw.ops.update_testing… | open | | |
| 4 | HW-10 | Certification failure after tooling is committed | 5 | 4 | 20 | q: hw.plat.radio_approach, hw.reg.markets, hw.reg.radio… | open | | |
| 5 | HW-13 | AI invents pins, registers, or timings | 5 | 4 | 20 | q: hw.ver.hardware_facts; skill: hardware-facts, iot-hardware-intake; tpl: hardware/docs-hardware-README.md.tmpl | open | | |
| 6 | SW-03 | Secret key shipped to the browser | 5 | 4 | 20 | q: sec.secrets; card: env.config_secrets, access.own_data_only | open | | |
| 7 | SW-04 | API route with no login or ownership check | 5 | 4 | 20 | q: sec.threat_model, auth.roles, sec.access_test; card: access.own_data_only; skill: vibe-coding-security-baseline | open | | |
| 8 | SW-10 | Backup never restored | 5 | 4 | 20 | q: data.backups, run.restore_test, res.rpo_rto; card: db.backups | open | | |
| 9 | HW-03 | Update bigger than free flash | 4 | 4 | 16 | q: hw.plat.memory, hw.plat.mcu | open | | |
| 10 | HW-11 | Single-source part shortage or end of life | 4 | 4 | 16 | q: hw.mfg.bom, hw.mfg.lifecycle, hw.mfg.counterfeit | open | | |
| 11 | HW-21 | Prototype results do not carry over to the production board | 4 | 4 | 16 | q: hw.design.prototype_gap, hw.design.dfm_dft, hw.mfg.stages… | open | | |
| 12 | SW-22 | Building the wrong thing | 4 | 4 | 16 | q: val.riskiest_assumption, val.evidence, val.success_metric… | open | | |

**Status** starts as `open`. Each row needs an owner and a revisit trigger, or a written acceptance with a reason.

Evidence: 22 of 50 applicable entries cite a source; the rest are engineering practice not yet backed by a citation.
