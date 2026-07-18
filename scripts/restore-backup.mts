// Restores a daily database backup (produced by
// src/app/api/cron/database-backup/route.ts) into a Supabase project.
//
// SAFE BY DEFAULT: with no --confirm flag this only prints a dry-run report
// (which tables/rows are in the backup, and which project it would write
// to). Nothing is written until you re-run with --confirm.
//
// HARD SAFETY GUARD: this script refuses to run at all if the resolved
// target project matches the known production project ref, or matches the
// app's own NEXT_PUBLIC_SUPABASE_URL. There is no flag to override this —
// if you genuinely need to touch production, use the Supabase dashboard
// directly, not this script.
//
// The target project is read from RESTORE_TARGET_SUPABASE_URL and
// RESTORE_TARGET_SUPABASE_SERVICE_ROLE_KEY — deliberately different env var
// names from the ones the app itself uses, so a copy-paste mistake in
// .env.local can't silently point this at production.
//
// Usage (from the project root, on your own machine — needs
// RESTORE_TARGET_SUPABASE_URL / RESTORE_TARGET_SUPABASE_SERVICE_ROLE_KEY and
// the R2_* vars in .env.local):
//   npx tsx scripts/restore-backup.mts latest                # dry run, most recent R2 backup
//   npx tsx scripts/restore-backup.mts r2:daily/2026-07-18.json
//   npx tsx scripts/restore-backup.mts ./backups/2026-07-18.json   # a local file instead of R2
//   npx tsx scripts/restore-backup.mts latest --confirm       # actually writes

import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { createClient } from "@supabase/supabase-js"
import { getR2Config, r2GetText, r2List } from "../src/lib/r2"

const PRODUCTION_PROJECT_REF = "enoyrbdflwihxzitpour"
const BACKUP_PREFIX = "daily/"
const UPSERT_CHUNK_SIZE = 500

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

type Backup = {
  generated_at: string
  source_project: string
  tables: Record<string, Record<string, unknown>[]>
  row_counts: Record<string, number>
}

async function loadBackup(source: string): Promise<{ backup: Backup; describedFrom: string }> {
  if (source === "latest" || source.startsWith("r2:")) {
    const r2Config = getR2Config()
    if (!r2Config) {
      throw new Error(
        "R2 is not configured (missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET in .env.local).",
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

function resolveTarget(): { url: string; serviceRoleKey: string } {
  const url = process.env.RESTORE_TARGET_SUPABASE_URL
  const serviceRoleKey = process.env.RESTORE_TARGET_SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Set RESTORE_TARGET_SUPABASE_URL and RESTORE_TARGET_SUPABASE_SERVICE_ROLE_KEY in .env.local to the TEST project you want to restore into. These must be different from NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.",
    )
  }

  if (url.includes(PRODUCTION_PROJECT_REF)) {
    throw new Error(
      `Refusing to run: RESTORE_TARGET_SUPABASE_URL points at the production project (${PRODUCTION_PROJECT_REF}). This script only ever restores into a non-production project.`,
    )
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && url === process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error(
      "Refusing to run: RESTORE_TARGET_SUPABASE_URL is identical to NEXT_PUBLIC_SUPABASE_URL (the app's own production database). This script only ever restores into a different, non-production project.",
    )
  }

  return { url, serviceRoleKey }
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
  const target = resolveTarget()

  console.log("Restore source:", describedFrom)
  console.log("Backup generated_at:", backup.generated_at)
  console.log("Restore target:", target.url)
  console.log("")
  console.log("Row counts in backup:")
  for (const [table, count] of Object.entries(backup.row_counts)) {
    console.log(`  ${table}: ${count}`)
  }

  if (!confirm) {
    console.log("")
    console.log("Dry run only — nothing was written. Re-run with --confirm to actually restore into the target above.")
    return
  }

  console.log("")
  console.log(`Restoring into ${target.url} ...`)

  const client = createClient(target.url, target.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const summary: Record<string, { restored: number; errors: number }> = {}

  for (const [table, rows] of Object.entries(backup.tables)) {
    summary[table] = { restored: 0, errors: 0 }
    if (rows.length === 0) continue

    for (let i = 0; i < rows.length; i += UPSERT_CHUNK_SIZE) {
      const chunk = rows.slice(i, i + UPSERT_CHUNK_SIZE)
      const { error } = await client.from(table).upsert(chunk, { onConflict: "id" })
      if (error) {
        summary[table].errors += chunk.length
        console.error(`  ${table}: chunk starting at row ${i} failed: ${error.message}`)
      } else {
        summary[table].restored += chunk.length
      }
    }
  }

  console.log("")
  console.log("Restore summary:")
  for (const [table, { restored, errors }] of Object.entries(summary)) {
    console.log(`  ${table}: ${restored} restored, ${errors} failed`)
  }
}

main().catch((error) => {
  console.error("Restore failed:", error instanceof Error ? error.message : error)
  process.exit(1)
})
