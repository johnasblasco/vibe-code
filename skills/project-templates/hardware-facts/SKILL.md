---
name: hardware-facts
description: Source-of-truth rules for the hardware of {{project_name}}. Use whenever the work involves firmware, pins, registers, timings, sensors, actuators, power, radio, flashing, board bring-up, or any statement about what the hardware can do, even if the user does not mention a datasheet.
---

# Hardware facts for {{project_name}}

You cannot see the board. Everything you know about it comes from the files in `docs/hardware/`. Guessing a pin, register, voltage, or timing can damage hardware or create unsafe behavior.

## Decisions on record
- Board and MCU: {{mcu}}
- Firmware framework: {{firmware_framework}}
- Power: {{power_source}}
- Worst-case harm if it fails: {{worst_case_harm}}
- Safe state: {{safe_state}}

## Rules
1. Read `docs/hardware/` first (datasheets, pinout, errata, schematic notes). Cite the file and section for every pin, register, voltage, current, or timing you use.
2. If a fact is missing, stop and ask. Do not fill the gap from memory or from similar boards.
3. Keep a hardware safeguard for every hazard. Software is never the only protection against heat, motion, or electrical danger.
4. Never disable the watchdog, secure boot, signature checks, or debug locks to make something work. Ask first.
5. Updates must be signed, must keep a fallback image, and must not run on a low battery.
6. No default or shared credentials. Keys come from the provisioning process, never from source files.
7. Treat any change to power, radio, or actuator code as safety-relevant: say so, add a test or a hardware-in-the-loop step, and ask the user to confirm before flashing.
8. If worst-case harm is serious injury or death, stop and tell the user this needs a qualified safety engineer.

## Verify loop
Build, flash, read the serial output markers, and compare with the expected result. Report what you observed, not what you expect.
