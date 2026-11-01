# Generation CLI Contract

generate [--state <file>] [--project <existing-directory>] [--file <id> ...]
         [--offline] [--contact <reporting-email-or-HTTPS-URL>] [--dry-run | --write]

Default: preview all applicable manifest outputs, with a generation record. --file selects
specific applicable IDs; the generation record remains included. --offline makes no lookup
requests and labels valid dated pins as pack fallback. No floating or stale values are written.
--dry-run is explicit preview; --write conflicts with --dry-run and requires a terminal.

Missing concrete bound questions are requested only in a terminal, using their source YAML.
Each accepted answer is saved before the next prompt. A contact is requested separately when
needed. Missing noninteractive inputs fail with known IDs rather than guesses. Deferred or
not-applicable answers remain recorded but cannot complete a file. Ctrl+C returns 130.

Before writing: render every value, validate all paths/destinations, show the contents and
provenance, and require exact typed generate confirmation. Cancellation/decline at that screen
writes no project files. Once publication starts, complete per-file operations are awaited.
Existing files are never replaced. If IO fails mid-batch, report the completed relative paths.

No package/hook/container/project command is installed or executed. Names/answers are never
joined into shell command strings. No production system or authenticated lookup is used.
