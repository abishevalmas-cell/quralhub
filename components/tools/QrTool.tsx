'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { BackButton } from '@/components/layout/BackButton'
import { ShareBar } from '@/components/shared/ShareBar'
import { TipBox } from '@/components/shared/TipBox'
import { InfoChip } from '@/components/shared/InfoChip'
import { useApp } from '@/components/layout/Providers'

type QrTab = 'url' | 'wifi' | 'whatsapp' | 'phone'

export function QrTool() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const tabs: { key: QrTab; label: string }[] = [
    { key: 'url', label: 'URL' },
    { key: 'wifi', label: 'WiFi' },
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'phone', label: L('Телефон', 'Телефон') },
  ]

  const [tab, setTab] = useState<QrTab>('url')
  const [url, setUrl] = useState('https://quralhub.kz')
  const [wifiSsid, setWifiSsid] = useState('')
  const [wifiPass, setWifiPass] = useState('')
  const [wifiEnc, setWifiEnc] = useState<'WPA' | 'WEP' | 'nopass'>('WPA')
  const [waPhone, setWaPhone] = useState('')
  const [waText, setWaText] = useState('')
  const [phone, setPhone] = useState('')

  function getQrData(): string {
    switch (tab) {
      case 'url':
        return url
      case 'wifi':
        return `WIFI:T:${wifiEnc};S:${wifiSsid};P:${wifiPass};;`
      case 'whatsapp':
        const num = waPhone.replace(/[^0-9]/g, '')
        return `https://wa.me/${num}${waText ? `?text=${encodeURIComponent(waText)}` : ''}`
      case 'phone':
        return `tel:${phone}`
    }
  }

  const data = getQrData()
  const qrUrl = data
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(data)}&color=0B8A6B`
    : ''

  const handleDownload = () => {
    if (!qrUrl) return
    const a = document.createElement('a')
    a.href = qrUrl
    a.download = 'quralhub-qr.png'
    a.click()
  }

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">{L('▣ QR-код генераторы', '▣ Генератор QR-кодов')}</h2>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <InfoChip>{L('Тегін', 'Бесплатно')}</InfoChip>
        <InfoChip>{L('4 режим', '4 режима')}</InfoChip>
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{L('URL, WiFi, WhatsApp немесе телефон нөміріне QR-код жасаңыз', 'Создайте QR-код для URL, WiFi, WhatsApp или телефона')}</p>

      <div className="flex gap-2 mb-4 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              tab === t.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-muted-foreground hover:border-primary hover:text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-3 mb-4">
        {tab === 'url' && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('URL мекенжайы', 'URL адрес')}</label>
            <Input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="text-base"
            />
          </div>
        )}

        {tab === 'wifi' && (
          <>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Wi-Fi атауы (SSID)', 'Имя Wi-Fi (SSID)')}</label>
              <Input
                type="text"
                value={wifiSsid}
                onChange={e => setWifiSsid(e.target.value)}
                placeholder="MyWiFi"
                className="text-base"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Құпия сөз', 'Пароль')}</label>
              <Input
                type="text"
                value={wifiPass}
                onChange={e => setWifiPass(e.target.value)}
                placeholder="password123"
                className="text-base"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Шифрлау', 'Шифрование')}</label>
              <select
                className="w-full px-3 py-3 bg-card border border-border rounded-xl text-sm outline-none focus:border-primary"
                value={wifiEnc}
                onChange={e => setWifiEnc(e.target.value as 'WPA' | 'WEP' | 'nopass')}
              >
                <option value="WPA">WPA/WPA2</option>
                <option value="WEP">WEP</option>
                <option value="nopass">{L('Ашық (құпия сөзсіз)', 'Открытая (без пароля)')}</option>
              </select>
            </div>
          </>
        )}

        {tab === 'whatsapp' && (
          <>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Телефон нөмірі', 'Номер телефона')}</label>
              <Input
                type="tel"
                value={waPhone}
                onChange={e => setWaPhone(e.target.value)}
                placeholder="+7 777 123 4567"
                className="text-base"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Хабарлама (міндетті емес)', 'Сообщение (необязательно)')}</label>
              <Input
                type="text"
                value={waText}
                onChange={e => setWaText(e.target.value)}
                placeholder={L('Сәлеметсіз бе!', 'Здравствуйте!')}
                className="text-base"
              />
            </div>
          </>
        )}

        {tab === 'phone' && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Телефон нөмірі', 'Номер телефона')}</label>
            <Input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+7 777 123 4567"
              className="text-base"
            />
          </div>
        )}
      </div>

      {data && (
        <div className="flex flex-col items-center">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl}
              alt="QR код"
              width={250}
              height={250}
              className="rounded-lg"
            />
          </div>
          <button
            onClick={handleDownload}
            className="mt-4 py-3 px-6 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all"
          >
            {L('Жүктеп алу', 'Скачать')}
          </button>
        </div>
      )}

      <TipBox>
        {L('QR-код тегін жасалады. Телефон камерасымен сканерлеңіз.', 'QR-код создаётся бесплатно. Отсканируйте камерой телефона.')}
      </TipBox>

      <ShareBar tool="qr" text={L('QR-код генераторы — Quralhub', 'Генератор QR-кодов — Quralhub')} />
    </div>
  )
}
