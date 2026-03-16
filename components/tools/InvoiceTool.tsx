'use client'

import { useState } from 'react'
import { BackButton } from '@/components/layout/BackButton'
import { ResultCard } from '@/components/shared/ResultCard'
import { ResultRow } from '@/components/shared/ResultRow'
import { ResultTotal } from '@/components/shared/ResultTotal'
import { ShareBar } from '@/components/shared/ShareBar'
import { TipBox } from '@/components/shared/TipBox'
import { useApp } from '@/components/layout/Providers'
import { F } from '@/lib/constants'

interface InvoiceItem {
  id: number
  name: string
  qty: number
  price: number
}

let nextId = 1

export function InvoiceTool() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [yourName, setYourName] = useState('')
  const [iin, setIin] = useState('')
  const [clientName, setClientName] = useState('')
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: nextId++, name: '', qty: 1, price: 0 },
  ])

  const addItem = () => {
    setItems(prev => [...prev, { id: nextId++, name: '', qty: 1, price: 0 }])
  }

  const removeItem = (id: number) => {
    if (items.length <= 1) return
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const updateItem = (id: number, field: keyof Omit<InvoiceItem, 'id'>, value: string | number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0)
  const vat = subtotal * 0.16
  const total = subtotal + vat

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-4">{L('Шот-фактура генераторы', 'Генератор счёт-фактур')}</h2>

      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1 block">{L('Сіздің атыңыз / Компания', 'Ваше имя / Компания')}</label>
          <input
            value={yourName}
            onChange={e => setYourName(e.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
            placeholder={L('ЖШС «Мысал»', 'ТОО «Пример»')}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1 block">{L('ЖСН / БСН', 'ИИН / БИН')}</label>
          <input
            value={iin}
            onChange={e => setIin(e.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
            placeholder="123456789012"
            maxLength={12}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1 block">{L('Клиент аты', 'Имя клиента')}</label>
          <input
            value={clientName}
            onChange={e => setClientName(e.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
            placeholder={L('Клиент компаниясы', 'Компания клиента')}
          />
        </div>

        <div className="border-t border-border pt-3">
          <h3 className="text-sm font-bold mb-2">{L('Тауарлар / Қызметтер', 'Товары / Услуги')}</h3>
          {items.map((item, idx) => (
            <div key={item.id} className="flex gap-2 items-end mb-2 flex-wrap">
              <div className="flex-1 min-w-[120px]">
                {idx === 0 && <span className="text-[10px] text-muted-foreground">{L('Аты', 'Название')}</span>}
                <input
                  value={item.name}
                  onChange={e => updateItem(item.id, 'name', e.target.value)}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
                  placeholder={L('Тауар аты', 'Название товара')}
                />
              </div>
              <div className="w-16">
                {idx === 0 && <span className="text-[10px] text-muted-foreground">{L('Саны', 'Кол-во')}</span>}
                <input
                  type="number"
                  value={item.qty}
                  onChange={e => updateItem(item.id, 'qty', Number(e.target.value))}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
                  min={1}
                />
              </div>
              <div className="w-24">
                {idx === 0 && <span className="text-[10px] text-muted-foreground">{L('Бағасы', 'Цена')}</span>}
                <input
                  type="number"
                  value={item.price}
                  onChange={e => updateItem(item.id, 'price', Number(e.target.value))}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
                  min={0}
                />
              </div>
              <button
                onClick={() => removeItem(item.id)}
                className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-red-500 hover:border-red-500 transition-colors text-sm"
                title={L('Жою', 'Удалить')}
              >
                &times;
              </button>
            </div>
          ))}
          <button
            onClick={addItem}
            className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            + {L('Қосу', 'Добавить')}
          </button>
        </div>
      </div>

      {subtotal > 0 && (
        <ResultCard>
          <ResultRow label={L('Аралық сома', 'Подытог')} value={`${F(subtotal)} ₸`} />
          <ResultRow label={L('ҚҚС 16%', 'НДС 16%')} value={`${F(vat)} ₸`} color="blue" />
          <ResultTotal label={L('Жалпы сома', 'Итого')} value={`${F(total)} ₸`} />
        </ResultCard>
      )}

      <TipBox>{L('ҚҚС мөлшерлемесі 16% (2026 жылғы Салық кодексі).', 'Ставка НДС 16% (Налоговый кодекс 2026 г.).')}</TipBox>
      <ShareBar tool={L('Шот-фактура генераторы', 'Генератор счёт-фактур')} />
    </div>
  )
}
