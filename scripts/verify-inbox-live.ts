import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import fs from "node:fs"
import path from "node:path"
import process from "node:process"

const envFiles = [".env.local", ".env"]
for (const file of envFiles) {
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error("Missing Supabase URL, anon key, or service role key.")
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const messageSelect =
  "id, sender_id, receiver_id, subject, message, rfq_id, quote_id, is_read, deleted_by_sender, deleted_by_receiver, created_at"

async function signIn(email: string, password: string) {
  const client = createClient(supabaseUrl!, anonKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return client
}

async function visibleInbox(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from("messages")
    .select(messageSelect)
    .eq("receiver_id", userId)
    .or("deleted_by_receiver.is.null,deleted_by_receiver.eq.false")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data ?? []
}

async function visibleSent(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from("messages")
    .select(messageSelect)
    .eq("sender_id", userId)
    .or("deleted_by_sender.is.null,deleted_by_sender.eq.false")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data ?? []
}

async function batchSoftDelete(client: SupabaseClient, userId: string, ids: number[]) {
  const [senderResult, receiverResult] = await Promise.all([
    client
      .from("messages")
      .update({ deleted_by_sender: true })
      .in("id", ids)
      .eq("sender_id", userId),
    client
      .from("messages")
      .update({ deleted_by_receiver: true })
      .in("id", ids)
      .eq("receiver_id", userId),
  ])

  if (senderResult.error) throw senderResult.error
  if (receiverResult.error) throw receiverResult.error
}

async function main() {
  const stamp = Date.now()
  const password = `InboxTest-${stamp}!`
  const recipientEmail = `codex-inbox-recipient-${stamp}@example.com`
  const senderEmail = `codex-inbox-sender-${stamp}@example.com`
  const createdUserIds: string[] = []
  let messageIds: number[] = []

  try {
    const recipient = await admin.auth.admin.createUser({
      email: recipientEmail,
      password,
      email_confirm: true,
      user_metadata: { business_name: "Codex Inbox Recipient", role: "buyer" },
    })
    if (recipient.error || !recipient.data.user) throw recipient.error ?? new Error("Recipient user was not created.")
    createdUserIds.push(recipient.data.user.id)

    const sender = await admin.auth.admin.createUser({
      email: senderEmail,
      password,
      email_confirm: true,
      user_metadata: { business_name: "Codex Inbox Sender", role: "supplier" },
    })
    if (sender.error || !sender.data.user) throw sender.error ?? new Error("Sender user was not created.")
    createdUserIds.push(sender.data.user.id)

    const profiles = [
      {
        id: recipient.data.user.id,
        email: recipientEmail,
        business_name: "Codex Inbox Recipient",
        full_name: "Codex Inbox Recipient",
        role: "buyer",
      },
      {
        id: sender.data.user.id,
        email: senderEmail,
        business_name: "Codex Inbox Sender",
        full_name: "Codex Inbox Sender",
        role: "supplier",
      },
    ]

    const { error: profileError } = await admin.from("profiles").upsert(profiles)
    if (profileError) throw profileError

    const recipientClient = await signIn(recipientEmail, password)
    const senderClient = await signIn(senderEmail, password)

    const subjects = [1, 2, 3].map((index) => `Codex bulk delete live ${stamp}-${index}`)
    const { data: inserted, error: insertError } = await senderClient
      .from("messages")
      .insert(
        subjects.map((subject) => ({
          sender_id: sender.data.user.id,
          receiver_id: recipient.data.user.id,
          subject,
          message: `Live verification message for ${subject}`,
          is_read: false,
        })),
      )
      .select("id")

    if (insertError) throw insertError
    messageIds = (inserted ?? []).map((row) => row.id as number)
    if (messageIds.length !== 3) throw new Error(`Expected 3 inserted messages, got ${messageIds.length}.`)

    const { data: insertedNotifications, error: notificationError } = await admin
      .from("notifications")
      .insert([
        {
          user_id: recipient.data.user.id,
          type: "Message Received",
          title: `Codex live notification ${stamp}-1`,
          message: "Live count verification notification 1",
          is_read: false,
        },
        {
          user_id: recipient.data.user.id,
          type: "Message Received",
          title: `Codex live notification ${stamp}-2`,
          message: "Live count verification notification 2",
          is_read: false,
        },
      ])
      .select("id")

    if (notificationError) throw notificationError
    const notificationIds = (insertedNotifications ?? []).map((row) => row.id as number)

    const beforeInbox = await visibleInbox(recipientClient, recipient.data.user.id)
    const beforeSent = await visibleSent(senderClient, sender.data.user.id)
    const { data: beforeNotifications, error: beforeNotificationError } = await recipientClient
      .from("notifications")
      .select("id, is_read")
      .eq("user_id", recipient.data.user.id)

    if (beforeNotificationError) throw beforeNotificationError

    const matchingBeforeInbox = beforeInbox.filter((message) => messageIds.includes(message.id as number)).length
    const matchingBeforeSent = beforeSent.filter((message) => messageIds.includes(message.id as number)).length
    const matchingBeforeNotifications = (beforeNotifications ?? []).filter(
      (notification) => notificationIds.includes(notification.id as number) && !notification.is_read,
    ).length
    const unifiedUnreadTotal = matchingBeforeInbox + matchingBeforeNotifications

    await batchSoftDelete(recipientClient, recipient.data.user.id, messageIds)

    const afterInbox = await visibleInbox(recipientClient, recipient.data.user.id)
    const afterSent = await visibleSent(senderClient, sender.data.user.id)
    const matchingAfterInbox = afterInbox.filter((message) => messageIds.includes(message.id as number)).length
    const matchingAfterSent = afterSent.filter((message) => messageIds.includes(message.id as number)).length

    console.log(JSON.stringify({
      messageIds,
      before: {
        recipientVisible: matchingBeforeInbox,
        senderVisible: matchingBeforeSent,
        unreadNotifications: matchingBeforeNotifications,
        unifiedUnreadTotal,
        expectedBellInboxTabAndNotificationsTab: unifiedUnreadTotal,
      },
      afterRefreshEquivalent: {
        recipientVisible: matchingAfterInbox,
        senderVisible: matchingAfterSent,
      },
      pass: matchingBeforeInbox === 3 && matchingBeforeSent === 3 && matchingBeforeNotifications === 2 && matchingAfterInbox === 0 && matchingAfterSent === 3,
    }, null, 2))
  } finally {
    if (messageIds.length > 0) {
      await admin.from("messages").delete().in("id", messageIds)
    }
    await admin.from("notifications").delete().like("title", `Codex live notification ${stamp}-%`)
    for (const userId of createdUserIds) {
      await admin.from("profiles").delete().eq("id", userId)
      await admin.auth.admin.deleteUser(userId)
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
