# Data Model

Inventory: exact keys schema=asset-integrity/v1, algorithm=sha256-text-lf, files=mapping.
Each files key is a portable contained path under one of the fixed runtime asset roots;
each value is 64 lowercase hexadecimal characters. Duplicate keys and incomplete inventories
are invalid. Files are UTF-8 text, with CRLF normalized to LF before hashing/use.

Verified snapshot: read-only path-to-text mapping from the validated inventory, scoped to
one invocation. YAML is parsed from these bytes and template rendering uses the same bytes.
It is not a new state-file claim and cannot grant a gate pass.

Threat evidence: original threat text, implementation references, executable regression
references, observed outcome, and residual limitation/status. All 11 rows must be present.
