import * as React from "react"
import type { VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"
import { formControlVariants } from "./formStyles"

export interface SelectFieldProps
  extends React.SelectHTMLAttributes<HTMLSelectElement>,
    VariantProps<typeof formControlVariants> {}

const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ className, state, "aria-invalid": ariaInvalid, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        formControlVariants({ state }),
        "h-11 cursor-pointer px-3 text-base sm:text-sm",
        className,
      )}
      aria-invalid={ariaInvalid ?? (state === "error" ? true : undefined)}
      {...props}
    >
      {children}
    </select>
  ),
)

SelectField.displayName = "SelectField"

export default SelectField
