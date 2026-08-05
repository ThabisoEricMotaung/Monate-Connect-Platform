# public_supplier_directory Drop Checkpoint - 2026-08-05

Purpose: record the view's exact shape immediately before
`supabase/migrations/20260805090000_drop_public_supplier_directory_view.sql`
runs, in case it ever needs to be recreated. No full database backup was
taken for this change — dropping a view touches no table data, and
`public.profiles` itself is untouched.

## Pre-drop dry-run

```
$ supabase db push --linked --dry-run
Would push these migrations:
 • 20260805090000_drop_public_supplier_directory_view.sql
```

Only the one expected migration was pending; nothing else queued.

## Dependency check (why a plain DROP VIEW, no CASCADE, is safe)

```sql
select classid::regclass as dependent_type, objid, deptype
from pg_depend
where refobjid = 'public.public_supplier_directory'::regclass
  and refclassid = 'pg_class'::regclass;
```

Result: only the view's own internal `pg_type` (row type) and `pg_rewrite`
(`_RETURN` rule) entries, both `deptype = 'i'` (internal). No other object
in the database references this view.

## View definition at time of drop

```sql
SELECT id,
    business_name,
    province,
    provinces,
    industry,
    bbbee_level,
    cidb_grade,
    smart_score,
    website,
    description,
    employee_count,
    linkedin_url,
    founded_year,
    created_at
FROM profiles
WHERE role = 'supplier'::text AND lower(verification_status) = 'verified'::text;
```

## Grants at time of drop

| grantee | privileges |
| --- | --- |
| anon | TRIGGER, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES |
| authenticated | INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER |
| postgres | TRIGGER, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES |
| service_role | INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER |

(INSERT/UPDATE/DELETE/TRUNCATE were inert on this view — no `INSTEAD OF`
triggers were ever defined — but are recorded here for completeness.)

## Why this is safe to drop

See investigation notes in
`supabase/migrations/20260805090000_drop_public_supplier_directory_view.sql`:
superseded 2026-07-08 by an RLS policy directly on `profiles` plus an
application-level column allowlist, unreferenced anywhere in `src/` since,
and flagged by `supabase db advisors` as an ERROR-level
`security_definer_view` finding.

## To recreate, if ever needed

```sql
create view public.public_supplier_directory as
select
  id, business_name, province, provinces, industry, bbbee_level,
  cidb_grade, smart_score, website, description, employee_count,
  linkedin_url, founded_year, created_at
from public.profiles
where role = 'supplier' and lower(verification_status) = 'verified';

grant all on public.public_supplier_directory to anon, authenticated, service_role;
```
