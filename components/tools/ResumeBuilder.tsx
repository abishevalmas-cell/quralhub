'use client'
import { useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { BackButton } from '@/components/layout/BackButton'
import { ShareBar } from '@/components/shared/ShareBar'
import { TipBox } from '@/components/shared/TipBox'
import { InfoChip } from '@/components/shared/InfoChip'
import { useApp } from '@/components/layout/Providers'

type TemplateName = 'classic' | 'modern' | 'minimal'

interface EduEntry {
  school: string
  major: string
  years: string
  degree: string
}

interface ExpEntry {
  company: string
  position: string
  years: string
  duties: string
}

const TEMPLATE_COLORS: Record<TemplateName, string> = {
  classic: '#1a5276',
  modern: '#0B8A6B',
  minimal: '#333333',
}

export function ResumeBuilder() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const TEMPLATE_LABELS: Record<TemplateName, string> = {
    classic: L('Классикалық', 'Классический'),
    modern: L('Заманауи', 'Современный'),
    minimal: L('Минималист', 'Минималист'),
  }

  const [template, setTemplate] = useState<TemplateName>('modern')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [goal, setGoal] = useState('')

  const [education, setEducation] = useState<EduEntry[]>([
    { school: '', major: '', years: '', degree: '' },
  ])
  const [experience, setExperience] = useState<ExpEntry[]>([
    { company: '', position: '', years: '', duties: '' },
  ])
  const [skills, setSkills] = useState('')
  const [extra, setExtra] = useState('')

  const [showPreview, setShowPreview] = useState(false)
  const [copied, setCopied] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  const addEducation = () => {
    setEducation(prev => [...prev, { school: '', major: '', years: '', degree: '' }])
  }

  const updateEducation = (idx: number, field: keyof EduEntry, value: string) => {
    setEducation(prev => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)))
  }

  const addExperience = () => {
    setExperience(prev => [...prev, { company: '', position: '', years: '', duties: '' }])
  }

  const updateExperience = (idx: number, field: keyof ExpEntry, value: string) => {
    setExperience(prev => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)))
  }

  const accent = TEMPLATE_COLORS[template]

  const eduLabel = L('Білімі', 'Образование')
  const expLabel = L('Тәжірибе', 'Опыт')
  const skillsLabel = L('Дағдылар', 'Навыки')
  const extraLabel = L('Қосымша', 'Дополнительно')

  const generatePlainText = () => {
    let text = `${fullName}\n${goal}\n\n`
    text += `${L('Телефон', 'Телефон')}: ${phone} | Email: ${email} | ${L('Қала', 'Город')}: ${city} | ${L('Туған жылы', 'Год рождения')}: ${birthYear}\n\n`
    text += `=== ${eduLabel.toUpperCase()} ===\n`
    education.forEach(e => {
      if (e.school) text += `${e.school} — ${e.major} (${e.years}) ${e.degree}\n`
    })
    text += `\n=== ${expLabel.toUpperCase()} ===\n`
    experience.forEach(e => {
      if (e.company) text += `${e.company} — ${e.position} (${e.years})\n${e.duties}\n\n`
    })
    text += `=== ${skillsLabel.toUpperCase()} ===\n${skills}\n\n`
    if (extra) text += `=== ${extraLabel.toUpperCase()} ===\n${extra}\n`
    return text
  }

  const handleCopy = () => {
    navigator.clipboard?.writeText(generatePlainText())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePrint = () => {
    if (!previewRef.current) return
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>CV — ${fullName}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#333;line-height:1.6;padding:0;}
  .header{background:${accent};color:white;padding:30px 40px;}
  .header h1{font-size:28px;margin-bottom:4px;}
  .header p{font-size:13px;opacity:0.9;}
  .contacts{display:flex;gap:16px;margin-top:10px;font-size:12px;opacity:0.85;flex-wrap:wrap;}
  .body{padding:30px 40px;}
  .section{margin-bottom:24px;}
  .section h2{font-size:16px;color:${accent};border-bottom:2px solid ${accent};padding-bottom:4px;margin-bottom:10px;text-transform:uppercase;letter-spacing:1px;}
  .entry{margin-bottom:10px;}
  .entry-title{font-weight:bold;font-size:14px;}
  .entry-sub{font-size:12px;color:#666;}
  .entry-desc{font-size:13px;margin-top:3px;}
  .skills{display:flex;flex-wrap:wrap;gap:6px;}
  .skill{background:${accent}15;color:${accent};padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;}
  @media print{body{padding:0;}.header{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
</style></head><body>
<div class="header">
  <h1>${fullName || L('Аты-жөні', 'ФИО')}</h1>
  <p>${goal}</p>
  <div class="contacts">
    <span>${phone}</span><span>${email}</span><span>${city}</span><span>${birthYear}</span>
  </div>
</div>
<div class="body">
  <div class="section"><h2>${eduLabel}</h2>
    ${education.filter(e => e.school).map(e => `<div class="entry"><div class="entry-title">${e.school}</div><div class="entry-sub">${e.major} | ${e.years} | ${e.degree}</div></div>`).join('')}
  </div>
  <div class="section"><h2>${expLabel}</h2>
    ${experience.filter(e => e.company).map(e => `<div class="entry"><div class="entry-title">${e.company} — ${e.position}</div><div class="entry-sub">${e.years}</div><div class="entry-desc">${e.duties}</div></div>`).join('')}
  </div>
  <div class="section"><h2>${skillsLabel}</h2>
    <div class="skills">${skills.split(',').filter(s => s.trim()).map(s => `<span class="skill">${s.trim()}</span>`).join('')}</div>
  </div>
  ${extra ? `<div class="section"><h2>${extraLabel}</h2><p style="font-size:13px;">${extra}</p></div>` : ''}
</div></body></html>`)
      win.document.close()
      win.print()
    }
  }

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">{L('📝 Түйіндеме конструкторы', '📝 Конструктор резюме')}</h2>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <InfoChip>{L('3 үлгі', '3 шаблона')}</InfoChip>
        <InfoChip>{L('Қазақша CV', 'CV на казахском')}</InfoChip>
        <InfoChip>{L('Басып шығару', 'Печать')}</InfoChip>
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
        {L('Қазақ тілінде кәсіби түйіндеме жасаңыз', 'Создайте профессиональное резюме')}
      </p>

      {/* Template selection */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(Object.keys(TEMPLATE_LABELS) as TemplateName[]).map(t => (
          <button
            key={t}
            onClick={() => setTemplate(t)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              template === t
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-muted-foreground hover:border-primary hover:text-primary'
            }`}
          >
            {TEMPLATE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Basic info */}
      <div className="space-y-3 mb-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Аты-жөні', 'Ф.И.О.')}</label>
          <Input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder={L('Абай Қасымов', 'Абай Касымов')} className="text-base" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Телефон', 'Телефон')}</label>
            <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7 777 123 4567" className="text-base" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Email</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="abai@mail.kz" className="text-base" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Қала', 'Город')}</label>
            <Input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder={L('Астана', 'Астана')} className="text-base" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Туған жылы', 'Год рождения')}</label>
            <Input type="text" value={birthYear} onChange={e => setBirthYear(e.target.value)} placeholder="1995" className="text-base" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Мақсат / Қызығушылық', 'Цель / Интересы')}</label>
          <Input type="text" value={goal} onChange={e => setGoal(e.target.value)} placeholder={L('Frontend Developer позициясына...', 'На позицию Frontend Developer...')} className="text-base" />
        </div>
      </div>

      {/* Education */}
      <div className="mb-4">
        <h3 className="text-sm font-bold mb-2">{eduLabel}</h3>
        {education.map((edu, idx) => (
          <div key={idx} className="grid grid-cols-2 gap-3 mb-3 p-3 bg-card border border-border rounded-xl">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">{L('Оқу орны', 'Учебное заведение')}</label>
              <Input type="text" value={edu.school} onChange={e => updateEducation(idx, 'school', e.target.value)} placeholder={L('ЕНУ', 'ЕНУ')} className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">{L('Мамандық', 'Специальность')}</label>
              <Input type="text" value={edu.major} onChange={e => updateEducation(idx, 'major', e.target.value)} placeholder={L('Информатика', 'Информатика')} className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">{L('Жылдар', 'Годы')}</label>
              <Input type="text" value={edu.years} onChange={e => updateEducation(idx, 'years', e.target.value)} placeholder="2013-2017" className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">{L('Дәреже', 'Степень')}</label>
              <Input type="text" value={edu.degree} onChange={e => updateEducation(idx, 'degree', e.target.value)} placeholder={L('Бакалавр', 'Бакалавр')} className="text-sm" />
            </div>
          </div>
        ))}
        <button
          onClick={addEducation}
          className="text-sm text-primary font-semibold hover:underline"
        >
          + {L('Білім қосу', 'Добавить образование')}
        </button>
      </div>

      {/* Experience */}
      <div className="mb-4">
        <h3 className="text-sm font-bold mb-2">{expLabel}</h3>
        {experience.map((exp, idx) => (
          <div key={idx} className="grid grid-cols-2 gap-3 mb-3 p-3 bg-card border border-border rounded-xl">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">{L('Компания', 'Компания')}</label>
              <Input type="text" value={exp.company} onChange={e => updateExperience(idx, 'company', e.target.value)} placeholder="Kaspi.kz" className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">{L('Лауазым', 'Должность')}</label>
              <Input type="text" value={exp.position} onChange={e => updateExperience(idx, 'position', e.target.value)} placeholder="Developer" className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">{L('Жылдар', 'Годы')}</label>
              <Input type="text" value={exp.years} onChange={e => updateExperience(idx, 'years', e.target.value)} placeholder="2017-2020" className="text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">{L('Міндеттер', 'Обязанности')}</label>
              <textarea
                className="w-full px-3 py-2 bg-card border border-border rounded-xl text-sm outline-none focus:border-primary min-h-[60px] resize-y"
                value={exp.duties}
                onChange={e => updateExperience(idx, 'duties', e.target.value)}
                placeholder={L('Негізгі міндеттер...', 'Основные обязанности...')}
              />
            </div>
          </div>
        ))}
        <button
          onClick={addExperience}
          className="text-sm text-primary font-semibold hover:underline"
        >
          + {L('Тәжірибе қосу', 'Добавить опыт')}
        </button>
      </div>

      {/* Skills */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Дағдылар (үтірмен бөліңіз)', 'Навыки (через запятую)')}</label>
        <Input type="text" value={skills} onChange={e => setSkills(e.target.value)} placeholder="JavaScript, React, Python, SQL" className="text-base" />
      </div>

      {/* Extra */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Қосымша ақпарат', 'Дополнительная информация')}</label>
        <textarea
          className="w-full px-3 py-3 bg-card border border-border rounded-xl text-sm outline-none focus:border-primary min-h-[60px] resize-y"
          value={extra}
          onChange={e => setExtra(e.target.value)}
          placeholder={L('Тілдер, сертификаттар, хобби...', 'Языки, сертификаты, хобби...')}
        />
      </div>

      <button
        onClick={() => setShowPreview(true)}
        className="w-full py-3 px-6 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all mb-4"
      >
        {L('Алдын ала көру', 'Предпросмотр')}
      </button>

      {/* Preview */}
      {showPreview && (
        <div className="mt-4 animate-in fade-in slide-in-from-bottom-1 duration-300">
          <div ref={previewRef} className="border border-border rounded-2xl overflow-hidden shadow-sm">
            {/* Header */}
            <div className="p-6 text-white" style={{ backgroundColor: accent }}>
              <h3 className="text-xl font-bold">{fullName || L('Аты-жөні', 'ФИО')}</h3>
              <p className="text-sm opacity-90 mt-1">{goal}</p>
              <div className="flex flex-wrap gap-3 mt-2 text-xs opacity-80">
                {phone && <span>{phone}</span>}
                {email && <span>{email}</span>}
                {city && <span>{city}</span>}
                {birthYear && <span>{birthYear}</span>}
              </div>
            </div>

            <div className="p-6 space-y-5 bg-white dark:bg-card">
              {/* Education */}
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider pb-1 mb-3" style={{ color: accent, borderBottom: `2px solid ${accent}` }}>
                  {eduLabel}
                </h4>
                {education.filter(e => e.school).map((edu, i) => (
                  <div key={i} className="mb-2">
                    <p className="font-bold text-sm">{edu.school}</p>
                    <p className="text-xs text-muted-foreground">{edu.major} | {edu.years} | {edu.degree}</p>
                  </div>
                ))}
              </div>

              {/* Experience */}
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider pb-1 mb-3" style={{ color: accent, borderBottom: `2px solid ${accent}` }}>
                  {expLabel}
                </h4>
                {experience.filter(e => e.company).map((exp, i) => (
                  <div key={i} className="mb-3">
                    <p className="font-bold text-sm">{exp.company} — {exp.position}</p>
                    <p className="text-xs text-muted-foreground">{exp.years}</p>
                    <p className="text-sm mt-1">{exp.duties}</p>
                  </div>
                ))}
              </div>

              {/* Skills */}
              {skills && (
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider pb-1 mb-3" style={{ color: accent, borderBottom: `2px solid ${accent}` }}>
                    {skillsLabel}
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.split(',').filter(s => s.trim()).map((s, i) => (
                      <span
                        key={i}
                        className="text-xs px-3 py-1 rounded-full font-semibold"
                        style={{ backgroundColor: accent + '15', color: accent }}
                      >
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Extra */}
              {extra && (
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider pb-1 mb-3" style={{ color: accent, borderBottom: `2px solid ${accent}` }}>
                    {extraLabel}
                  </h4>
                  <p className="text-sm">{extra}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={handleCopy}
              className="flex-1 py-3 px-4 rounded-full text-sm font-semibold bg-card border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all"
            >
              {copied ? L('Көшірілді!', 'Скопировано!') : L('Мәтін көшіру', 'Скопировать текст')}
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 py-3 px-4 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all"
            >
              {L('Басып шығару', 'Печать')}
            </button>
          </div>
        </div>
      )}

      <TipBox>
        {L('Түйіндемені толтырғаннан кейін «Басып шығару» батырмасымен PDF ретінде сақтауға болады (браузер Print диалогында).', 'После заполнения резюме можно сохранить как PDF через кнопку «Печать» (в диалоге печати браузера).')}
      </TipBox>

      <ShareBar tool="resume" text={L('Түйіндеме конструкторы — Quralhub', 'Конструктор резюме — Quralhub')} />
    </div>
  )
}
