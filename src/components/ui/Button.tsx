import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-medium transition-colors rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-[#315A78] text-white hover:bg-[#1E3B56] active:bg-[#152843] focus-visible:ring-[#8497A6]',
        secondary:
          'border-2 border-[#315A78] text-[#315A78] hover:bg-[#315A78]/5 active:bg-[#315A78]/10 focus-visible:ring-[#8497A6]',
        ghost:
          'text-[#315A78] hover:bg-[#315A78]/10 active:bg-[#315A78]/20 focus-visible:ring-[#8497A6]',
        success:
          'bg-[#2F8C67] text-white hover:bg-[#1f5a45] active:bg-[#153d32] focus-visible:ring-[#5AB385]',
        warning:
          'bg-[#8A6A32] text-white hover:bg-[#6a5229] active:bg-[#4a3a1a] focus-visible:ring-[#C6A15B]',
        destructive:
          'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500',
      },
      size: {
        large: 'h-12 px-6 text-base',
        regular: 'h-10 px-4 text-sm',
        small: 'h-8 px-3 text-xs',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'regular',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading = false, disabled, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        ref={ref}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
