export const NATIONAL_PROVINCE_VALUE = "national"
export const SA_PHONE_ERROR = "Please enter a valid SA number (+27 followed by 9 digits)"

export function isNationalSelection(values: string[]) {
  return values.includes(NATIONAL_PROVINCE_VALUE)
}

export function displayProvinceValue(value: string | null | undefined) {
  return value === NATIONAL_PROVINCE_VALUE ? "National" : value
}

export function displayProvinceList(values: string[]) {
  if (isNationalSelection(values)) return "National"
  return values.join(", ")
}

export function validateSAPhone(value: string) {
  return /^\+27\d{9}$/.test(formatSAPhoneInput(value))
}

export function formatSAPhoneInput(value: string) {
  const cleaned = value.replace(/[\s\-()]/g, "")
  if (!cleaned) return ""

  const hasPlus = cleaned.startsWith("+")
  const digits = cleaned.replace(/\D/g, "")

  if (!digits) return hasPlus ? "+" : ""
  if (hasPlus && digits.startsWith("27")) return `+${digits}`
  if (digits.startsWith("0")) return `+27${digits.slice(1)}`
  if (digits.startsWith("27")) return `+${digits}`
  return `+27${digits}`
}

export function phoneFocusValue(value: string) {
  return value.trim() ? formatSAPhoneInput(value) : "+27"
}

export function phoneBlurValue(value: string) {
  const formatted = formatSAPhoneInput(value)
  return formatted === "+27" ? "" : formatted
}

function hasFakeDigits(value: string) {
  const digits = value.replace(/\D/g, "")
  return digits.length > 0 && /^(\d)\1+$/.test(digits)
}

export function validateCsdNumber(value: string) {
  const trimmed = value.trim()
  return /^[A-Za-z][A-Za-z0-9]{3}-\d{8}$/.test(trimmed) && !hasFakeDigits(trimmed)
}

export function validateVatNumber(value: string) {
  const trimmed = value.trim()
  return /^4\d{9}$/.test(trimmed) && !hasFakeDigits(trimmed)
}

export function validateTaxNumber(value: string) {
  const trimmed = value.trim()
  return /^\d{10}$/.test(trimmed) && !hasFakeDigits(trimmed)
}
