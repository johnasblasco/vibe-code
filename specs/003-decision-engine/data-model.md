# Data Model

ScheduledQuestion: question ID, source file, module ID, stage, original question/module data,
and whether required_when currently evaluates true. Absence of required_when is not an
instruction to hide or skip the question.

AppliedEntry: original YAML record plus ID. AppliedRule also exposes its severity unchanged.

Decision snapshot: tier, ordered loaded files/modules, all question IDs, named gates, three
depth lists, effective depth, questions grouped by stage, visible router flags, applicable
failure modes, contradictions, stop rules, stop flag, actionable schedule, and idea counts.

Input environment and LoadedKit remain unchanged. Results preserve data records rather than
copying their content into source. There is no persisted entity or state transition in this task.
