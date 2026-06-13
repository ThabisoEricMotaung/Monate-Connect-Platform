"use client"

import Image from "next/image"

export default function BrandMark({
  className = "",
  imageClassName = "h-7 w-auto",
}: {
  className?: string
  imageClassName?: string
}) {
  return (
    <span
      className={`logo-mark flex shrink-0 items-center justify-center rounded-md bg-accent p-1.5 text-button shadow-md ${className}`}
      aria-hidden="true"
    >
      <span className="flex h-full w-full items-center justify-center rounded-[5px] bg-white/95 p-1 shadow-sm ring-1 ring-black/5">
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
    </span>
  )
}
