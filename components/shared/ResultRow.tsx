import { cn } from '@/lib/utils'

interface ResultRowProps {
  label: string
  value: string
  color?: 'green' | 'red' | 'blue' | 'default'
}

export function ResultRow({ label, value, color = 'default' }: ResultRowProps) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-border/50 last:border-0 text-xs sm:text-sm gap-2">
      <span className="text-muted-foreground min-w-0 shrink">{label}</span>
      <span className={cn('font-bold whitespace-nowrap shrink-0', {
        'text-green-600 dark:text-green-400': color === 'green',
        'text-red-500 dark:text-red-400': color === 'red',
        'text-blue-500 dark:text-blue-400': color === 'blue',
      })}>{value}</span>
    </div>
  )
}
