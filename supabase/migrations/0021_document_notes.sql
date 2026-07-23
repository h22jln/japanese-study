create table if not exists public.document_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  line_index integer not null,
  selected_text text not null,
  note_text text not null,
  start_offset integer,
  end_offset integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.document_notes enable row level security;

drop policy if exists "users manage own document notes" on public.document_notes;

create policy "users manage own document notes" on public.document_notes for all
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.documents d
    where d.id = document_id
      and d.user_id = (select auth.uid())
  )
);

grant select, insert, update, delete on table public.document_notes to authenticated;
grant select, insert, update, delete on table public.document_notes to service_role;

create index if not exists document_notes_document_idx
on public.document_notes (document_id, line_index, created_at);

create index if not exists document_notes_user_updated_idx
on public.document_notes (user_id, updated_at desc);
