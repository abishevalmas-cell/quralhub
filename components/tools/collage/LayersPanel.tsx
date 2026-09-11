'use client'
import { useApp } from '@/components/layout/Providers'
import type { CollageItem } from '@/lib/collage/types'

interface Props {
  items: CollageItem[]
  selectedIds: string[]
  onSelect: (ids: string[]) => void
  onPatch: (id: string, patch: Partial<CollageItem>) => void
  onMove: (id: string, dir: 'up' | 'down') => void
  onDelete: (id: string) => void
}

export function LayersPanel({ items, selectedIds, onSelect, onPatch, onMove, onDelete }: Props) {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => (lang === 'ru' ? ru : kz)

  if (!items.length) {
    return (
      <p className="p-4 text-center text-xs text-muted-foreground">
        {L('Парақ бос. Суреттерді жүктеңіз.', 'Лист пуст. Загрузите изображения предметов.')}
      </p>
    )
  }

  // Topmost layer first, the way layer lists always read
  const ordered = items.slice().reverse()

  return (
    <ul className="p-2 space-y-1 max-h-[290px] overflow-y-auto">
      {ordered.map(item => {
        const active = selectedIds.includes(item.id)
        return (
          <li
            key={item.id}
            onClick={e => onSelect(e.shiftKey ? [...new Set([...selectedIds, item.id])] : [item.id])}
            className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer border transition-colors ${
              active ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-accent/40'
            }`}
          >
            <div className="w-9 h-9 shrink-0 rounded-md bg-muted flex items-center justify-center overflow-hidden">
              {item.kind === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.src} alt="" className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-xs">T</span>
              )}
            </div>
            <span className="flex-1 text-xs truncate">{item.name}</span>
            <button
              onClick={e => { e.stopPropagation(); onMove(item.id, 'up') }}
              className="w-6 h-7 text-[11px] text-muted-foreground hover:text-foreground"
              title={L('Жоғары', 'Выше')}
            >↑</button>
            <button
              onClick={e => { e.stopPropagation(); onMove(item.id, 'down') }}
              className="w-6 h-7 text-[11px] text-muted-foreground hover:text-foreground"
              title={L('Төмен', 'Ниже')}
            >↓</button>
            <button
              onClick={e => { e.stopPropagation(); onPatch(item.id, { visible: !item.visible }) }}
              className="w-6 h-7 text-[11px]"
              title={L('Көріну', 'Видимость')}
            >{item.visible ? '👁' : '🚫'}</button>
            <button
              onClick={e => { e.stopPropagation(); onPatch(item.id, { locked: !item.locked }) }}
              className="w-6 h-7 text-[11px]"
              title={L('Бекіту', 'Блокировка')}
            >{item.locked ? '🔒' : '🔓'}</button>
            <button
              onClick={e => { e.stopPropagation(); onDelete(item.id) }}
              className="w-6 h-7 text-[11px] text-muted-foreground hover:text-red-500"
              title={L('Жою', 'Удалить')}
            >✕</button>
          </li>
        )
      })}
    </ul>
  )
}
