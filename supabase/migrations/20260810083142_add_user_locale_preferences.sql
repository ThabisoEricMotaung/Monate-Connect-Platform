create table if not exists public.user_locale_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  preferred_locale text not null default 'en'
    check (preferred_locale in ('en', 'zu', 'af')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_locale_preferences is
  'Private per-user locale preference. Active Phase 1 locales are English, isiZulu, and Afrikaans.';

alter table public.user_locale_preferences enable row level security;

revoke all on public.user_locale_preferences from anon;
grant select, insert, update on public.user_locale_preferences to authenticated;

drop policy if exists locale_preferences_select_own on public.user_locale_preferences;
create policy locale_preferences_select_own
on public.user_locale_preferences for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists locale_preferences_insert_own on public.user_locale_preferences;
create policy locale_preferences_insert_own
on public.user_locale_preferences for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists locale_preferences_update_own on public.user_locale_preferences;
create policy locale_preferences_update_own
on public.user_locale_preferences for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
