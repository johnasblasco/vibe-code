# State Module

src/state/index.ts exposes:

- createState(kit): initial state using the YAML bank version and definition snapshots.
- setAnswer(state, kit, id, answer): validated immutable answer update, without I/O.
- saveState(path, state): validated atomic replacement of an existing valid state or new file.
- loadState(path): parse and revalidate stored JSON; generic StateError on failure.
- answerAndSave(path, state, kit, id, answer): update plus persistence, returning only after save.
- resume(state, kit): original state, validated expression environment, recomputed decision,
  pending questions/flags, new-question IDs, re-ask IDs, changed-pack IDs, bankChanged flag,
  and requiresGateVerification=true.

The parent directory must already exist; symlinks and unrelated existing target files are
rejected. Caller objects are unchanged. Only temporary files successfully created by the
operation are cleaned up. No shell command or persisted gate grant is part of this contract.
