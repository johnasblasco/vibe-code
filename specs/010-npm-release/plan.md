# Plan: npm Release Package

Existing Node/TypeScript/ESM and installed compiler/npm. No new dependencies. Root package
name/version/license become @johnasblasco/vibecode/0.1.0/MIT with matching lock metadata.
Keep private:true and no root bin to preserve the existing workspace publication guard.

tools/create-release.mjs compiles a fresh stage under .tooling-build/releases, validates the
complete runtime asset inventory, writes a small public manifest with vibecode bin mapping,
production-only release-lock.json, README/LICENSE and verified asset snapshots. Copy the
eight installed locked runtime packages with licenses, verify their metadata against the
lock, and use bundleDependencies for npm 12 compatibility. npm pack runs
offline with ignored scripts and a workspace cache. Its file list is validated before a
hash receipt, including bundled file SHA-256 values, is emitted. No stage cleanup or registry
operation is automatic. Packing supports npm's legacy array and current keyed JSON output.

tests/tooling/release.node.test.mjs exercises metadata, inventory refusal and the actual
compiler/pack command. CI runs it with existing fully pinned actions. Add a shebang to the
existing CLI entry and a user-approved MIT LICENSE. docs/09-npm-release.md records operation,
actual evidence and release prerequisites. All existing expectations and budgets remain.

Trust: this packs a trusted checkout; checksums do not authenticate a compromised manifest,
compiler or npm installation. Public registry lookup is currently blocked by the environment.
Do not install the artifact without the required approval. Publication and the dependency
bundling contract change are explicitly authorized in the conversation. Registry operations
remain subject to environment access and authenticated account checks.
