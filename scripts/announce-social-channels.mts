import nextEnv from "@next/env"
import { createClient } from "@supabase/supabase-js"

nextEnv.loadEnvConfig(process.cwd())

const EXPECTED_PRODUCTION_PROJECT_REF = "enoyrbdflwihxzitpour"
const EXPECTED_RECIPIENT_COUNT = 7
const CAMPAIGN = {
  type: "Platform Update",
  title: "AiForm Procure channel update",
  message:
    "AiForm Procure now has LinkedIn, Facebook, and Substack channels — find them on our About page.",
  link: "/about",
} as const

const apply = process.argv.includes("--apply")
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
}

const projectRef = new URL(supabaseUrl).hostname.split(".")[0]
if (projectRef !== EXPECTED_PRODUCTION_PROJECT_REF) {
  throw new Error(
    `Refusing to run against project ${projectRef}; expected production project ${EXPECTED_PRODUCTION_PROJECT_REF}`
  )
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const { data: recipientData, error: recipientError } = await admin
  .from("profiles")
  .select(
    "id, role, email, first_name, full_name, preferred_name, business_name, verification_status, is_opportunities_curator"
  )
  .in("role", ["supplier", "buyer"])
  .eq("is_deleted", false)
  .is("deleted_at", null)
  .not("email", "is", null)
  .not("email", "ilike", "%@deleted.local")
  .order("role")
  .order("id")

if (recipientError) {
  throw new Error(`Could not load announcement recipients: ${recipientError.message}`)
}

const recipients = recipientData ?? []
if (recipients.length !== EXPECTED_RECIPIENT_COUNT) {
  throw new Error(
    `Recipient safety check failed: found ${recipients.length}, expected ${EXPECTED_RECIPIENT_COUNT}`
  )
}

const recipientIds = recipients.map((recipient) => recipient.id)
const { data: existingData, error: existingError } = await admin
  .from("notifications")
  .select("id, user_id")
  .eq("type", CAMPAIGN.type)
  .eq("title", CAMPAIGN.title)
  .eq("message", CAMPAIGN.message)
  .eq("link", CAMPAIGN.link)
  .in("user_id", recipientIds)

if (existingError) {
  throw new Error(`Could not check existing campaign notifications: ${existingError.message}`)
}

const existingRecipientIds = new Set((existingData ?? []).map((notification) => notification.user_id))
const missingRecipients = recipients.filter(
  (recipient) => !existingRecipientIds.has(recipient.id)
)

let inserted: Array<{
  id: number
  user_id: string
  type: string
  title: string
  message: string
  link: string | null
  is_read: boolean | null
  created_at: string | null
}> = []

if (apply && missingRecipients.length > 0) {
  const { data, error } = await admin
    .from("notifications")
    .insert(
      missingRecipients.map((recipient) => ({
        user_id: recipient.id,
        type: CAMPAIGN.type,
        title: CAMPAIGN.title,
        message: CAMPAIGN.message,
        link: CAMPAIGN.link,
        is_read: false,
      }))
    )
    .select("id, user_id, type, title, message, link, is_read, created_at")

  if (error) {
    throw new Error(`Could not insert campaign notifications: ${error.message}`)
  }

  inserted = data ?? []
}

console.log(
  JSON.stringify(
    {
      mode: apply ? "apply" : "dry-run",
      projectRef,
      campaign: CAMPAIGN,
      recipients: recipients.map((recipient) => ({
        id: recipient.id,
        role: recipient.role,
        curator: recipient.is_opportunities_curator,
        verificationStatus: recipient.verification_status,
        name:
          recipient.preferred_name ??
          recipient.first_name ??
          recipient.full_name ??
          recipient.business_name ??
          "(not provided)",
        email: recipient.email,
        alreadyHadCampaignNotification: existingRecipientIds.has(recipient.id),
      })),
      counts: {
        eligible: recipients.length,
        alreadyPresent: existingRecipientIds.size,
        missing: missingRecipients.length,
        inserted: inserted.length,
      },
      inserted,
    },
    null,
    2
  )
)
