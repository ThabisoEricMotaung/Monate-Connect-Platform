"use client"

import { forwardRef, useState, type InputHTMLAttributes } from "react"
import { IconEye, IconEyeOff } from "@tabler/icons-react"

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  hideLabel?: string
  revealLabel?: string
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className = "", hideLabel = "Hide password", revealLabel = "Show password", ...props }, ref) => {
    const [visible, setVisible] = useState(false)
    const Icon = visible ? IconEyeOff : IconEye

    return (
      <div className="relative">
        <input
          {...props}
          ref={ref}
          type={visible ? "text" : "password"}
          className={`${className} pr-12`}
        />
        <button
          type="button"
          aria-label={visible ? hideLabel : revealLabel}
          onClick={() => setVisible((current) => !current)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted transition hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        >
          <Icon aria-hidden="true" className="h-5 w-5" stroke={1.8} />
        </button>
      </div>
    )
  },
)

PasswordInput.displayName = "PasswordInput"

export default PasswordInput
