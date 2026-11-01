# Interview Data

Proposal: question ID and original question data, concrete recommended value, provenance source,
explanation, and verification date when supplied by a profile. Proposals are not saved answers.

InterviewPort: ask, review, report, invalid, and optional cancellation-status functions.
The core uses a distinct CANCELLED symbol that never enters state. It accepts an awaited save
callback; caller state is unchanged and the latest accepted state is returned on cancellation.

Result: state plus completed, blocked, stop, or cancelled status. Blocked and stop statuses
come from current YAML contradictions/stop rules. No gate passage is inferred.
