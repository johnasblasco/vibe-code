# Sources and observed failure, checked 2026-11-02

The connected GitHub repository is johnasblasco/vibe-code (public; default branch main).
The latest completed [CI run](https://github.com/johnasblasco/vibe-code/actions/runs/41324651348)
failed on all three operating systems. Linux/macOS pre-mortem references reported missing
Python yaml. Windows's same comparisons returned a null subprocess status; source inspection
shows the interpreter fixed to an absent .venv/Scripts/python.exe. macOS state-backed tests
reported Unable to save state. Inspection links this to intentionally refused symlinked
temporary ancestors; configure canonical runner paths while preserving that refusal.

Resolved directly through each official repository's releases/latest and git/ref/tags APIs:

| Action | Release | Commit |
|---|---|---|
| actions/checkout | v7.0.1 | 3d3c42e5aac5ba805825da76410c181273ba90b1 |
| actions/setup-node | v7.1.0 | 949feb2413d6458794dcd2491c4babbbce0c15c1 |
| actions/setup-python | v7.1.0 | 6d4fd22b20465ccc0f7354476588e8df7c9ca0e0 |

These are existing approved pins; no action or dependency version change was needed.

- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/): hosted GitHub OIDC,
  npm >=11.5.1/Node >=22.14.0, package trust fields and explicit direct-publish permission.
  The configuration's first successful publish must occur within two days; otherwise recreate it.
- [npm provenance](https://docs.npmjs.com/generating-provenance-statements/): repository metadata
  must match the public source repository. Provenance establishes origin, not benign behavior.
- [Reusable workflows](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows):
  workflow_call and same-repository reuse.
- [Publishing Node packages](https://docs.github.com/en/actions/tutorials/publish-packages/publish-nodejs-packages):
  the release published event and explicit public scoped access.

Registry metadata lookup was unavailable through the browsing tool. Existing publication and
the next available version have not been inferred from repository state.
