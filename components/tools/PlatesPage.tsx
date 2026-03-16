'use client'
import { useState, useMemo, useEffect, useRef } from 'react'
import { BackButton } from '@/components/layout/BackButton'
import { ShareBar } from '@/components/shared/ShareBar'
import { TipBox } from '@/components/shared/TipBox'
import { InfoChip } from '@/components/shared/InfoChip'
import { useApp } from '@/components/layout/Providers'
import { PLATE_CATEGORIES, PLATE_REGIONS } from '@/lib/data/plates'
import { F, MRP } from '@/lib/constants'

const REGISTRATION_FEE = 5406

const EGOV_WEB = 'https://egov.kz/cms/kk/services/vehicle/pass_vip_number'
const EGOV_TRANSPORT = 'https://egov.kz/cms/kk/categories/transports'

function EgovButtons({ L }: { L: (kz: string, ru: string) => string }) {
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop')
  useEffect(() => {
    const ua = navigator.userAgent
    if (/iPhone|iPad|iPod/i.test(ua)) setPlatform('ios')
    else if (/Android/i.test(ua)) setPlatform('android')
  }, [])
  const appLink = platform === 'ios'
    ? 'https://apps.apple.com/kz/app/egov-mobile/id1476730377'
    : 'intent://egov.kz#Intent;package=kz.egov.mobile;scheme=https;S.browser_fallback_url=https://play.google.com/store/apps/details?id=kz.egov.mobile;end'
  return (
    <div className="mb-4 space-y-2">
      <div className="flex flex-col sm:flex-row gap-2">
        <a href={EGOV_WEB} target="_blank" rel="noopener noreferrer" className="btn-glass flex-1 !text-xs !h-10 !min-h-[44px] justify-center">
          🔍 {L('Egov.kz-де тексеру', 'Проверить на Egov.kz')}
        </a>
        {platform !== 'desktop' ? (
          <a href={appLink} className="btn-glass-outline flex-1 !text-xs !h-10 !min-h-[44px] justify-center">📱 EGov Mobile</a>
        ) : (
          <a href={EGOV_TRANSPORT} target="_blank" rel="noopener noreferrer" className="btn-glass-outline flex-1 !text-xs !h-10 !min-h-[44px] justify-center">📋 {L('Онлайн тіркеу', 'Онлайн регистрация')}</a>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground text-center">{L('⚠️ Нөмірдің бос/бос емес екенін тек Egov.kz арқылы тексеруге болады', '⚠️ Проверить доступность номера можно только через Egov.kz')}</p>
    </div>
  )
}

const VIP_NUMBERS = ['001','002','003','004','005','006','007','008','009','777']
const ROUND_NUMBERS = ['010','020','030','040','050','060','070','077','080','090','707']
const SEQUENTIAL_NUMBERS = ['100','111','200','222','300','333','400','444','500','555','600','666','800','888','900','999']

function isPalindrome(d: string) { return d.length === 3 && d[0] === d[2] && d[0] !== d[1] }

function detectCategory(digits: string, letters: string): { id: string; reason: string; reasonRu: string } {
  if (digits.length < 3) return { id: 'basic', reason: '', reasonRu: '' }
  const tl = letters.length >= 3 && letters[0] === letters[1] && letters[1] === letters[2]
  if (VIP_NUMBERS.includes(digits) && tl) return { id: 'vip-triple-letter', reason: `"${digits} ${letters.slice(0,3)}" — VIP + үш әріп (285 АЕК)`, reasonRu: `"${digits} ${letters.slice(0,3)}" — VIP + три буквы (285 МРП)` }
  if (VIP_NUMBERS.includes(digits)) return { id: 'vip', reason: `"${digits}" — VIP нөмір (228 АЕК)`, reasonRu: `"${digits}" — VIP номер (228 МРП)` }
  if (SEQUENTIAL_NUMBERS.includes(digits) && tl) return { id: 'sequential-triple-letter', reason: `"${digits} ${letters.slice(0,3)}" — реттік + үш әріп (194 АЕК)`, reasonRu: `"${digits} ${letters.slice(0,3)}" — последовательный + три буквы (194 МРП)` }
  if (SEQUENTIAL_NUMBERS.includes(digits)) return { id: 'sequential', reason: `"${digits}" — реттік нөмір (137 АЕК)`, reasonRu: `"${digits}" — последовательный номер (137 МРП)` }
  if (ROUND_NUMBERS.includes(digits) && tl) return { id: 'round-triple-letter', reason: `"${digits} ${letters.slice(0,3)}" — дөңгелек + үш әріп (114 АЕК)`, reasonRu: `"${digits} ${letters.slice(0,3)}" — круглый + три буквы (114 МРП)` }
  if (isPalindrome(digits) && tl) return { id: 'palindrome-triple-letter', reason: `"${digits} ${letters.slice(0,3)}" — палиндром + үш әріп (72 АЕК)`, reasonRu: `"${digits} ${letters.slice(0,3)}" — палиндром + три буквы (72 МРП)` }
  if (ROUND_NUMBERS.includes(digits)) return { id: 'round', reason: `"${digits}" — дөңгелек нөмір (57 АЕК)`, reasonRu: `"${digits}" — круглый номер (57 МРП)` }
  if (isPalindrome(digits)) return { id: 'palindrome', reason: `"${digits}" — палиндром нөмір (15 АЕК)`, reasonRu: `"${digits}" — палиндром номер (15 МРП)` }
  return { id: 'basic', reason: 'Қарапайым таңдау (10 АЕК)', reasonRu: 'Обычный выбор (10 МРП)' }
}

export function PlatesPage() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz
  const isRu = lang === 'ru'

  const [digitsPart, setDigitsPart] = useState('')
  const [lettersPart, setLettersPart] = useState('')
  const [regionCode, setRegionCode] = useState('01')

  const digitsRef = useRef<HTMLInputElement>(null)
  const lettersRef = useRef<HTMLInputElement>(null)
  const regionRef = useRef<HTMLSelectElement>(null)

  const region = useMemo(() => PLATE_REGIONS.find(r => r.code === regionCode) ?? PLATE_REGIONS[0], [regionCode])
  const detected = useMemo(() => detectCategory(digitsPart, lettersPart), [digitsPart, lettersPart])
  const detectedCat = PLATE_CATEGORIES.find(c => c.id === detected.id) ?? PLATE_CATEGORIES[0]
  const totalPrice = detectedCat.price + REGISTRATION_FEE
  const hasInput = digitsPart.length >= 3

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">{L('🔢 Авто нөмір бағасы — 2026', '🔢 Цены автономеров — 2026')}</h2>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <InfoChip>{L('Egov.kz бағалары', 'Цены Egov.kz')}</InfoChip>
        <InfoChip>1 {L('АЕК', 'МРП')} = {F(MRP)}₸</InfoChip>
      </div>
      <p className="text-sm text-muted-foreground mb-5">{L('Нөміріңізді енгізіңіз — бағасы автоматты анықталады', 'Введите номер — цена определится автоматически')}</p>

      {/* Context block */}
      <div className="p-4 rounded-xl bg-muted/50 border border-border/50 mb-5 text-sm leading-relaxed text-muted-foreground">
        <p>{L('Нөмір бағасы комбинацияға байланысты. Ең қымбат — VIP нөмірлер (001-009, 777): 228 АЕК = 986 100₸. Стандартты нөмір — тегін (тіркеу кезінде автоматты беріледі). Таңдау нөмірін Egov.kz арқылы онлайн алуға болады.', 'Цена номера зависит от комбинации. Самые дорогие — VIP номера (001-009, 777): 228 МРП = 986 100₸. Стандартный номер — бесплатный (выдаётся автоматически). Номер по выбору можно оформить онлайн через Egov.kz.')}</p>
      </div>

      {/* === REALISTIC KZ PLATE === */}
      <div className="flex justify-center mb-5">
        <div className="w-full max-w-[440px]">
          <div className="relative bg-white rounded-md border-[3px] border-neutral-900 shadow-[0_6px_24px_rgba(0,0,0,0.18)] dark:shadow-[0_6px_24px_rgba(0,0,0,0.6)] px-2 sm:px-4 py-2.5 sm:py-4">

            {/* Number row with flag inline */}
            <div className="flex items-center justify-center">
              {/* KZ flag badge inline */}
              <div className="flex items-center gap-[2px] border border-neutral-400 rounded-[3px] overflow-hidden mr-2 sm:mr-3 flex-shrink-0">
                <div className="w-[26px] h-[18px] sm:w-[30px] sm:h-[20px] bg-[#00AFCA] flex items-center justify-center">
                  <svg viewBox="0 0 30 20" className="w-full h-full">
                    <circle cx="15" cy="8" r="2.8" fill="#FFD700" />
                    <line x1="15" y1="2.5" x2="15" y2="4.8" stroke="#FFD700" strokeWidth="0.7" />
                    <line x1="15" y1="11.2" x2="15" y2="13.5" stroke="#FFD700" strokeWidth="0.7" />
                    <line x1="9.5" y1="8" x2="11.8" y2="8" stroke="#FFD700" strokeWidth="0.7" />
                    <line x1="18.2" y1="8" x2="20.5" y2="8" stroke="#FFD700" strokeWidth="0.7" />
                    <line x1="11.2" y1="4.2" x2="12.8" y2="5.8" stroke="#FFD700" strokeWidth="0.6" />
                    <line x1="17.2" y1="10.2" x2="18.8" y2="11.8" stroke="#FFD700" strokeWidth="0.6" />
                    <line x1="18.8" y1="4.2" x2="17.2" y2="5.8" stroke="#FFD700" strokeWidth="0.6" />
                    <line x1="11.2" y1="11.8" x2="12.8" y2="10.2" stroke="#FFD700" strokeWidth="0.6" />
                    <path d="M13 16 Q15 14 17 16" fill="none" stroke="#FFD700" strokeWidth="0.6" />
                  </svg>
                </div>
                <div className="bg-white px-[3px] flex items-center justify-center h-[18px] sm:h-[20px]">
                  <span className="text-[7px] sm:text-[8px] font-extrabold text-neutral-900 tracking-wider leading-none">KZ</span>
                </div>
              </div>

              {/* Digits */}
              <input
                ref={digitsRef}
                type="text"
                inputMode="numeric"
                placeholder="000"
                value={digitsPart}
                onChange={e => {
                  const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 3)
                  setDigitsPart(v)
                  if (v.length === 3) lettersRef.current?.focus()
                }}
                className="w-[70px] sm:w-[110px] text-center text-[28px] sm:text-[44px] font-mono font-black tracking-[0.1em] bg-transparent outline-none text-neutral-900 placeholder:text-neutral-200 caret-primary min-h-[44px]"
                maxLength={3}
                autoFocus
              />

              {/* Letters */}
              <input
                ref={lettersRef}
                type="text"
                placeholder="AAA"
                value={lettersPart}
                onChange={e => {
                  const v = e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3)
                  setLettersPart(v)
                  if (v.length === 3) regionRef.current?.focus()
                }}
                onKeyDown={e => {
                  if (e.key === 'Backspace' && lettersPart === '') {
                    digitsRef.current?.focus()
                  }
                }}
                className="w-[65px] sm:w-[100px] text-center text-[24px] sm:text-[36px] font-mono font-bold tracking-[0.12em] bg-transparent outline-none text-neutral-900 placeholder:text-neutral-200 caret-primary min-h-[44px]"
                maxLength={3}
              />

              {/* Region — boxed */}
              <div className="border-l-2 border-neutral-300 pl-2 sm:pl-3 ml-1">
                <select
                  ref={regionRef}
                  value={regionCode}
                  onChange={e => setRegionCode(e.target.value)}
                  className="text-[22px] sm:text-[34px] font-mono font-extrabold bg-transparent text-center outline-none cursor-pointer appearance-none text-neutral-900 w-[38px] sm:w-[50px] min-h-[44px]"
                >
                  {PLATE_REGIONS.map(r => (
                    <option key={r.code} value={r.code}>{r.code}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Region name */}
          <p className="text-center text-xs text-muted-foreground mt-2.5">{isRu ? (region.regionRu || region.region) : region.region}</p>
        </div>
      </div>

      {/* Egov buttons */}
      {hasInput && <EgovButtons L={L} />}

      {/* Auto-detected result */}
      {hasInput && (
        <div className="p-5 rounded-2xl border-2 border-primary bg-primary/5 shadow-md mb-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">{detectedCat.icon}</span>
            <div>
              <h3 className="text-base font-bold">{isRu ? (detectedCat.nameRu || detectedCat.name) : detectedCat.name}</h3>
              {(isRu ? detected.reasonRu : detected.reason) && <p className="text-xs text-primary font-medium">{isRu ? detected.reasonRu : detected.reason}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{L('Нөмір бағасы', 'Цена номера')} ({detectedCat.mrp} {L('АЕК', 'МРП')})</span>
              <span className="font-semibold">{F(detectedCat.price)} ₸</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{L('Тіркеу алымы', 'Регистрационный сбор')} (1.25 {L('АЕК', 'МРП')})</span>
              <span className="font-semibold">{F(REGISTRATION_FEE)} ₸</span>
            </div>
            <div className="border-t-2 border-primary/30 pt-2 flex justify-between items-end">
              <span className="font-bold text-sm">{L('Жалпы сома', 'Итого')}</span>
              <span className="text-2xl font-extrabold text-primary">{F(totalPrice)} ₸</span>
            </div>
          </div>
        </div>
      )}

      {/* All categories */}
      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3 mt-2">{L('Барлық санаттар (Egov.kz бағалары)', 'Все категории (цены Egov.kz)')}</h3>
      <div className="space-y-2 mb-5">
        {PLATE_CATEGORIES.map(cat => {
          const isDetected = hasInput && cat.id === detected.id
          return (
            <div key={cat.id} className={`p-3.5 rounded-2xl border transition-all ${isDetected ? 'border-primary bg-primary/5 shadow-md' : 'border-border/60 bg-card/80 backdrop-blur-xl shadow-sm'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">{cat.icon}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold truncate">{isRu ? (cat.nameRu || cat.name) : cat.name}</span>
                      {isDetected && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">{L('СІЗДІКІ', 'ВАШ')}</span>}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{cat.description}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-bold text-primary">{F(cat.price)} ₸</p>
                  <p className="text-[10px] text-muted-foreground">{cat.mrp} {L('АЕК', 'МРП')}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <TipBox>
        {L('Нөмірді Egov.kz арқылы онлайн таңдауға болады. Астана/Алматы — 5 жұмыс күні, аймақтар — 15 жұмыс күні. Нақты бағаны Egov.kz-де тексеріңіз.', 'Номер можно выбрать онлайн через Egov.kz. Астана/Алматы — 5 рабочих дней, регионы — 15 рабочих дней. Уточняйте цену на Egov.kz.')}
      </TipBox>

      <ShareBar tool="plates" text={L('Авто нөмір бағалары 2026 — Quralhub', 'Цены автономеров 2026 — Quralhub')} />
    </div>
  )
}
