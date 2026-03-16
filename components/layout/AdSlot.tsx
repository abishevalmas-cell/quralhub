'use client'

interface AdSlotProps {
  slot: 'top' | 'sidebar' | 'inline' | 'bottom'
  className?: string
}

export function AdSlot({ slot, className }: AdSlotProps) {
  // Will be replaced with real AdSense code when approved
  // For now: invisible placeholder that reserves space
  return (
    <div
      className={`ad-slot ad-slot-${slot} ${className || ''}`}
      data-ad-slot={slot}
      aria-hidden="true"
    >
      {/* Google AdSense code will be inserted here */}
    </div>
  )
}
