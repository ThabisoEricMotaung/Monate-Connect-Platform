begin;

create schema if not exists private;

create or replace function private.guard_registration_state_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      if new.registration_status is distinct from 'draft'
        or new.registration_completed_at is not null
        or new.terms_accepted_at is not null
        or new.intended_role is not null then
        raise exception 'Registration state can only be changed by the registration service.'
          using errcode = '42501';
      end if;
    elsif new.registration_status is distinct from old.registration_status
      or new.registration_completed_at is distinct from old.registration_completed_at
      or new.terms_accepted_at is distinct from old.terms_accepted_at
      or new.intended_role is distinct from old.intended_role then
      raise exception 'Registration state can only be changed by the registration service.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.guard_registration_state_write() from public;
revoke all on function private.guard_registration_state_write() from anon;
revoke all on function private.guard_registration_state_write() from authenticated;

drop trigger if exists profiles_guard_registration_state_insert on public.profiles;
create trigger profiles_guard_registration_state_insert
  before insert on public.profiles
  for each row execute function private.guard_registration_state_write();

drop trigger if exists profiles_guard_registration_state_update on public.profiles;
create trigger profiles_guard_registration_state_update
  before update of registration_status, registration_completed_at, terms_accepted_at, intended_role
  on public.profiles
  for each row execute function private.guard_registration_state_write();

commit;;
