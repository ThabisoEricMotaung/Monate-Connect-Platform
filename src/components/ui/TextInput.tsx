import * as React from "react"
import type { VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"
import { formControlVariants } from "./formStyles"

export interface TextInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof formControlVariants> {}

const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ className, state, "aria-invalid": ariaInvalid, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(formControlVariants({ state }), "h-11 px-3 text-base sm:text-sm", className)}
      aria-invalid={ariaInvalid ?? (state === "error" ? true : undefined)}
      {...props}
    />
  ),
)

TextInput.displayName = "TextInput"

export default TextInput
