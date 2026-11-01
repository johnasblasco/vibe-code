# Core Contract

interview(kit, initialState, port, save) asynchronously returns the resulting state and status.
The state must be at idea stage. Before asking a new bank question, add its definition snapshot
and persist the cursor. Accepted values pass through state validation before awaiting save.
Invalid values produce a generic event and retry; values are not printed in core errors.

Router ask_when and module load_when are recomputed after each save. Existing unchanged answered,
deferred, and not-applicable records are not re-asked. Current profile/default proposals are
shown together. Selected proposals are saved individually; unselected ones require explicit edits.
If edits change applicability, only currently pending questions remain in the action queue.

The core makes no terminal or process calls. The Clack adapter and Commander exit-code contract
remain pending package approval and implementation; no terminal Ctrl+C guarantee is claimed yet.
