export function parseMoney(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (!value) return 0

  const normalized = String(value)
    .replace(/[Rr]/g, "")
    .replace(/\s/g, "")
    .replace(/,/g, "")
    .replace(/[^\d.]/g, "")
  const parsed = Number(normalized)

  return Number.isFinite(parsed) ? parsed : 0
}

function compactNumber(value: number, divisor: number): string {
  const scaled = value / divisor
  const rounded = scaled >= 10 ? scaled.toFixed(1) : scaled.toFixed(1)
  return rounded.endsWith(".0") ? rounded.slice(0, -2) : rounded
}

export function formatRand(value: string | number | null | undefined): string {
  const amount = parseMoney(value)
  const absolute = Math.abs(amount)
  const sign = amount < 0 ? "-" : ""

  if (absolute >= 1_000_000_000) {
    return `${sign}R ${compactNumber(absolute, 1_000_000_000)}bn`
  }

  if (absolute >= 1_000_000) {
    return `${sign}R ${compactNumber(absolute, 1_000_000)}m`
  }

  return `${sign}R ${Math.round(absolute).toLocaleString("en-ZA")}`
}
