alter table public.review_cards
add column if not exists confusion_count integer not null default 0,
add column if not exists last_confused_at timestamptz;

create index if not exists review_cards_user_confusion_idx
on public.review_cards (user_id, confusion_count desc, last_confused_at desc nulls last);
