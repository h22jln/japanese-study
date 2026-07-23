create table if not exists public.document_kanji (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  kanji text not null,
  readings text[] not null default '{}',
  meaning_ko text not null,
  radical text,
  mnemonic_ko text not null,
  example_words jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, kanji)
);

alter table public.document_kanji enable row level security;

drop policy if exists "users manage own document kanji" on public.document_kanji;

create policy "users manage own document kanji" on public.document_kanji for all
using (
  exists (
    select 1
    from public.documents d
    where d.id = document_id
      and d.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.documents d
    where d.id = document_id
      and d.user_id = (select auth.uid())
  )
);

grant select, insert, update, delete on table public.document_kanji to authenticated;
grant select, insert, update, delete on table public.document_kanji to service_role;

create index if not exists document_kanji_document_idx
on public.document_kanji (document_id, kanji);
