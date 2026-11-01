# Vibecode

Vibecode interviews beginners about a project, records their decisions, guides setup checks,
and generates project configuration and instructions for coding agents.

This release supports the idea interview and beginner course stages 0–2. It generates
configuration and guidance; it does not implement application features or deploy a project.
It does not certify security, safety or regulatory compliance.

## Requirements and installation

Requires Node.js >=26.13.0 and <27. The package is @johnasblasco/vibecode; its command is vibecode.
After this version has been published:

```sh
npm install --global @johnasblasco/vibecode@0.1.0 --ignore-scripts
```

On Windows PowerShell, use npm.cmd if npm is blocked by execution policy. Use vibecode.cmd
if PowerShell blocks the executable's PowerShell shim.

## Use it in your project folder

```sh
vibecode --help
vibecode init
vibecode next
vibecode doctor --dry-run
vibecode doctor
vibecode next --course
vibecode generate
vibecode generate --write
```

Answers save to .scaffolder/state.json. Ctrl+C preserves accepted answers; next resumes.
Never enter credentials or private keys. Generation previews first and requires typed consent
before writing. It never overwrites existing files or installs packages/hooks automatically.
Use an empty project folder for an initial trial. Some files require additional concrete answers.

Doctor reports missing or unverified prerequisites as blocked. Later stages require current
manual confirmation, an explicitly approved isolated scanner probe, or a designated nonproduction
preview with consent. Never give it a production URL. The generated scanner configuration alone
does not prove that a scanner is installed or working.

## Data and limitations

Questions, rules, teaching and facts ship as YAML. The CLI verifies their reviewed checksums
before commands and refuses unexpected modifications. Updates to installed assets must come
from a reviewed release; editing installed files invalidates the inventory.

Generation normally consults official version/hash metadata and records its sources and dates.
--offline uses dated pack values only while valid; stale/invalid pins stop generation. The
tool needs further primary-source reviews for some regulatory/lifecycle facts and testing with
beginners. Check the displayed evidence and involve qualified experts where indicated.

Exit codes: 0 success, 1 error, 2 usage error, 3 blocked, 4 safety stop, 130 cancellation.

## License

MIT. Copyright (c) 2026 johnasblasco. See LICENSE.

This release bundles its eight locked runtime dependencies. Their MIT/ISC license texts
remain in their respective node_modules package folders. release-lock.json records the
production versions, original registry URLs and integrity values. It is an audit record;
the bundled files supply the runtime dependencies without a registry fetch.
