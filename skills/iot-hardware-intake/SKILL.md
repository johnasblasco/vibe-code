---
name: iot-hardware-intake
description: Run or extend the hardware, IoT, embedded, or device intake (modules H1 to H12), including gates, certification and regulatory questions, firmware, OTA updates, provisioning, manufacturing, and safety. Use whenever the project involves a microcontroller, ESP32, sensors, actuators, batteries, radios, Bluetooth, Wi-Fi, LoRa, Matter, a connected product, a prototype going to production, FCC or CE, EVT/DVT/PVT, or "can I vibe code a device".
---

# IoT and hardware intake

Hardware decisions are expensive to reverse once boards, tooling, and certification are committed. Ask the questions in the order that protects the user from irreversible mistakes, and do not let software questions run ahead of the gates.

## Order
1. Router flags (`question-bank/00-router.yaml`): physical, radio, battery, mains, actuator, harm possible, markets.
2. H1 physical context, H2 platform, H3 connectivity, H6 security basics, H7 safety, H8 regulatory. These are gated by `before-hardware-design-freeze`. The radio approach (pre-certified module versus chip-down) and the target markets change cost and schedule the most.
3. H4 firmware, H5 cloud and fleet, H10 verification.
4. H9 manufacturing (gate `before-production`), H11 operations and end of life, H12 companion app.

## Hard rules
- Never invent register addresses, pin numbers, timings, or part numbers. Facts come from `docs/hardware/` in the project (datasheets, pinout, errata). If a fact is not there, ask or say it is missing.
- If worst-case harm is serious injury or death, load `extensions/safety-critical.yaml`, stop a beginner from continuing alone, and produce a brief for a qualified safety engineer.
- Require a hardware safeguard for any hazard that software failure could cause (thermal cutoff, fuse, mechanical stop). Software alone is not a safeguard.
- Debug ports locked or removed in production, no shared default credentials, signed updates with rollback, a vulnerability contact, and a stated support period.
- Never claim certification, compliance, or approval. Produce questions, flags, and a brief for an accredited lab or advisor.

## Reference
`references/gates-and-regulatory.md` lists the gates, what each blocks, and the current regulatory landscape with dates. Check `knowledge-packs/` for the verified dates before quoting any deadline, and re-verify fast movers.

## Contradictions to catch
Coin cell with always-on cellular; long life with no room for a second firmware image; custom antenna with a "pre-certified module" claim; open debug ports with a long support promise; a battery product with no shipping plan.
