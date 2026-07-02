-- Have Your Say suggestions extension
-- Additive migration. Run in Supabase SQL editor, then create/confirm storage policies.

create table if not exists public.suggestions (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  display_name text,
  email text,
  category text default 'General',
  message text not null,
  attachment_path text,
  attachment_url text,
  attachment_name text,
  attachment_type text,
  attachment_size bigint,
  admin_response text,
  admin_reaction text,
  admin_rating integer check (admin_rating between 1 and 5),
  admin_responder_id uuid references auth.users(id) on delete set null,
  admin_responded_at timestamptz,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

alter table public.suggestions
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists display_name text,
  add column if not exists email text,
  add column if not exists category text default 'General',
  add column if not exists message text,
  add column if not exists attachment_path text,
  add column if not exists attachment_url text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text,
  add column if not exists attachment_size bigint,
  add column if not exists admin_response text,
  add column if not exists admin_reaction text,
  add column if not exists admin_rating integer,
  add column if not exists admin_responder_id uuid references auth.users(id) on delete set null,
  add column if not exists admin_responded_at timestamptz,
  add column if not exists created_at timestamptz default timezone('utc', now()),
  add column if not exists updated_at timestamptz default timezone('utc', now());

do $$ begin
  alter table public.suggestions
    add constraint suggestions_admin_rating_range check (admin_rating between 1 and 5);
exception
  when duplicate_object then null;
end $$;

create index if not exists suggestions_user_id_idx on public.suggestions (user_id);
create index if not exists suggestions_created_at_idx on public.suggestions (created_at desc);
create index if not exists suggestions_category_idx on public.suggestions (category);

alter table public.suggestions enable row level security;

drop policy if exists "suggestions_insert_own" on public.suggestions;
create policy "suggestions_insert_own"
on public.suggestions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "suggestions_select_own_or_admin" on public.suggestions;
create policy "suggestions_select_own_or_admin"
on public.suggestions
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) = 'admin'
  )
);

drop policy if exists "suggestions_admin_update" on public.suggestions;
create policy "suggestions_admin_update"
on public.suggestions
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) = 'admin'
  )
);

insert into storage.buckets (id, name, public)
values ('suggestion-attachments', 'suggestion-attachments', false)
on conflict (id) do nothing;

drop policy if exists "suggestion_attachments_insert_own" on storage.objects;
create policy "suggestion_attachments_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'suggestion-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "suggestion_attachments_select_own_or_admin" on storage.objects;
create policy "suggestion_attachments_select_own_or_admin"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'suggestion-attachments'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) = 'admin'
    )
  )
);
