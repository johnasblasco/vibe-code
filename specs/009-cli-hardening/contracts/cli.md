# CLI and Maintainer Contracts

Every existing command verifies the installed runtime assets before doing work. Integrity
failure returns EXIT.ERROR (1) with a generic diagnostic, without printing content/local paths.
There is no command-line bypass and no automatic inventory regeneration.

node tools/update-integrity.mjs compares source assets with integrity/assets.json and exits
nonzero for changes. --write is the only accepted mutation flag and updates the inventory
after displaying changed paths. This is a maintainer operation, never invoked by the CLI.
It makes no downloads, installs, commits or signatures. Review git diff of actual facts and
templates before using it; do not run it just to suppress a failing integrity check.

No update, stuck, AI, telemetry or hook-install commands are added. Existing doctor capability
consent, dry-run, gate statuses and exit codes remain unchanged. Direct raw parser APIs do not
claim verified content and are not the CLI startup path.
