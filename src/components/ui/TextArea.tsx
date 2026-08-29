import * as React from "react"
import type { VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"
import { formControlVariants } from "./formStyles"

export interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof formControlVariants> {}

const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, state, "aria-invalid": ariaInvalid, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        formControlVariants({ state }),
        "min-h-[100px] resize-y px-3 py-2.5 text-base sm:text-sm",
        className,
      )}
      aria-invalid={ariaInvalid ?? (state === "error" ? true : undefined)}
      {...props}
    />
  ),
)

TextArea.displayName = "TextArea"

export default TextArea
