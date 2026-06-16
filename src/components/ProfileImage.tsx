import Image from "next/image"

const GRADIENTS = [
  ["#1a3a2a", "#2d5a3d"],
  ["#c8a060", "#a67c3a"],
  ["#2d4a6b", "#1a2f45"],
  ["#6b3a2d", "#4a2419"],
  ["#1a4a4a", "#0d2d2d"],
  ["#4a3a6b", "#2d2145"],
] as const

export function initialsFromName(name: string | null | undefined, fallback = "S"): string {
  const source = name?.trim()
  if (!source) return fallback
  const words = source.split(/\s+/).filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

function gradientForName(name: string): string {
  const firstLetter = name.trim().charAt(0).toUpperCase()
  const index = firstLetter ? firstLetter.charCodeAt(0) % GRADIENTS.length : 0
  const [from, to] = GRADIENTS[index]
  return `linear-gradient(135deg, ${from}, ${to})`
}

function fallbackSize(className: string): number {
  const match = className.match(/\bh-(\d+)\b/)
  if (!match) return 14
  return Math.max(11, Math.round(Number(match[1]) * 4 * 0.34))
}

function sanitizeFallback(text: string, seed: string): string {
  const clean = text.replace(/\?/g, "").trim()
  return clean || initialsFromName(seed, "S")
}

export function ProfileImage({
  alt,
  className,
  fallbackClassName,
  fallbackText,
  seedName,
  src,
}: {
  alt: string
  className: string
  fallbackClassName: string
  fallbackText: string
  seedName?: string | null
  src?: string | null
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        width={96}
        height={96}
        unoptimized
        className={className}
      />
    )
  }

  const seed = seedName?.trim() || alt || fallbackText || "Supplier"
  const initials = sanitizeFallback(fallbackText, seed)
  const isLogoShape = !fallbackClassName.includes("rounded-full")

  return (
    <div
      className={fallbackClassName}
      style={{
        background: gradientForName(seed),
        borderRadius: isLogoShape ? 12 : undefined,
        boxShadow: "inset 0 1px 1px rgba(255,255,255,0.22), inset 0 -10px 20px rgba(0,0,0,0.18)",
        color: "#f0ebe0",
        fontSize: fallbackSize(fallbackClassName),
        fontWeight: 800,
        lineHeight: 1,
      }}
    >
      {initials}
    </div>
  )
}
