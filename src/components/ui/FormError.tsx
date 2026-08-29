import * as React from "react"
import { cn } from "@/lib/cn"

export interface FormErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {}

const FormError = React.forwardRef<HTMLParagraphElement, FormErrorProps>(
  ({ className, children, ...props }, ref) => (
    <p
      ref={ref}
      role="alert"
      className={cn("text-sm font-medium text-[var(--warning)]", className)}
      {...props}
    >
      {children}
    </p>
  ),
)

FormError.displayName = "FormError"

export default FormError
