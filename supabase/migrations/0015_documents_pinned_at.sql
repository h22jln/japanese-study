alter table public.documents
add column pinned_at timestamptz;

create index documents_user_pinned_idx
on public.documents (user_id, pinned_at desc nulls last, created_at desc);
