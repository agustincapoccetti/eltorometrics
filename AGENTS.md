# Architecture rules

- Extend the existing availability tables additively for surveys; interpret empty question lists as legacy single-question polls so older responses remain readable.
- Share survey validation and aggregation in `src/lib/surveys.ts`, with database validation for response shape and closed surveys; client and database must reject invalid answers.
- Survey improvement analysis uses coach-designated answer options rather than guessing whether an arbitrary answer is positive or negative.
- Keep gym recording in a reusable GymRecords component backed by existing gym_observations rows; group history through shared pure helpers so athlete edits preserve coach visibility and existing records.
- Shared club reads require database-assigned athlete/coach roles; schedule configuration is coach-only, reserved physio slots are visible only to the reserving athlete and coaches, and private file reads require ownership, coach privileges, or a visible published resource reference to avoid blanket access.