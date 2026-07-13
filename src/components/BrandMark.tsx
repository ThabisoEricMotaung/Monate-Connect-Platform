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
