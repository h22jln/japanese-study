alter table public.profiles
add column username text;

create unique index profiles_username_unique_idx
on public.profiles (lower(username))
where username is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  requested_username text := lower(new.raw_user_meta_data ->> 'username');
begin
  if requested_username is null or requested_username !~ '^[a-z0-9_]{4,20}$' then
    raise exception 'invalid username';
  end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, requested_username, requested_username);
  return new;
end;
$$;
