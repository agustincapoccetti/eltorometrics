# Architecture rules

- Extend the existing availability tables additively for surveys; interpret empty question lists as legacy single-question polls so older responses remain readable.
- Share survey validation and aggregation in `src/lib/surveys.ts`, with database validation for response shape and closed surveys; client and database must reject invalid answers.
- Survey improvement analysis uses coach-designated answer options rather than guessing whether an arbitrary answer is positive or negative.