# TechVerse

A local three-round technology party game: Guess the Tech Term, Real or AI?, and Tech Taboo.

The question bank ships with the app. If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set, the lobby loads `question_sets`, `questions`, and `assets` from Supabase and falls back to the shipped bank when that read fails validation.

## Run locally

```bash
pnpm install
pnpm content
pnpm dev
```

Open http://127.0.0.1:5173/

## Checks

```bash
pnpm test
pnpm run build
pnpm exec oxlint src
```

`pnpm content` rebuilds `src/content/generated/bank.json`, the puzzle SVGs, and the asset records from `content/` and `src/content/generated/photo-provenance.json`.

## Supabase

The schema is `supabase/migrations/20261016000000_techverse.sql`. After the tables exist, seed them with a service-role key (do not put that key in the client):

```bash
SUPABASE_URL=https://ijagkgcacrsnsqnofpba.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-supabase.mjs
```

Copy `.env.example` to `.env.local` and set the anon key so the app reads those tables.
