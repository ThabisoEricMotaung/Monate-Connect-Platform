import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border font-semibold leading-none",
  {
    variants: {
      variant: {
        neutral:
          "border-[var(--border)] bg-[var(--bg-muted)] text-[var(--text-secondary)]",
        accent:
          "border-[rgba(var(--accent-rgb),0.3)] bg-[rgba(var(--accent-rgb),0.12)] text-[var(--accent-strong)]",
        success:
          "border-[rgba(var(--success-rgb),0.35)] bg-[rgba(var(--success-rgb),0.12)] text-[var(--success)]",
        warning:
          "border-[rgba(var(--warning-rgb),0.38)] bg-[rgba(var(--warning-rgb),0.12)] text-[var(--warning)]",
      },
      size: {
        small: "min-h-6 px-2 py-1 text-xs",
        regular: "min-h-7 px-2.5 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "small",
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant, size }), className)} {...props} />
  ),
)

Badge.displayName = "Badge"

export { badgeVariants }
export default Badge
