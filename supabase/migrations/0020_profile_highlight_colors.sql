alter table public.profiles
add column if not exists analysis_highlight_color text not null default 'honey',
add column if not exists lookup_highlight_color text not null default 'mint';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_analysis_highlight_color_check'
  ) then
    alter table public.profiles
    add constraint profiles_analysis_highlight_color_check
    check (analysis_highlight_color in ('honey', 'peach', 'lavender', 'sage', 'mint', 'sky', 'rose'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_lookup_highlight_color_check'
  ) then
    alter table public.profiles
    add constraint profiles_lookup_highlight_color_check
    check (lookup_highlight_color in ('honey', 'peach', 'lavender', 'sage', 'mint', 'sky', 'rose'));
  end if;
end $$;
