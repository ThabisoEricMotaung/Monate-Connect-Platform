import Image from "next/image"

export function initialsFromName(name: string | null | undefined, fallback = "?"): string {
  const source = name?.trim()
  if (!source) return fallback
  const words = source.split(/\s+/).filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

export function ProfileImage({
  alt,
  className,
  fallbackClassName,
  fallbackText,
  src,
}: {
  alt: string
  className: string
  fallbackClassName: string
  fallbackText: string
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

  return <div className={fallbackClassName}>{fallbackText}</div>
}
