// Restores a daily database backup (produced by
// src/app/api/cron/database-backup/route.ts) into a non-production Supabase
// project.
//
// SAFE BY DEFAULT: without --confirm this prints a dry-run report only.
//
// HARD SAFETY GUARD: this script refuses to run if the target database URL
// appears to point at the known production project. There is no override.
//
// After a --confirm restore, this script automatically applies the
// production-mirrored RLS policies from
// database/migrations/restore_test_apply_production_rls.sql. This is not a
// manual follow-up step — every restore leaves the six restore-test tables
// with RLS enabled and policies matching production.
//
// Required env for restore writes:
//   RESTORE_TARGET_DATABASE_URL
//
// Required env for R2 sources:
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
//   R2_ENDPOINT is reused when present.
//
// Usage:
//   npx tsx scripts/restore-backup.mts latest
//   npx tsx scripts/restore-backup.mts r2:daily/2026-07-18.json
//   npx tsx scripts/restore-backup.mts ./backups/2026-07-18.json
//   npx tsx scripts/restore-backup.mts latest --confirm
//
// The machine running --confirm needs the psql CLI available on PATH.

import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import process from "node:process"
import { getR2Config, r2GetText, r2List } from "../src/lib/r2"

const PRODUCTION_PROJECT_REF = "enoyrbdflwihxzitpour"
const EXPECTED_RESTORE_PROJECT_HINT = "aiform-procure-restore-test"
const BACKUP_PREFIX = "daily/"
const RLS_SQL_PATH = path.resolve(process.cwd(), "database/migrations/restore_test_apply_production_rls.sql")
const CORE_TABLES = [
  "profiles",
  "supplier_documents",
  "rfqs",
  "quotes",
  "supplier_bank_details",
  "subscriptions",
] as const
const EXCLUDED_TABLES = ["session_events", "email_alerts", "supplier_reminder_log", "suggestions"] as const
const OTP_FIELDS = ["otp_code", "otp_expires_at", "otp_attempts"] as const

type CoreTable = (typeof CORE_TABLES)[number]

type Backup = {
  generated_at: string
  source_project: string
  tables: Partial<Record<CoreTable, Record<string, unknown>[]>>
  row_counts: Partial<Record<CoreTable, number>>
}

function loadLocalEnv() {
  for (const file of [".env.local", ".env"]) {
    const envPath = path.resolve(process.cwd(), file)
    if (!fs.existsSync(envPath)) continue

    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const separatorIndex = trimmed.indexOf("=")
      if (separatorIndex === -1) continue
      const key = trimmed.slice(0, separatorIndex).trim()
      const rawValue = trimmed.slice(separatorIndex + 1).trim()
      if (!key || process.env[key] != null) continue
      process.env[key] = rawValue.replace(/^['"]|['"]$/g, "")
    }
  }
}

loadLocalEnv()

async function loadBackup(source: string): Promise<{ backup: Backup; describedFrom: string }> {
  if (source === "latest" || source.startsWith("r2:")) {
    const r2Config = getR2Config()
    if (!r2Config) {
      throw new Error(
        "R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET.",
      )
    }

    let key: string
    if (source === "latest") {
      const objects = await r2List(r2Config, BACKUP_PREFIX)
      if (objects.length === 0) throw new Error(`No backups found under ${BACKUP_PREFIX} in bucket ${r2Config.bucket}.`)
      objects.sort((a, b) => b.key.localeCompare(a.key))
      key = objects[0].key
    } else {
      key = source.slice("r2:".length)
    }

    const text = await r2GetText(r2Config, key)
    return { backup: JSON.parse(text) as Backup, describedFrom: `r2://${r2Config.bucket}/${key}` }
  }

  const filePath = path.resolve(process.cwd(), source)
  const text = fs.readFileSync(filePath, "utf8")
  return { backup: JSON.parse(text) as Backup, describedFrom: filePath }
}

function resolveTargetDatabaseUrl(): string {
  const url = process.env.RESTORE_TARGET_DATABASE_URL
  if (!url) {
    throw new Error(
      "Set RESTORE_TARGET_DATABASE_URL to the Postgres connection string for the aiform-procure-restore-test Supabase project.",
    )
  }

  if (url.includes(PRODUCTION_PROJECT_REF)) {
    throw new Error(`Refusing to run: target database URL contains the production project ref ${PRODUCTION_PROJECT_REF}.`)
  }

  if (process.env.POSTGRES_URL && url === process.env.POSTGRES_URL) {
    throw new Error("Refusing to run: RESTORE_TARGET_DATABASE_URL is identical to POSTGRES_URL.")
  }

  if (process.env.DATABASE_URL && url === process.env.DATABASE_URL) {
    throw new Error("Refusing to run: RESTORE_TARGET_DATABASE_URL is identical to DATABASE_URL.")
  }

  return url
}

function validateBackup(backup: Backup) {
  if (!backup || typeof backup !== "object" || !backup.tables) throw new Error("Backup JSON is missing a tables object.")

  const includedTables = Object.keys(backup.tables)
  const unexpected = includedTables.filter((table) => !CORE_TABLES.includes(table as CoreTable))
  if (unexpected.length > 0) throw new Error(`Backup contains unexpected table(s): ${unexpected.join(", ")}`)

  const forbidden = EXCLUDED_TABLES.filter((table) => includedTables.includes(table))
  if (forbidden.length > 0) throw new Error(`Backup contains explicitly excluded table(s): ${forbidden.join(", ")}`)

  // Backups are expected to already have OTP fields nulled out (see
  // scrubProfile in src/app/api/cron/database-backup/route.ts). This refuses
  // to restore rather than silently re-scrubbing, so a backup that somehow
  // carries a live OTP secret can't slip into the restore-test project.
  const profiles = backup.tables.profiles ?? []
  for (const [index, profile] of profiles.entries()) {
    for (const field of OTP_FIELDS) {
      if (profile[field] !== null && profile[field] !== undefined) {
        throw new Error(`Refusing to restore: profiles row ${index} contains non-null ${field}.`)
      }
    }
  }
}

function countRows(backup: Backup): Record<CoreTable, number> {
  return Object.fromEntries(CORE_TABLES.map((table) => [table, backup.tables[table]?.length ?? 0])) as Record<
    CoreTable,
    number
  >
}

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

function buildRestoreSql(backupPath: string): string {
  const escapedBackupPath = backupPath.replace(/\\/g, "/").replace(/'/g, "''")
  const tableValues = CORE_TABLES.map((table, index) => `(${index + 1}, '${table}')`).join(",\n      ")

  return `
\\set ON_ERROR_STOP on

begin;

create temp table restore_backup_payload (payload jsonb not null) on commit drop;
create temp table restore_results (
  table_name text not null,
  row_index integer not null,
  row_id text,
  restored boolean not null,
  error text
) on commit drop;

-- Use CSV, not COPY's default text format. Text mode interprets backslash
-- sequences before type parsing, so JSON.stringify's valid \\n can become a
-- literal newline before jsonb sees it, corrupting supplier descriptions with
-- real line breaks. CSV only treats quotes specially, leaving JSON escapes
-- intact; do not switch back without re-solving that escaping layer.
\\copy restore_backup_payload(payload) from '${escapedBackupPath}' with (format csv, quote '"', escape '"');

do $restore$
declare
  table_order record;
  row_record record;
  column_list text;
  update_list text;
  row_id text;
  payload jsonb;
begin
  select restore_backup_payload.payload into payload from restore_backup_payload limit 1;

  create temp table restore_table_order(ord integer, table_name text) on commit drop;
  insert into restore_table_order(ord, table_name)
  values
      ${tableValues};

    if (payload ? 'tables') is false then
    raise exception 'Backup payload does not contain a tables object.';
  end if;

  for table_order in select * from restore_table_order order by ord loop
    if to_regclass('public.' || table_order.table_name) is null then
      raise exception 'Target table public.% does not exist.', table_order.table_name;
    end if;

    if jsonb_array_length(coalesce(payload->'tables'->table_order.table_name, '[]'::jsonb)) = 0 then
      continue;
    end if;

    select string_agg(format('%I', c.column_name), ', ' order by c.ordinal_position)
      into column_list
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = table_order.table_name
      and exists (
        select 1
        from jsonb_array_elements(coalesce(payload->'tables'->table_order.table_name, '[]'::jsonb)) backup_rows(row_data)
        cross join lateral jsonb_object_keys(backup_rows.row_data) backup_keys(column_name)
        where backup_keys.column_name = c.column_name
      );

    select string_agg(format('%1$I = excluded.%1$I', c.column_name), ', ' order by c.ordinal_position)
      into update_list
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = table_order.table_name
      and c.column_name <> 'id'
      and exists (
        select 1
        from jsonb_array_elements(coalesce(payload->'tables'->table_order.table_name, '[]'::jsonb)) backup_rows(row_data)
        cross join lateral jsonb_object_keys(backup_rows.row_data) backup_keys(column_name)
        where backup_keys.column_name = c.column_name
      );

    if column_list is null then
      raise exception 'No columns found for public.%', table_order.table_name;
    end if;

    for row_record in
      select value as row_data, ordinality::integer as row_index
      from jsonb_array_elements(coalesce(payload->'tables'->table_order.table_name, '[]'::jsonb)) with ordinality
    loop
      row_id := row_record.row_data->>'id';

      begin
        if table_order.table_name = 'profiles' then
          insert into auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
          )
          values (
            '00000000-0000-0000-0000-000000000000',
            (row_record.row_data->>'id')::uuid,
            'authenticated',
            'authenticated',
            coalesce(nullif(row_record.row_data->>'email', ''), (row_record.row_data->>'id') || '@restore-test.local'),
            now(),
            '{"provider":"email","providers":["email"],"restore_test_stub":true}'::jsonb,
            '{}'::jsonb,
            now(),
            now()
          )
          on conflict (id) do nothing;
        end if;

        execute format(
          'insert into public.%1$I (%2$s) overriding system value select %2$s from jsonb_populate_record(null::public.%1$I, $1) on conflict (id) do update set %3$s',
          table_order.table_name,
          column_list,
          coalesce(update_list, 'id = excluded.id')
        )
        using row_record.row_data;

        insert into restore_results(table_name, row_index, row_id, restored, error)
        values (table_order.table_name, row_record.row_index, row_id, true, null);
      exception when others then
        insert into restore_results(table_name, row_index, row_id, restored, error)
        values (table_order.table_name, row_record.row_index, row_id, false, sqlerrm);
      end;
    end loop;
  end loop;
end
$restore$;

select table_name, count(*) filter (where restored) as restored, count(*) filter (where not restored) as failed
from restore_results
group by table_name
order by array_position(array[${CORE_TABLES.map(sqlLiteral).join(", ")}], table_name);

select table_name, row_index, row_id, error
from restore_results
where not restored
order by table_name, row_index
limit 200;

do $restore_failures$
begin
  if exists (select 1 from restore_results where not restored) then
    raise exception 'Restore failed: one or more rows could not be restored. See failed row output above.';
  end if;
end
$restore_failures$;

commit;
`
}

function runRlsSetup(databaseUrl: string) {
  if (!fs.existsSync(RLS_SQL_PATH)) {
    throw new Error(`RLS setup script not found at ${RLS_SQL_PATH}`)
  }

  const result = spawnSync("psql", [databaseUrl, "-f", RLS_SQL_PATH], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  })

  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`psql exited with status ${result.status} while applying RLS setup`)
}

function runPsql(databaseUrl: string, backup: Backup) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aiform-restore-"))
  const backupCsvPath = path.join(tmpDir, "backup.csv")
  const sqlPath = path.join(tmpDir, "restore.sql")

  try {
    const backupJson = JSON.stringify(backup)
    const backupCsv = `"${backupJson.replace(/"/g, '""')}"\n`
    fs.writeFileSync(backupCsvPath, backupCsv, "utf8")
    fs.writeFileSync(sqlPath, buildRestoreSql(backupCsvPath), "utf8")

    const result = spawnSync("psql", [databaseUrl, "-f", sqlPath], {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    })

    if (result.stdout) process.stdout.write(result.stdout)
    if (result.stderr) process.stderr.write(result.stderr)
    if (result.error) throw result.error
    if (result.status !== 0) throw new Error(`psql exited with status ${result.status}`)
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

async function main() {
  const args = process.argv.slice(2)
  const confirm = args.includes("--confirm")
  const source = args.find((arg) => arg !== "--confirm")

  if (!source) {
    console.error("Usage: npx tsx scripts/restore-backup.mts <latest|r2:daily/YYYY-MM-DD.json|local-file-path> [--confirm]")
    process.exit(1)
  }

  const { backup, describedFrom } = await loadBackup(source)
  validateBackup(backup)
  const rowCounts = countRows(backup)

  console.log("Restore source:", describedFrom)
  console.log("Backup generated_at:", backup.generated_at)
  console.log("Backup source_project:", backup.source_project)
  console.log("Expected restore project:", EXPECTED_RESTORE_PROJECT_HINT)
  console.log("")
  console.log("Row counts in backup:")
  for (const table of CORE_TABLES) console.log(`  ${table}: ${rowCounts[table]}`)

  if (!confirm) {
    console.log("")
    console.log("Dry run only: nothing was written. Re-run with --confirm to restore into RESTORE_TARGET_DATABASE_URL.")
    return
  }

  const databaseUrl = resolveTargetDatabaseUrl()
  console.log("")
  console.log("Restoring into RESTORE_TARGET_DATABASE_URL ...")
  runPsql(databaseUrl, backup)

  console.log("")
  console.log("Applying production-mirrored RLS policies ...")
  runRlsSetup(databaseUrl)
}

main().catch((error) => {
  console.error("Restore failed:", error instanceof Error ? error.message : error)
  process.exit(1)
})
