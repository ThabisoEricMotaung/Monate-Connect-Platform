import { AwsClient } from "aws4fetch"

// Thin wrapper around Cloudflare R2's S3-compatible API using aws4fetch
// (a ~5kb, zero-dependency SigV4 signer built on fetch — much lighter than
// the full AWS SDK, which matters for a serverless function's cold start
// and bundle size). Used by the daily database backup cron job and the
// manual restore script.
//
// Required env vars: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
// R2_BUCKET. R2_ENDPOINT is optional (defaults to the standard per-account
// endpoint); only needed if the bucket lives in a jurisdiction with its own
// endpoint host.

function env(name: string): string | undefined {
  const value = process.env[name]
  return value && value.trim() ? value.trim() : undefined
}

export type R2Config = {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  endpoint: string
}

export function getR2Config(): R2Config | null {
  const accountId = env("R2_ACCOUNT_ID")
  const accessKeyId = env("R2_ACCESS_KEY_ID")
  const secretAccessKey = env("R2_SECRET_ACCESS_KEY")
  const bucket = env("R2_BUCKET")
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null

  const endpoint = env("R2_ENDPOINT") || `https://${accountId}.r2.cloudflarestorage.com`
  return { accountId, accessKeyId, secretAccessKey, bucket, endpoint: endpoint.replace(/\/$/, "") }
}

function client(config: R2Config): AwsClient {
  return new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: "auto",
  })
}

function objectUrl(config: R2Config, key: string): string {
  return `${config.endpoint}/${config.bucket}/${key.replace(/^\//, "")}`
}

export async function r2Put(
  config: R2Config,
  key: string,
  body: string,
  contentType = "application/json",
): Promise<void> {
  const signer = client(config)
  const response = await signer.fetch(objectUrl(config, key), {
    method: "PUT",
    body,
    headers: { "content-type": contentType },
  })
  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(`R2 PUT ${key} failed: ${response.status} ${response.statusText} ${text}`.trim())
  }
}

export async function r2GetText(config: R2Config, key: string): Promise<string> {
  const signer = client(config)
  const response = await signer.fetch(objectUrl(config, key), { method: "GET" })
  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(`R2 GET ${key} failed: ${response.status} ${response.statusText} ${text}`.trim())
  }
  return response.text()
}

export async function r2Delete(config: R2Config, key: string): Promise<void> {
  const signer = client(config)
  const response = await signer.fetch(objectUrl(config, key), { method: "DELETE" })
  // R2 returns 204 on success; treat 404 as already-gone rather than an error.
  if (!response.ok && response.status !== 404) {
    const text = await response.text().catch(() => "")
    throw new Error(`R2 DELETE ${key} failed: ${response.status} ${response.statusText} ${text}`.trim())
  }
}

export type R2ListedObject = {
  key: string
  lastModified: string
  size: number
}

// Minimal ListObjectsV2 XML parsing. R2's list response is a small, fixed
// shape (no attributes, no nesting beyond what we care about), so a regex
// scan is reliable here and avoids pulling in an XML parser dependency for
// a single internal tool.
export async function r2List(config: R2Config, prefix: string): Promise<R2ListedObject[]> {
  const signer = client(config)
  const results: R2ListedObject[] = []
  let continuationToken: string | undefined

  do {
    const url = new URL(`${config.endpoint}/${config.bucket}`)
    url.searchParams.set("list-type", "2")
    if (prefix) url.searchParams.set("prefix", prefix)
    if (continuationToken) url.searchParams.set("continuation-token", continuationToken)

    const response = await signer.fetch(url.toString(), { method: "GET" })
    if (!response.ok) {
      const text = await response.text().catch(() => "")
      throw new Error(`R2 LIST failed: ${response.status} ${response.statusText} ${text}`.trim())
    }
    const xml = await response.text()

    for (const match of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      const block = match[1]
      const key = block.match(/<Key>([\s\S]*?)<\/Key>/)?.[1] ?? ""
      const lastModified = block.match(/<LastModified>([\s\S]*?)<\/LastModified>/)?.[1] ?? ""
      const size = Number(block.match(/<Size>([\s\S]*?)<\/Size>/)?.[1] ?? "0")
      if (key) results.push({ key: decodeXmlEntities(key), lastModified, size })
    }

    const truncated = xml.match(/<IsTruncated>([\s\S]*?)<\/IsTruncated>/)?.[1] === "true"
    continuationToken = truncated
      ? xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/)?.[1]
      : undefined
  } while (continuationToken)

  return results
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}
