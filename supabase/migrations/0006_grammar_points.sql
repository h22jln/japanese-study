create table public.grammar_points (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  pattern text not null,
  meaning_ko text not null,
  explanation_ko text not null,
  example_ja text,
  example_ko text,
  created_at timestamptz not null default now()
);

alter table public.grammar_points enable row level security;

create policy "users manage own grammar points"
on public.grammar_points for all
using (exists (
  select 1 from public.documents d
  where d.id = document_id and d.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.documents d
  where d.id = document_id and d.user_id = (select auth.uid())
));

grant select, insert, update, delete on table public.grammar_points to authenticated;
create index grammar_points_document_idx on public.grammar_points (document_id);
