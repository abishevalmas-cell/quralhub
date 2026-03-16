'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { BackButton } from '@/components/layout/BackButton'
import { ResultCard } from '@/components/shared/ResultCard'
import { ResultRow } from '@/components/shared/ResultRow'
import { ResultTotal } from '@/components/shared/ResultTotal'
import { ShareBar } from '@/components/shared/ShareBar'
import { TipBox } from '@/components/shared/TipBox'
import { InfoChip } from '@/components/shared/InfoChip'
import { calcMarketplace } from '@/lib/calculations/marketplace'
import { F } from '@/lib/constants'
import { useApp } from '@/components/layout/Providers'

type Platform = 'kaspi' | 'wb' | 'ozon'

const PLATFORMS: { id: Platform; label: string; commission: number; tipKz: string; tipRu: string }[] = [
  { id: 'kaspi', label: 'Kaspi Магазин', commission: 10, tipKz: 'Kaspi комиссиясы 5-15%, орташа 10%. ЖК/ТОО тіркелу оңай, теңгемен есеп. KZ аудиториясы ең үлкен.', tipRu: 'Комиссия Kaspi 5-15%, в среднем 10%. Легко зарегистрировать ИП/ТОО, расчёты в тенге. Крупнейшая аудитория в KZ.' },
  { id: 'wb', label: 'Wildberries', commission: 15, tipKz: 'WB комиссиясы 5-25%. Логистика + хранение қымбат болуы мүмкін. Маржа 30%+ болса тиімді.', tipRu: 'Комиссия WB 5-25%. Логистика + хранение могут быть дорогими. Выгодно при марже 30%+.' },
  { id: 'ozon', label: 'Ozon', commission: 12, tipKz: 'Ozon комиссиясы 5-20%. FBO/FBS моделі бар. Логистика бағасы аймаққа байланысты.', tipRu: 'Комиссия Ozon 5-20%. Есть модели FBO/FBS. Стоимость логистики зависит от региона.' },
]

export function MarketplaceCalc() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [platform, setPlatform] = useState<Platform>('kaspi')
  const [sellingPrice, setSellingPrice] = useState(15000)
  const [costPrice, setCostPrice] = useState(5000)
  const [commission, setCommission] = useState(10)
  const [logistics, setLogistics] = useState(800)
  const [packaging, setPackaging] = useState(200)
  const [quantity, setQuantity] = useState(100)

  const currentPlatform = PLATFORMS.find(p => p.id === platform)!

  const handlePlatformChange = (id: Platform) => {
    setPlatform(id)
    const p = PLATFORMS.find(pl => pl.id === id)!
    setCommission(p.commission)
  }

  const result = sellingPrice > 0 && costPrice > 0 && quantity > 0
    ? calcMarketplace(sellingPrice, costPrice, commission, logistics, packaging, quantity)
    : null

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">📦 {L('Маркетплейс маржа', 'Маржа маркетплейса')} {L('калькулятор', 'калькулятор')}</h2>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <InfoChip>Kaspi 5-15%</InfoChip>
        <InfoChip>WB 5-25%</InfoChip>
        <InfoChip>Ozon 5-20%</InfoChip>
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
        {L('Маркетплейсте сатудан таза пайда мен маржаны есептеңіз', 'Рассчитайте чистую прибыль и маржу от продаж на маркетплейсе')}
      </p>

      {/* Context block */}
      <div className="p-4 rounded-xl bg-muted/50 border border-border/50 mb-5 text-sm leading-relaxed text-muted-foreground">
        <p>{L('Kaspi Магазин — Қазақстандағы ең ірі маркетплейс. Комиссия 5-15% (категорияға байланысты). WB және Ozon — халықаралық маркетплейстер, логистика қымбатырақ. Маржа 30%-дан жоғары болса ғана сату тиімді.', 'Kaspi Магазин — крупнейший маркетплейс Казахстана. Комиссия 5-15% (зависит от категории). WB и Ozon — международные, логистика дороже. Продавать выгодно при марже от 30%.')}</p>
      </div>

      {/* Platform selector chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {PLATFORMS.map(p => (
          <button
            key={p.id}
            onClick={() => handlePlatformChange(p.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              platform === p.id
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-accent text-accent-foreground border border-primary/10 hover:border-primary/30'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Сату бағасы (₸)', 'Цена продажи (₸)')}</label>
          <Input
            type="text"
            inputMode="numeric"
            value={sellingPrice || ''}
            onChange={e => setSellingPrice(parseInt(e.target.value.replace(/\s/g, '')) || 0)}
            className="text-base"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Өзіндік құны (₸)', 'Себестоимость (₸)')}</label>
          <Input
            type="text"
            inputMode="numeric"
            value={costPrice || ''}
            onChange={e => setCostPrice(parseInt(e.target.value.replace(/\s/g, '')) || 0)}
            className="text-base"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Комиссия (%)', 'Комиссия (%)')}</label>
          <Input
            type="text"
            inputMode="numeric"
            value={commission || ''}
            onChange={e => setCommission(parseFloat(e.target.value) || 0)}
            className="text-base"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Логистика / дана (₸)', 'Логистика / шт (₸)')}</label>
          <Input
            type="text"
            inputMode="numeric"
            value={logistics || ''}
            onChange={e => setLogistics(parseInt(e.target.value.replace(/\s/g, '')) || 0)}
            className="text-base"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Қаптама / дана (₸)', 'Упаковка / шт (₸)')}</label>
          <Input
            type="text"
            inputMode="numeric"
            value={packaging || ''}
            onChange={e => setPackaging(parseInt(e.target.value.replace(/\s/g, '')) || 0)}
            className="text-base"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Саны (дана)', 'Количество (шт)')}</label>
          <Input
            type="text"
            inputMode="numeric"
            value={quantity || ''}
            onChange={e => setQuantity(parseInt(e.target.value.replace(/\s/g, '')) || 0)}
            className="text-base"
          />
        </div>
      </div>

      {result && (
        <ResultCard>
          <ResultRow label={L('Жалпы түсім', 'Общая выручка')} value={`${F(result.revenue)} ₸`} />
          <ResultRow label={L('Комиссия', 'Комиссия')} value={`−${F(result.commission)} ₸`} color="red" />
          <ResultRow label={L('Логистика', 'Логистика')} value={`−${F(result.logistics)} ₸`} color="red" />
          <ResultRow label={L('Қаптама', 'Упаковка')} value={`−${F(result.packaging)} ₸`} color="red" />
          <ResultRow label={L('Өзіндік құн', 'Себестоимость')} value={`−${F(result.costPrice)} ₸`} color="red" />
          <ResultTotal label={L('ПАЙДА', 'ПРИБЫЛЬ')} value={`${result.profit >= 0 ? '+' : ''}${F(result.profit)} ₸`} />
          <ResultRow label={L('Маржа', 'Маржа')} value={`${result.margin}%`} color={result.margin >= 20 ? 'green' : result.margin >= 0 ? 'blue' : 'red'} />
          <ResultRow label="ROI" value={`${result.roi}%`} color={result.roi >= 30 ? 'green' : result.roi >= 0 ? 'blue' : 'red'} />
        </ResultCard>
      )}

      <TipBox>
        {lang === 'ru' ? currentPlatform.tipRu : currentPlatform.tipKz}
      </TipBox>

      <ShareBar tool="marketplace" text={L('Маркетплейс маржа калькулятор — Quralhub', 'Калькулятор маржи маркетплейса — Quralhub')} />
    </div>
  )
}
