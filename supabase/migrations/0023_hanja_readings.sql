create table if not exists public.hanja_readings (
  hanja text primary key,
  meaning_ko text,
  sound_ko text,
  reading_ko text generated always as (
    nullif(trim(coalesce(meaning_ko, '') || ' ' || coalesce(sound_ko, '')), '')
  ) stored,
  radical text,
  strokes integer,
  source text,
  updated_at timestamptz not null default now(),
  check (char_length(hanja) = 1)
);

alter table public.hanja_readings enable row level security;

drop policy if exists "authenticated users read hanja readings" on public.hanja_readings;

create policy "authenticated users read hanja readings"
on public.hanja_readings for select
to authenticated
using (true);

grant select on table public.hanja_readings to authenticated;
grant select, insert, update, delete on table public.hanja_readings to service_role;
