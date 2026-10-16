create table if not exists public.question_sets (
  set_id text primary key,
  name text not null,
  description text not null,
  difficulty_min text not null,
  difficulty_max text not null,
  themes jsonb not null default '[]'::jsonb,
  sort_order integer not null
);

create table if not exists public.questions (
  question_id text primary key,
  set_id text not null references public.question_sets (set_id),
  game_mode text not null,
  difficulty text not null,
  category text not null,
  prompt text not null,
  answer text not null,
  accepted_answers jsonb not null default '[]'::jsonb,
  choice_options jsonb,
  hints jsonb not null default '[]'::jsonb,
  explanation text not null,
  time_limit integer not null,
  points integer not null,
  content_status text not null,
  image_asset_ids jsonb not null default '[]'::jsonb,
  source_identities jsonb not null default '[]'::jsonb,
  asset_hashes jsonb not null default '[]'::jsonb,
  clues jsonb,
  forbidden_words jsonb
);

create table if not exists public.assets (
  asset_id text primary key,
  question_id text not null references public.questions (question_id),
  kind text not null,
  src text not null,
  alt text not null,
  source_identity text not null unique,
  source_url text not null,
  creator text not null,
  license text not null,
  license_url text not null default '',
  provenance text not null,
  attribution text not null,
  width integer not null,
  height integer not null,
  content_sha256 text not null,
  label text
);

alter table public.question_sets enable row level security;
alter table public.questions enable row level security;
alter table public.assets enable row level security;

create policy "public read question sets"
  on public.question_sets for select to anon, authenticated using (true);
create policy "public read questions"
  on public.questions for select to anon, authenticated using (content_status = 'published');
create policy "public read assets"
  on public.assets for select to anon, authenticated using (true);
