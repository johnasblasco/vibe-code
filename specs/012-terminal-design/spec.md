# Feature: Modern terminal interview

The masked-input and privacy-notice requirements below were subsequently replaced by the
user's [direct interview request](../014-direct-project-interview/spec.md).

Requested: a Vibecode banner on init and a friendlier, modern series of questions.

- A fresh interactive interview opens with a cyan YAML wordmark/banner and a short welcome.
  Resuming uses a compact welcome. Narrow terminals use the small wordmark.
- Honor Clack's ACCESSIBLE setting rather than globally forcing accessible mode. Respect
  Node/Clack color detection and NO_COLOR; no new color or banner package.
- Use section headings and session question numbers, not a misleading fixed total for a
  branching interview. Retried prompts keep their number. Content/help remain in YAML.
- Replace repeated explanation/privacy boxes with concise wrapped help and one privacy notice.
  Keep free-text and metadata masked, state choices, explicit defaults review, reasons/dates,
  contradiction details, cancellation/persistence, safety stops and exit codes.
- Review uses friendly values (Yes/No and option labels); completed sessions show actionable
  next commands. Cancelled/blocked/stopped sessions never display a success screen.
- Help and noninteractive commands do not launch the welcome screen or create interview state.
- Preserve the nine scenarios, question IDs, budgets and original safety assertions. No installs,
  commits or automatic publication. Validate a real terminal in addition to adapter tests.
