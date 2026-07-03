import { createClient } from "@supabase/supabase-js"

const bucketId = "suggestion-attachments"
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY before running this script.")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const { data: existingBucket, error: getError } = await supabase.storage.getBucket(bucketId)

if (getError && !/not found/i.test(getError.message)) {
  console.error(`Could not check bucket "${bucketId}": ${getError.message}`)
  process.exit(1)
}

if (existingBucket) {
  console.log(`Bucket "${bucketId}" already exists.`)
} else {
  const { error: createError } = await supabase.storage.createBucket(bucketId, {
    public: false,
    fileSizeLimit: "10MB",
    allowedMimeTypes: ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"],
  })

  if (createError) {
    console.error(`Could not create bucket "${bucketId}": ${createError.message}`)
    process.exit(1)
  }

  console.log(`Bucket "${bucketId}" created.`)
}

const testPath = `bucket-healthcheck/${Date.now()}.pdf`
const { error: uploadError } = await supabase.storage
  .from(bucketId)
  .upload(testPath, new Blob(["%PDF-1.4\n% suggestion attachment bucket healthcheck\n"], { type: "application/pdf" }), {
    contentType: "application/pdf",
    upsert: false,
  })

if (uploadError) {
  console.error(`Bucket exists, but the upload healthcheck failed: ${uploadError.message}`)
  process.exit(1)
}

const { error: removeError } = await supabase.storage.from(bucketId).remove([testPath])

if (removeError) {
  console.warn(`Upload healthcheck passed, but cleanup failed for ${testPath}: ${removeError.message}`)
} else {
  console.log("Upload healthcheck passed and cleanup completed.")
}
