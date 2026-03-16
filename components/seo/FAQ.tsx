'use client'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FAQItem {
  question: string
  answer: string
}

export function FAQ({ items, title = 'Жиі қойылатын сұрақтар' }: { items: FAQItem[]; title?: string }) {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section className="mt-8 pt-6 border-t border-border">
      <h3 className="text-lg font-bold mb-4">{title}</h3>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-semibold hover:bg-accent/50 transition-colors"
            >
              <span>{item.question}</span>
              <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', open === i && 'rotate-180')} />
            </button>
            {open === i && (
              <div className="px-4 pb-3 text-sm text-muted-foreground leading-relaxed">
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
