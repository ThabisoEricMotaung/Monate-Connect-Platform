import { createClient } from "@supabase/supabase-js"

const bucketId = "suggestion-attachments"
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY before running this script.")
  process.exit(1)
}

const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function cleanupUser(targetUserId) {
  const { error: profileError } = await service.from("profiles").delete().eq("id", targetUserId)
  if (profileError) console.warn(`Cleanup warning: could not delete profile ${targetUserId}: ${profileError.message}`)

  const { error: userError } = await service.auth.admin.deleteUser(targetUserId)
  if (userError) console.warn(`Cleanup warning: could not delete test user ${targetUserId}: ${userError.message}`)
}

if (process.env.CLEANUP_USER_ID) {
  await cleanupUser(process.env.CLEANUP_USER_ID)
  process.exit(0)
}

const email = `suggestion-upload-healthcheck-${Date.now()}@example.invalid`
const password = `Suggestion-healthcheck-${Date.now()}!`
let userId = null
let suggestionId = null
let attachmentPath = null

try {
  const { data: created, error: createUserError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createUserError) throw new Error(`Could not create test user: ${createUserError.message}`)
  userId = created.user?.id
  if (!userId) throw new Error("Supabase did not return a test user id.")

  const authed = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { error: signInError } = await authed.auth.signInWithPassword({ email, password })
  if (signInError) throw new Error(`Could not sign in test user: ${signInError.message}`)

  attachmentPath = `${userId}/${Date.now()}-healthcheck.pdf`
  const file = new Blob(["%PDF-1.4\n% suggestion form upload healthcheck\n"], { type: "application/pdf" })
  const { error: uploadError } = await authed.storage
    .from(bucketId)
    .upload(attachmentPath, file, { contentType: "application/pdf", upsert: false })

  if (uploadError) throw new Error(`Authenticated upload failed: ${uploadError.message}`)

  const { data: publicUrlData } = authed.storage.from(bucketId).getPublicUrl(attachmentPath)
  const { data: inserted, error: insertError } = await authed
    .from("suggestions")
    .insert({
      user_id: userId,
      display_name: "Suggestion upload healthcheck",
      email,
      category: "General",
      message: "Automated suggestion upload healthcheck.",
      attachment_path: attachmentPath,
      attachment_url: publicUrlData.publicUrl || attachmentPath,
      attachment_name: "healthcheck.pdf",
      attachment_type: "application/pdf",
      attachment_size: file.size,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (insertError) throw new Error(`Suggestion insert failed after upload: ${insertError.message}`)
  suggestionId = inserted.id

  console.log(`Authenticated upload and suggestion insert passed for test user ${userId}.`)
} finally {
  if (suggestionId) {
    const { error } = await service.from("suggestions").delete().eq("id", suggestionId)
    if (error) console.warn(`Cleanup warning: could not delete suggestion ${suggestionId}: ${error.message}`)
  }

  if (attachmentPath) {
    const { error } = await service.storage.from(bucketId).remove([attachmentPath])
    if (error) console.warn(`Cleanup warning: could not remove ${attachmentPath}: ${error.message}`)
  }

  if (userId) {
    await cleanupUser(userId)
  }
}
