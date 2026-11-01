# Plan

Use the installed @clack/prompts 1.8.1 intro/outro/log/selection components and Node styleText.
Store artwork, copy and next steps in beginner-course/interview-ui.yaml; section grouping in
interview-flow.yaml. Small presentation helpers choose a fitting banner, wrap help, and label
values without altering answer values. Optional port start/finish methods let Commander
open/close sessions without putting terminal calls into the decision engine.

Regression tests first: fresh/resumed welcome, narrow banner/YAML source, question sections,
privacy notice/masking, readable defaults with provenance, completion/cancellation and actual
CLI lifecycle. Existing Clack mock gains the new log.step method; no old assertions change.
Extend SW-32 to capture visual clutter and add the presentation scenario. Review source diffs
before refreshing asset integrity. Run full checks, release packing, and a real PTY interview.

Official API checked 2026-11-01: https://bomb.sh/docs/clack/packages/prompts/
Installed declarations and core settings implementation also inspected. No dependency changes.
