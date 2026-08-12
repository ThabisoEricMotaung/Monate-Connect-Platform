import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()
const messageDir = path.join(root, "src", "i18n", "messages")
const namespaces = ["localeSwitcher", "publicChrome", "home", "opportunities", "opportunityDetail"]
const targets = ["af", "nr", "xh", "zu", "nso", "st", "tn", "ss", "ve", "ts"]
const protectedTerms = ["AiForm Procure", "SmartScore", "RFQ", "CSD", "B-BBEE", "SARS", "CIPC", "POPIA"]

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"))
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function leaves(value, prefix = []) {
  if (typeof value === "string") return [[prefix, value]]
  return Object.entries(value).flatMap(([key, child]) => leaves(child, [...prefix, key]))
}

function setAt(target, keys, value) {
  let cursor = target
  for (const key of keys.slice(0, -1)) cursor = cursor[key] ??= {}
  cursor[keys.at(-1)] = value
}

function protect(source) {
  const replacements = []
  let value = source
  for (const term of protectedTerms) {
    if (!value.includes(term)) continue
    const token = `ZXQ${replacements.length}QXZ`
    value = value.split(term).join(token)
    replacements.push([token, term])
  }
  const variables = [...value.matchAll(/\{[^{}]+\}/g)].map((match) => match[0])
  for (const variable of variables) {
    const token = `ZXV${replacements.length}VXZ`
    value = value.split(variable).join(token)
    replacements.push([token, variable])
  }
  return { value, replacements }
}

async function translate(source, locale) {
  if (!source.trim()) return source
  const { value, replacements } = protect(source)
  const query = new URLSearchParams({ client: "gtx", sl: "en", tl: locale, dt: "t", q: value })
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(`https://translate.googleapis.com/translate_a/single?${query}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const body = await response.json()
      let translated = body[0].map((part) => part[0]).join("")
      for (const [token, original] of replacements) translated = translated.split(token).join(original)
      return translated
    } catch (error) {
      if (attempt === 3) throw error
      await sleep(300 * (attempt + 1))
    }
  }
}

const english = await readJson(path.join(messageDir, "en.json"))
for (const locale of targets) {
  const file = path.join(messageDir, `${locale}.json`)
  const catalog = await readJson(file)
  const jobs = namespaces.flatMap((namespace) =>
    leaves(english[namespace], [namespace]).filter(([keys]) => {
      let cursor = catalog
      for (const key of keys) cursor = cursor?.[key]
      return typeof cursor !== "string" || cursor.trim() === ""
    }),
  )

  for (let index = 0; index < jobs.length; index += 5) {
    const batch = jobs.slice(index, index + 5)
    const translated = await Promise.all(batch.map(([, source]) => translate(source, locale)))
    batch.forEach(([keys], batchIndex) => setAt(catalog, keys, translated[batchIndex]))
  }
  await writeFile(file, `${JSON.stringify(catalog, null, 2)}\n`, "utf8")
  process.stdout.write(`${locale}: ${jobs.length} generated strings\n`)
}
