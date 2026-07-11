import { createClient } from '@supabase/supabase-js'

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const envFiles = ['.env.local', '.env']
for (const file of envFiles) {
  const envPath = path.resolve(process.cwd(), file)
  if (!fs.existsSync(envPath)) continue
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) continue
    const key = trimmed.slice(0, separatorIndex).trim()
    const rawValue = trimmed.slice(separatorIndex + 1).trim()
    if (!key || process.env[key] != null) continue
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '')
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function main() {
  const { data: rowSample, error: rowError } = await supabase
    .from('messages')
    .select('id, deleted_by_sender, deleted_by_receiver')
    .limit(5)

  if (rowError) {
    console.error('Error querying messages table:', rowError)
    process.exit(1)
  }

  console.log('sample rows:', rowSample)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
