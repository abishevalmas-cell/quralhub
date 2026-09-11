'use client'
import { useApp } from '@/components/layout/Providers'
import type { CollageItem } from '@/lib/collage/types'

interface Props {
  item: CollageItem | null
  selectedCount: number
  processing: boolean
  onChange: (patch: Partial<CollageItem>) => void
  onCommit: () => void
  onToggleBg: (enabled: boolean) => void
  onReprocessBg: (threshold: number) => void
  onOrder: (op: 'front' | 'forward' | 'backward' | 'back') => void
  onAlign: (op: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom') => void
  onDuplicate: () => void
  onDelete: () => void
  onFitToSheet: () => void
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

const inputCls =
  'w-full h-9 px-2.5 rounded-lg bg-background border border-border text-sm outline-none focus:border-primary'

const chipCls =
  'flex-1 min-h-[36px] px-2 rounded-lg border border-border bg-card text-[11px] font-semibold hover:border-primary transition-colors'

export function ItemInspector({
  item,
  selectedCount,
  processing,
  onChange,
  onCommit,
  onToggleBg,
  onReprocessBg,
  onOrder,
  onAlign,
  onDuplicate,
  onDelete,
  onFitToSheet,
}: Props) {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => (lang === 'ru' ? ru : kz)

  if (!item) {
    return (
      <div className="p-4 text-center text-xs text-muted-foreground">
        {selectedCount > 1
          ? L(`${selectedCount} нысан таңдалды — туралау түймелерін қолданыңыз`, `Выбрано объектов: ${selectedCount} — используйте выравнивание`)
          : L('Өңдеу үшін нысанды таңдаңыз', 'Выберите объект на листе, чтобы редактировать')}
        {selectedCount > 1 && (
          <div className="grid grid-cols-3 gap-1.5 mt-3">
            {([
              ['left', '⇤'], ['hcenter', '↔'], ['right', '⇥'],
              ['top', '⇡'], ['vcenter', '↕'], ['bottom', '⇣'],
            ] as const).map(([op, icon]) => (
              <button key={op} onClick={() => onAlign(op)} className={chipCls}>{icon}</button>
            ))}
          </div>
        )}
      </div>
    )
  }

  const num = (v: number) => Math.round(v * 10) / 10

  return (
    <div className="p-3 space-y-3">
      <input
        value={item.name}
        onChange={e => onChange({ name: e.target.value })}
        onBlur={onCommit}
        className={inputCls}
      />

      {item.kind === 'text' && (
        <>
          <Field label={L('Мәтін', 'Текст')}>
            <textarea
              value={item.text ?? ''}
              onChange={e => onChange({ text: e.target.value })}
              onBlur={onCommit}
              rows={2}
              className={`${inputCls} h-auto py-2 resize-y`}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={L('Өлшемі', 'Размер')}>
              <input
                type="number"
                value={item.fontSize ?? 32}
                onChange={e => onChange({ fontSize: Number(e.target.value) })}
                onBlur={onCommit}
                className={inputCls}
              />
            </Field>
            <Field label={L('Түсі', 'Цвет')}>
              <input
                type="color"
                value={item.color ?? '#111111'}
                onChange={e => onChange({ color: e.target.value })}
                onBlur={onCommit}
                className="w-full h-9 rounded-lg border border-border bg-background"
              />
            </Field>
          </div>
          <div className="flex gap-1.5">
            {(['left', 'center', 'right'] as const).map(a => (
              <button
                key={a}
                onClick={() => { onChange({ align: a }); onCommit() }}
                className={`${chipCls} ${item.align === a ? '!border-primary !bg-primary/10' : ''}`}
              >
                {a === 'left' ? '⬅' : a === 'center' ? '⬌' : '➡'}
              </button>
            ))}
            {[400, 600, 800].map(w => (
              <button
                key={w}
                onClick={() => { onChange({ fontWeight: w }); onCommit() }}
                className={`${chipCls} ${(item.fontWeight ?? 600) === w ? '!border-primary !bg-primary/10' : ''}`}
              >
                {w === 400 ? 'R' : w === 600 ? 'M' : 'B'}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Field label="X">
          <input type="number" value={num(item.x)} onChange={e => onChange({ x: Number(e.target.value) })} onBlur={onCommit} className={inputCls} />
        </Field>
        <Field label="Y">
          <input type="number" value={num(item.y)} onChange={e => onChange({ y: Number(e.target.value) })} onBlur={onCommit} className={inputCls} />
        </Field>
        <Field label={L('Ені', 'Ширина')}>
          <input
            type="number"
            value={num(item.w)}
            onChange={e => {
              const w = Math.max(10, Number(e.target.value))
              onChange({ w, h: item.kind === 'image' ? (w * item.h) / item.w : item.h })
            }}
            onBlur={onCommit}
            className={inputCls}
          />
        </Field>
        <Field label={L('Биіктігі', 'Высота')}>
          <input
            type="number"
            value={num(item.h)}
            onChange={e => {
              const h = Math.max(10, Number(e.target.value))
              onChange({ h, w: item.kind === 'image' ? (h * item.w) / item.h : item.w })
            }}
            onBlur={onCommit}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label={`${L('Бұрылыс', 'Поворот')}: ${num(item.rotation)}°`}>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={-180}
            max={180}
            step={0.5}
            value={item.rotation}
            onChange={e => onChange({ rotation: Number(e.target.value) })}
            onPointerUp={onCommit}
            className="flex-1 accent-primary"
          />
          <button onClick={() => { onChange({ rotation: 0 }); onCommit() }} className="text-[11px] px-2 h-8 rounded-lg border border-border">0°</button>
        </div>
      </Field>

      <Field label={`${L('Мөлдірлік', 'Прозрачность')}: ${Math.round(item.opacity * 100)}%`}>
        <input
          type="range"
          min={0.05}
          max={1}
          step={0.01}
          value={item.opacity}
          onChange={e => onChange({ opacity: Number(e.target.value) })}
          onPointerUp={onCommit}
          className="w-full accent-primary"
        />
      </Field>

      {item.kind === 'image' && (
        <>
          <div className="rounded-xl border border-border bg-card/60 p-2.5 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={item.bgRemoved}
                disabled={processing}
                onChange={e => onToggleBg(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-xs font-semibold">{L('Фонсыз', 'Без фона')}</span>
              {processing && <span className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />}
            </label>
            {item.bgRemoved && (
              <div>
                <span className="text-[11px] text-muted-foreground">
                  {L('Сезімталдық', 'Порог')}: {item.bgThreshold}
                </span>
                <input
                  type="range"
                  min={150}
                  max={255}
                  value={item.bgThreshold}
                  disabled={processing}
                  onChange={e => onChange({ bgThreshold: Number(e.target.value) })}
                  onPointerUp={e => onReprocessBg(Number((e.target as HTMLInputElement).value))}
                  className="w-full accent-primary"
                />
              </div>
            )}
          </div>

          <Field label={L('Нақты ені, см (автожинау үшін)', 'Реальная ширина, см (для автосборки)')}>
            <input
              type="number"
              placeholder="—"
              value={item.realWidthCm ?? ''}
              onChange={e => onChange({ realWidthCm: e.target.value ? Number(e.target.value) : undefined })}
              onBlur={onCommit}
              className={inputCls}
            />
          </Field>
        </>
      )}

      <div className="flex gap-1.5">
        {item.kind === 'image' && (
          <button onClick={() => { onChange({ flipX: !item.flipX }); onCommit() }} className={`${chipCls} ${item.flipX ? '!border-primary !bg-primary/10' : ''}`}>
            {L('Айналдыру', 'Отразить')}
          </button>
        )}
        <button onClick={() => { onChange({ shadow: !item.shadow }); onCommit() }} className={`${chipCls} ${item.shadow ? '!border-primary !bg-primary/10' : ''}`}>
          {L('Көлеңке', 'Тень')}
        </button>
        <button onClick={onFitToSheet} className={chipCls}>{L('Параққа', 'В лист')}</button>
      </div>

      <div>
        <span className="text-[11px] font-semibold text-muted-foreground">{L('Қабат', 'Слой')}</span>
        <div className="grid grid-cols-4 gap-1.5 mt-1">
          <button onClick={() => onOrder('back')} className={chipCls} title={L('Ең артқа', 'На задний план')}>⤓</button>
          <button onClick={() => onOrder('backward')} className={chipCls} title={L('Артқа', 'Ниже')}>↓</button>
          <button onClick={() => onOrder('forward')} className={chipCls} title={L('Алға', 'Выше')}>↑</button>
          <button onClick={() => onOrder('front')} className={chipCls} title={L('Ең алға', 'На передний план')}>⤒</button>
        </div>
      </div>

      <div>
        <span className="text-[11px] font-semibold text-muted-foreground">{L('Туралау', 'Выравнивание')}</span>
        <div className="grid grid-cols-6 gap-1.5 mt-1">
          {([
            ['left', '⇤'], ['hcenter', '↔'], ['right', '⇥'],
            ['top', '⇡'], ['vcenter', '↕'], ['bottom', '⇣'],
          ] as const).map(([op, icon]) => (
            <button key={op} onClick={() => onAlign(op)} className={chipCls}>{icon}</button>
          ))}
        </div>
      </div>

      <div className="flex gap-1.5 pt-1">
        <button onClick={() => { onChange({ locked: !item.locked }); onCommit() }} className={`${chipCls} ${item.locked ? '!border-primary !bg-primary/10' : ''}`}>
          {item.locked ? L('Ашу', 'Разблок.') : L('Бекіту', 'Закрепить')}
        </button>
        <button onClick={onDuplicate} className={chipCls}>{L('Көшіру', 'Дублировать')}</button>
        <button onClick={onDelete} className={`${chipCls} !text-red-600 dark:!text-red-400`}>{L('Жою', 'Удалить')}</button>
      </div>
    </div>
  )
}
