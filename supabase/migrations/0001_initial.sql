create extension if not exists pgcrypto;

create type public.document_status as enum ('queued', 'processing', 'completed', 'failed');

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  file_path text not null,
  status public.document_status not null default 'queued',
  summary_ko text,
  error_message text,
  created_at timestamptz not null default now()
);

create table public.vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dictionary_form text not null,
  reading text not null,
  meaning_ko text not null,
  part_of_speech text,
  jlpt_level text,
  created_at timestamptz not null default now(),
  unique (user_id, dictionary_form, reading)
);

create table public.document_vocabulary (
  document_id uuid not null references public.documents(id) on delete cascade,
  vocabulary_id uuid not null references public.vocabulary(id) on delete cascade,
  surface_form text,
  example_ja text,
  example_ko text,
  source_page integer,
  primary key (document_id, vocabulary_id)
);

create table public.review_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vocabulary_id uuid not null references public.vocabulary(id) on delete cascade,
  next_review_at timestamptz not null default now(),
  interval_days integer not null default 0,
  ease_factor numeric(4,2) not null default 2.50,
  correct_count integer not null default 0,
  incorrect_count integer not null default 0,
  unique (user_id, vocabulary_id)
);

alter table public.documents enable row level security;
alter table public.vocabulary enable row level security;
alter table public.document_vocabulary enable row level security;
alter table public.review_cards enable row level security;

create policy "users manage own documents" on public.documents for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "users manage own vocabulary" on public.vocabulary for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "users manage own review cards" on public.review_cards for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "users manage vocabulary links" on public.document_vocabulary for all
using (exists (select 1 from public.documents d where d.id = document_id and d.user_id = (select auth.uid())))
with check (exists (select 1 from public.documents d where d.id = document_id and d.user_id = (select auth.uid())));

create index documents_user_created_idx on public.documents (user_id, created_at desc);
create index review_cards_user_due_idx on public.review_cards (user_id, next_review_at);

-- Supabase Dashboard에서 private bucket `documents`를 만든 뒤
-- 파일 경로는 `{user_id}/{document_id}.pdf` 형식으로 저장하세요.
