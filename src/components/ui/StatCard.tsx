import React from 'react'
import Card from './Card'
import { cn } from '@/lib/cn'

export interface StatCardProps {
  icon?: React.ReactNode
  label: string
  value: string | number
  subtext?: string
  accentColor?: 'blue' | 'green' | 'gold' | 'default'
  className?: string
}

const accentColors = {
  blue: 'bg-[#315A78]/15 text-[#315A78]',
  green: 'bg-[#2F8C67]/15 text-[#2F8C67]',
  gold: 'bg-[#8A6A32]/15 text-[#8A6A32]',
  default: 'bg-[#E5DFD4] text-[#24282D]',
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ icon, label, value, subtext, accentColor = 'default', className }, ref) => (
    <Card ref={ref} className={cn('flex flex-col gap-3', className)}>
      {icon && (
        <div className={cn('inline-flex h-10 w-10 items-center justify-center rounded-full', accentColors[accentColor])}>
          {icon}
        </div>
      )}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#5B6470] dark:text-[#AEB6BB]">
          {label}
        </p>
        <p className="mt-2 text-3xl font-bold text-[#24282D] dark:text-[#F7F7F2]">
          {value}
        </p>
        {subtext && (
          <p className="mt-1 text-sm text-[#48525D] dark:text-[#C5CACD]">
            {subtext}
          </p>
        )}
      </div>
    </Card>
  )
)

StatCard.displayName = 'StatCard'

export default StatCard
