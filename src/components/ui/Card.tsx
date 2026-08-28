import React from 'react'
import { cn } from '@/lib/cn'

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    elevated?: boolean
    interactive?: boolean
  }
>(({ className, elevated = false, interactive = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-[18px] border border-[#BCB6AD] bg-[#FFFEFA] p-6 text-[#24282D]',
      elevated && 'shadow-[0_20px_45px_rgba(18,60,43,0.09),0_4px_14px_rgba(18,60,43,0.05),inset_0_1px_0_rgba(255,255,255,0.78)]',
      !elevated && 'shadow-[0_10px_26px_rgba(18,60,43,0.06),inset_0_1px_0_rgba(255,255,255,0.6)]',
      interactive && 'transition-all hover:shadow-[0_28px_60px_rgba(18,60,43,0.14),0_8px_18px_rgba(18,60,43,0.08),inset_0_1px_0_rgba(255,255,255,0.9),inset_0_0_46px_rgba(201,161,59,0.1)] hover:border-[#C9A13B]/28 hover:-translate-y-1',
      'dark:border-[#353D45] dark:bg-[#1D252C] dark:text-[#DDE1DE]',
      className
    )}
    {...props}
  />
))

Card.displayName = 'Card'

export default Card
