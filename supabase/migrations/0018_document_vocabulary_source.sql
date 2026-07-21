alter table public.document_vocabulary
add column if not exists source text not null default 'analysis';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'document_vocabulary_source_check'
  ) then
    alter table public.document_vocabulary
    add constraint document_vocabulary_source_check
    check (source in ('analysis', 'user_lookup'));
  end if;
end $$;

create index if not exists document_vocabulary_source_idx
on public.document_vocabulary (document_id, source);
