# Plan: npm Release Package

Existing Node/TypeScript/ESM and installed compiler/npm. No new dependencies. Root package
name/version/license become @johnasblasco/vibecode/0.1.0/MIT with matching lock metadata.
Keep private:true and no root bin to preserve the existing workspace publication guard.

tools/create-release.mjs compiles a fresh stage under .tooling-build/releases, validates the
complete runtime asset inventory, writes a small public manifest with vibecode bin mapping,
production-only npm shrinkwrap, README/LICENSE and verified asset snapshots. npm pack runs
offline with ignored scripts and a workspace cache. Its file list is validated before a
hash receipt is emitted. No stage cleanup or registry operation is automatic.

tests/tooling/release.node.test.mjs exercises metadata, inventory refusal and the actual
compiler/pack command. CI runs it with existing fully pinned actions. Add a shebang to the
existing CLI entry and a user-approved MIT LICENSE. docs/09-npm-release.md records operation,
actual evidence and release prerequisites. All existing expectations and budgets remain.

Trust: this packs a trusted checkout; checksums do not authenticate a compromised manifest,
compiler or npm installation. Public registry lookup is currently blocked by the environment.
Do not install the artifact or publish without the required approval.
