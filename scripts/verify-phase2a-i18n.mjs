import { readFile } from "node:fs/promises"
import path from "node:path"

const locales = ["en", "af", "nr", "xh", "zu", "nso", "st", "tn", "ss", "ve", "ts"]
const namespaces = ["localeSwitcher", "publicChrome", "home", "opportunities", "opportunityDetail"]
const dir = path.join(process.cwd(), "src", "i18n", "messages")
const read = async (locale) => JSON.parse(await readFile(path.join(dir, `${locale}.json`), "utf8"))
const leaves = (value, prefix = "") => typeof value === "string"
  ? [[prefix, value]]
  : Object.entries(value ?? {}).flatMap(([key, child]) => leaves(child, prefix ? `${prefix}.${key}` : key))

const english = await read("en")
const expected = new Map(namespaces.flatMap((namespace) => leaves(english[namespace], namespace)))
const failures = []
for (const locale of locales) {
  const catalog = await read(locale)
  const actual = new Map(namespaces.flatMap((namespace) => leaves(catalog[namespace], namespace)))
  for (const [key, source] of expected) {
    const value = actual.get(key)
    if (!value?.trim()) failures.push(`${locale}: missing ${key}`)
    for (const variable of source.match(/\{[^{}]+\}/g) ?? []) {
      if (!value?.includes(variable)) failures.push(`${locale}: ${key} lost ${variable}`)
    }
  }
}
if (failures.length) {
  console.error(failures.join("\n"))
  process.exit(1)
}
console.log(`${locales.length} locales have complete Phase 2a namespace coverage.`)
