create table if not exists public.dictionary_ai_cache (
  term text primary key,
  dictionary_form text not null,
  reading text not null,
  meanings_ko text[] not null default '{}',
  parts_of_speech text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.line_translation_cache (
  source_text text primary key,
  translation_ko text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dictionary_ai_cache enable row level security;
alter table public.line_translation_cache enable row level security;

grant select, insert, update, delete on table public.dictionary_ai_cache to service_role;
grant select, insert, update, delete on table public.line_translation_cache to service_role;

create index if not exists dictionary_ai_cache_updated_idx
on public.dictionary_ai_cache (updated_at desc);

create index if not exists line_translation_cache_updated_idx
on public.line_translation_cache (updated_at desc);
