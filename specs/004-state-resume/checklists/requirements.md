# Requirements Quality

- [x] All three states and their required metadata are explicit.
- [x] Saved progress is a cursor and cannot establish gate passage.
- [x] YAML is the source of bank version and question definitions.
- [x] Failure behavior preserves old files and avoids input/secret excerpts.
- [x] Resume preserves historical records and reports drift without silent migration.
- [x] Concurrent writers, filesystem races, and heuristic secret detection limits are stated.
