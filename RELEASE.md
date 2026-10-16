# Release report

Checked on 2026-10-16 in `D:\tech_scramble`.

## Content

`node scripts/build-content.mjs` wrote 196 published questions and 116 assets.

| Set | Term | Real or AI? | Taboo |
| --- | --- | --- | --- |
| Tech Foundations | 16 | 10 | 16 |
| Code Breakers | 16 | 8 | 16 |
| AI & Future Tech | 16 | 6 | 16 |
| Cyber & Cloud | 16 | 6 | 16 |
| Ultimate Tech Mix | 16 | 6 | 16 |

`pnpm exec vitest run` — 12 tests passed (11 engine, 1 content). The content test requires `validateBank` to return zero errors. That run did.

The recommended 20 questions per mode (300 total) was not reached. Term and taboo stop at 16 per set. Real or AI stops where a verified photograph or a 2026-10-16 xAI Imagine file exists. Incomplete image rounds are blocked in the lobby; with the current files every set can start.

AI & Future Tech and Cyber & Cloud image rounds cover medium and hard. Their expert questions are in the term and taboo rounds. The validator treats a missing declared image difficulty as a warning, not an error.

One Commons download of a still-life painting was rejected and replaced with a market photograph by PattayaPatrol (CC BY-SA 4.0). The server-cabinet photograph has no artist name in the Commons metadata, so the credit is "Unknown photographer" and the file page is the source.

## Build and browser

`pnpm run build` (`tsc -b && vite build`) completed. Client bundle: `dist/assets/index-w95x-n2k.js` (464.22 kB, gzip 121.93 kB). `pnpm exec oxlint src` reported 0 errors.

`node scripts/smoke.mjs` played Tech Foundations from the lobby through all three rounds to the results screen at 1280×800 and at 390×844. Both runs printed `SMOKE_OK It's a tie` (both teams scored 0 on the forced wrong answer, Real guess, and skip). Before that play, the same script confirmed Start is enabled for all five sets. The dev server is http://127.0.0.1:5173/

## Supabase

The server `supabase` was added for project `ijagkgcacrsnsqnofpba`. This session's tool list still does not include that MCP server, so the tables were not created from here.

`supabase projects api-keys --project-ref ijagkgcacrsnsqnofpba` returned HTTP 403: the logged-in CLI account does not have access to that project. No service-role or anon key was available, and none was invented.

The schema is in `supabase/migrations/20261016000000_techverse.sql`. `scripts/seed-supabase.mjs` upserts the shipped bank once a service-role key is provided. The app reads `question_sets`, `questions`, and `assets` when `.env.local` has the anon key, and otherwise uses the shipped bank.

No production deployment was run. There is no hosted URL to smoke-test.
