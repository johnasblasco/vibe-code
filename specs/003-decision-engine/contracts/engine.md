# Decision Function

decide(kit: LoadedKit, answers: Environment, options?: {depth?: Depth; stage?: Stage})

Returns a synchronous decision snapshot. The caller loads YAML first. Default depth is standard;
omitting stage returns the entire depth selection for inspection. Passing stage restricts the
actionable schedule to that stage. A stop always empties that schedule. The snapshot retains
loaded safety questions and stop evidence, ready for later expert-brief generation.

Depth is quick, standard, or full. Stages follow specs/question-format.md. T4/T5 quick requests
are raised to standard. Counts describe the reference standard idea interview, including visible
router flags and distinguishing defaults by field presence. No answers/defaults are auto-accepted.

EngineError indicates malformed structural data, missing required documents, no matching tier,
unknown minimum tier/stage/depth, duplicate identifiers, invalid additions, or protected full_only
questions. Expression errors remain ExprError. No CLI exit-code or message contract is added.

This function computes named gate applicability; it does not grant gate passage or run checks.
It does not write state, execute on_answer action strings, or generate files.
