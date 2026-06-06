create table if not exists supplier_matches (
  id bigint generated always as identity primary key,

  supplier_id uuid,
  rfq_id bigint,

  match_score numeric,
  industry_score numeric,
  province_score numeric,
  compliance_score numeric,
  smartscore_score numeric,
  activity_score numeric,

  match_level text,

  created_at timestamptz default timezone('utc', now())
);

alter table supplier_matches enable row level security;

drop policy if exists "Read supplier matches" on supplier_matches;
create policy "Read supplier matches"
on supplier_matches
for select
using (true);

drop policy if exists "Insert supplier matches" on supplier_matches;
create policy "Insert supplier matches"
on supplier_matches
for insert
with check (true);

create index if not exists supplier_matches_supplier_id_idx
on supplier_matches (supplier_id);

create index if not exists supplier_matches_rfq_id_idx
on supplier_matches (rfq_id);

create index if not exists supplier_matches_score_idx
on supplier_matches (match_score desc);
