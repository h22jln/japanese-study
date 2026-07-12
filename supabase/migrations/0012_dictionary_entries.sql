create table public.dictionary_entries (
  id uuid primary key default gen_random_uuid(),
  entry_sequence bigint not null unique,
  primary_spelling text,
  primary_reading text not null,
  spellings text[] not null default '{}',
  readings text[] not null default '{}',
  glosses text[] not null default '{}',
  parts_of_speech text[] not null default '{}',
  is_common boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.dictionary_terms (
  id bigint generated always as identity primary key,
  entry_id uuid not null references public.dictionary_entries(id) on delete cascade,
  term text not null,
  term_type text not null check (term_type in ('kanji', 'reading')),
  unique (entry_id, term)
);

alter table public.dictionary_entries enable row level security;
alter table public.dictionary_terms enable row level security;

create policy "authenticated users read dictionary entries"
on public.dictionary_entries for select
using ((select auth.uid()) is not null);

create policy "authenticated users read dictionary terms"
on public.dictionary_terms for select
using ((select auth.uid()) is not null);

grant select on table public.dictionary_entries to authenticated;
grant select on table public.dictionary_terms to authenticated;
grant select, insert, update, delete on table public.dictionary_entries to service_role;
grant select, insert, update, delete on table public.dictionary_terms to service_role;
grant usage, select on sequence public.dictionary_terms_id_seq to service_role;

create index dictionary_entries_common_idx on public.dictionary_entries (is_common);
create index dictionary_terms_term_idx on public.dictionary_terms (term);
