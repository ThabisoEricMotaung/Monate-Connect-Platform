import { cva } from "class-variance-authority"

export const formControlVariants = cva(
  "w-full rounded-lg border bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm outline-none transition-colors duration-200 placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:bg-[var(--bg-muted)] disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-[rgba(var(--accent-soft-rgb),0.55)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]",
  {
    variants: {
      state: {
        default:
          "border-[var(--border)] hover:border-[var(--border-strong)] focus-visible:border-[var(--accent)]",
        error:
          "border-[var(--warning)] focus-visible:border-[var(--warning)] focus-visible:ring-[rgba(var(--warning-rgb),0.35)]",
        success:
          "border-[var(--success)] focus-visible:border-[var(--success)] focus-visible:ring-[rgba(var(--success-rgb),0.35)]",
      },
    },
    defaultVariants: {
      state: "default",
    },
  },
)
