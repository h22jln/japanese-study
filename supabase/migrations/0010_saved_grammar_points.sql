create table public.saved_grammar_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  grammar_point_id uuid not null references public.grammar_points(id) on delete cascade,
  saved_at timestamptz not null default now(),
  unique (user_id, grammar_point_id)
);

alter table public.saved_grammar_points enable row level security;

create policy "users manage own saved grammar points"
on public.saved_grammar_points for all
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.grammar_points gp
    join public.documents d on d.id = gp.document_id
    where gp.id = grammar_point_id
    and d.user_id = (select auth.uid())
  )
);

grant select, insert, update, delete on table public.saved_grammar_points to authenticated;
grant select, insert, update, delete on table public.saved_grammar_points to service_role;

create index saved_grammar_points_user_saved_idx
on public.saved_grammar_points (user_id, saved_at desc);
