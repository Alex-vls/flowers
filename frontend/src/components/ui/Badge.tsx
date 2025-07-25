import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  color?: 'primary' | 'secondary' | 'accent' | 'gray' | 'success' | 'danger' | 'warning'
  className?: string
}

export default function Badge({ children, color = 'primary', className }: BadgeProps) {
  const colorMap: Record<string, string> = {
    primary: 'bg-green-100 text-green-700',
    secondary: 'bg-pink-100 text-pink-700',
    accent: 'bg-rose-100 text-rose-700',
    gray: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    danger: 'bg-red-100 text-red-700',
    warning: 'bg-yellow-100 text-yellow-700',
  }
  return (
    <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium', colorMap[color], className)}>
      {children}
    </span>
  )
} 