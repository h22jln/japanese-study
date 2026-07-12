alter table public.review_cards
add column if not exists saved_at timestamptz not null default now();

create index if not exists review_cards_user_saved_idx
on public.review_cards (user_id, saved_at desc);
