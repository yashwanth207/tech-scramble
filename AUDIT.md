# V0 audit

The workspace `D:\tech_scramble` was empty. There was no git repository, no routes, no question data, no Supabase schema, and no deployment to preserve. The x.ai device-code URL is not a repository and was not used.

TechVerse V1 is a new Vite + React + TypeScript app in this folder. The game rules live in `src/engine` and are covered by unit tests. Question text, puzzle icons, and image records live outside the components.

## What V0 did not have

- No playable rounds, scoring, timers, or team rotation.
- No question sets.
- No image manifest or provenance.
- No tests or production build.

## What V1 adds

- Five selectable sets, each with Guess the Tech Term, Real or AI?, and Tech Taboo.
- Progressive difficulty inside the set's range, with no jump forward when a bucket is empty.
- Session duplicate checks on question id, image hash, and source identity.
- Hint penalty, speed bonus, taboo penalty with a 500ms double-click guard, skip limits, pause, and rematch.
- Original puzzle SVGs, Wikimedia photographs, and xAI Imagine images dated 2026-10-16. Generated images had the corner mark cropped, and the explanation says so.
