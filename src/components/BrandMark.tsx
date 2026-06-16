"use client"

import Image from "next/image"

export default function BrandMark({
  className = "",
  imageClassName = "h-9 w-auto",
}: {
  className?: string
  imageClassName?: string
}) {
  return (
    <span
      className={`logo-mark flex shrink-0 items-center justify-center ${className}`}
      aria-hidden="true"
      style={{
        background: "rgba(30, 58, 100, 0.15)",
        border: "1px solid rgba(30, 58, 100, 0.2)",
        borderRadius: "10px",
        padding: "6px",
      }}
    >
      <Image
        src="/aiform-mark.png"
        alt=""
        width={29}
        height={36}
        className={imageClassName}
        sizes="36px"
        priority={false}
      />
    </span>
  )
}
