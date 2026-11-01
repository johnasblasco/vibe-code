# Question format (question-bank/v1)

Every file in `question-bank/` is YAML. The CLI loads modules by tier and flag (see `00-router.yaml`).

## Bank metadata

`question-bank/manifest.yaml` contains exactly `schema: question-bank/v1` and a semantic
`bank_version`. It contains no flags or modules and is loaded as metadata rather than a router
addition. The initial version is `1.0.0`. State files retain their originating bank version and
definition snapshots so resume can report changes without silently accepting them.

## Question fields

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Unique, dotted, stable. Never rename; add a new id and retire the old one. |
| `ask` | yes | The question, in plain words. |
| `type` | yes | `text`, `number`, `boolean`, `single_select`, `multi_select`, `rank_priorities`. |
| `options` | for selects | Machine-friendly values. The CLI shows friendly labels. |
| `option_labels` | no | Mapping from option values to friendly display labels; stored values remain unchanged. |
| `default` | no | The "pick for me" value. Must be one of `options` (or `pick_for_me` / `auto_detect`). |
| `why` | no | One or two plain sentences for beginners: why this matters, what happens if skipped. |
| `covers` | yes | Tags from `knowledge-packs/standards-coverage-backbone.yaml`. This is how gaps are detected. |
| `required_when` | no | Expression over router flags and earlier answers. |
| `gate` | no | A named gate this question blocks (set on the module or the question). |
| `on_answer` | no | Actions triggered by an answer, such as loading a pack or raising a flag. |
| `states_allowed` | no | Overrides the default three states. Safety gates may disallow `not_applicable`. |
| `ask_when` | no | (router flags) Only ask when this expression is true. Example: radio, battery, mains, and actuator are only asked when `physical` is true. |

## Answer states (never skip silently)

1. `answered`: a value.
2. `deferred`: needs `owner` and `revisit_when` (an event or date). Becomes a tracked risk in `docs/decisions/`.
3. `not_applicable`: needs a `reason`.

## Gates

| Gate | Blocks |
|---|---|
| `before-hardware-design-freeze` | Schematic and layout freeze (radio approach, power, safety, markets, security basics). |
| `before-production` | Tooling and first production order. |
| `before-launch` | Public release (all hardware and software checks pass or are consciously deferred). |

## Modules

Files hold `modules:`, each with `module`, `stage` (required), optional `phase`, `tier_min`, `load_when`, `gate`, `beginner_policy`, and `questions`.

## Stages (ask when it matters)
Asking everything up front overwhelms beginners. Every module has a `stage`; the CLI asks a module's questions when the project reaches that stage:
`idea` (before any code), `plan` (before building), `design` (hardware, before design freeze), `build`, `production` (hardware, before first order), `prelaunch`, `operate`.
Budgets enforced by the scenario tests: at the idea stage a software project asks at most 50 questions and at most 32 need real thought (the rest have recommended defaults to accept or edit in one review screen).

## Depth
`question-bank/depth-profiles.yaml` defines `quick` (a short list), `standard` (everything except `full_only`), and `full`. Protected questions (gates, `required_when`, safety, beginner-ops, IoT security, CRA, RED) can never be `full_only`. T4 and T5 projects never run at `quick`.

## Bindings
Answers become generated files through `outputs/bindings.yaml`. Every `{{placeholder}}` in a template must be bound, and every bound question must exist.

## Contradiction rules
Written in `rules/contradictions.yaml` (severity info, warn, block, stop). Examples: coin-cell battery with always-on cellular; a 10-year life target without storage for a second firmware copy; a pre-certified module claim with a custom antenna; `left_open_for_now` debug ports with a stated support period.
