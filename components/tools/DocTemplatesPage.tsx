'use client'
import { useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { BackButton } from '@/components/layout/BackButton'
import { ShareBar } from '@/components/shared/ShareBar'
import { TipBox } from '@/components/shared/TipBox'
import { InfoChip } from '@/components/shared/InfoChip'
import { useApp } from '@/components/layout/Providers'
import { generateDocx } from '@/lib/docx/generateDocx'
import {
  CT_FIELDS,
  CONTRACT_TYPE_LABELS,
  generateContract,
  type ContractType,
  type ContractField,
} from '@/lib/data/contracts'

// ============================================================
// TAB 1: Document Templates (existing functionality preserved)
// ============================================================

interface Template {
  name: string
  nameRu: string
  fields: string[]
  template: string
}

interface Category {
  label: string
  labelRu: string
  templates: Record<string, Template>
}

const CATEGORIES: Record<string, Category> = {
  personal: {
    label: 'Жеке құжаттар',
    labelRu: 'Личные документы',
    templates: {
      'app-hire': {
        name: 'Жұмысқа қабылдау туралы өтініш',
        nameRu: 'Заявление о приёме на работу',
        fields: ['boss_title', 'boss_name', 'applicant_name', 'position', 'date'],
        template: `                                                {boss_title}
                                                {boss_name}
                                                {applicant_name}

ӨТІНІШ

Мені {date} күнінен бастап {position} лауазымына қабылдауыңызды сұраймын.

Қосымша: 1. Жеке куәлік көшірмесі
         2. Білімі туралы диплом көшірмесі

{date}                                              {applicant_name}`,
      },
      'app-resign': {
        name: 'Жұмыстан босату туралы өтініш',
        nameRu: 'Заявление об увольнении',
        fields: ['boss_title', 'boss_name', 'employee_name', 'date', 'reason'],
        template: `                                                {boss_title}
                                                {boss_name}
                                                {employee_name}

ӨТІНІШ

Мені {date} күнінен бастап атқарып жүрген лауазымымнан {reason} босатуыңызды сұраймын.

{date}                                              {employee_name}`,
      },
      'app-leave': {
        name: 'Демалыс туралы өтініш',
        nameRu: 'Заявление на отпуск',
        fields: ['boss_title', 'boss_name', 'employee_name', 'leave_start', 'leave_end'],
        template: `                                                {boss_title}
                                                {boss_name}
                                                {employee_name}

ӨТІНІШ

Маған {leave_start} бастап {leave_end} дейін жыл сайынғы демалыс беруіңізді сұраймын.

{leave_start}                                       {employee_name}`,
      },
    },
  },
  hr: {
    label: 'Кадр бұйрықтары',
    labelRu: 'Кадровые приказы',
    templates: {
      'order-hire': {
        name: 'Жұмысқа қабылдау бұйрығы',
        nameRu: 'Приказ о приёме на работу',
        fields: ['org_name', 'order_num', 'date', 'employee_name', 'position', 'department', 'salary', 'boss_name'],
        template: `{org_name}

БҰЙРЫҚ                                           №{order_num}
{date}

Жұмысқа қабылдау туралы

{employee_name} {date} күнінен бастап {department} бөліміне {position} лауазымына {salary} теңге жалақымен қабылдансын.

Негіз: жеке өтініші, еңбек шарты.

Басшы                                        {boss_name}`,
      },
      'order-fire': {
        name: 'Жұмыстан босату бұйрығы',
        nameRu: 'Приказ об увольнении',
        fields: ['org_name', 'order_num', 'date', 'employee_name', 'position', 'reason', 'boss_name'],
        template: `{org_name}

БҰЙРЫҚ                                           №{order_num}
{date}

Жұмыстан босату туралы

{employee_name} {position} лауазымынан {date} күнінен бастап {reason} босатылсын.

Негіз: жеке өтініші.

Басшы                                        {boss_name}`,
      },
    },
  },
  letter: {
    label: 'Іскери хат',
    labelRu: 'Деловое письмо',
    templates: {
      'letter-request': {
        name: 'Сұраныс хат',
        nameRu: 'Письмо-запрос',
        fields: ['org_name', 'to_org', 'to_person', 'subject', 'content', 'sender_name', 'date'],
        template: `{org_name}

{to_org}
{to_person}

{subject} туралы

Құрметті {to_person}!

{content}

Алдын ала алғысымызды білдіреміз.

Құрметпен,
{sender_name}
{date}`,
      },
    },
  },
}

const DOC_FIELD_LABELS: Record<string, [string, string]> = {
  boss_title: ['Басшы лауазымы', 'Должность руководителя'],
  boss_name: ['Басшы аты-жөні', 'ФИО руководителя'],
  applicant_name: ['Өтініш беруші', 'Заявитель'],
  employee_name: ['Қызметкер аты-жөні', 'ФИО сотрудника'],
  position: ['Лауазымы', 'Должность'],
  date: ['Күні', 'Дата'],
  reason: ['Себебі', 'Причина'],
  org_name: ['Ұйым атауы', 'Название организации'],
  order_num: ['Бұйрық нөмірі', 'Номер приказа'],
  department: ['Бөлім', 'Отдел'],
  salary: ['Жалақы (₸)', 'Зарплата (₸)'],
  leave_start: ['Демалыс басталуы', 'Начало отпуска'],
  leave_end: ['Демалыс аяқталуы', 'Конец отпуска'],
  to_org: ['Кімге (ұйым)', 'Кому (организация)'],
  to_person: ['Кімге (аты-жөні)', 'Кому (ФИО)'],
  subject: ['Тақырып', 'Тема'],
  content: ['Мазмұны', 'Содержание'],
  sender_name: ['Жіберуші аты-жөні', 'ФИО отправителя'],
}

// ============================================================
// Main Component
// ============================================================

type MainTab = 'docs' | 'contracts'

export function DocTemplatesPage() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz
  const isRu = lang === 'ru'

  const [mainTab, setMainTab] = useState<MainTab>('docs')

  // ---- Document Templates state ----
  const [categoryKey, setCategoryKey] = useState('personal')
  const [templateKey, setTemplateKey] = useState('app-hire')
  const [docFieldValues, setDocFieldValues] = useState<Record<string, string>>({})
  const [docGeneratedText, setDocGeneratedText] = useState('')
  const [docCopied, setDocCopied] = useState(false)

  // ---- Contract Templates state ----
  const [contractType, setContractType] = useState<ContractType>('rent')
  const [contractLang, setContractLang] = useState<'kk' | 'ru'>('kk')
  const [contractFieldValues, setContractFieldValues] = useState<Record<string, string>>({})
  const [contractGeneratedText, setContractGeneratedText] = useState('')
  const [contractCopied, setContractCopied] = useState(false)

  const preRef = useRef<HTMLPreElement>(null)

  // ---- Document Templates handlers ----
  const category = CATEGORIES[categoryKey]
  const templateKeys = Object.keys(category.templates)
  const currentTemplate = category.templates[templateKey]

  const getFieldLabel = (field: string) => {
    const pair = DOC_FIELD_LABELS[field]
    if (!pair) return field
    return isRu ? pair[1] : pair[0]
  }

  const handleCategoryChange = (key: string) => {
    setCategoryKey(key)
    const firstTpl = Object.keys(CATEGORIES[key].templates)[0]
    setTemplateKey(firstTpl)
    setDocFieldValues({})
    setDocGeneratedText('')
  }

  const handleTemplateChange = (key: string) => {
    setTemplateKey(key)
    setDocFieldValues({})
    setDocGeneratedText('')
  }

  const handleDocFieldChange = (field: string, value: string) => {
    setDocFieldValues(prev => ({ ...prev, [field]: value }))
  }

  const handleDocGenerate = () => {
    if (!currentTemplate) return
    let text = currentTemplate.template
    for (const field of currentTemplate.fields) {
      const val = docFieldValues[field] || `[${getFieldLabel(field)}]`
      text = text.replace(new RegExp(`\\{${field}\\}`, 'g'), val)
    }
    setDocGeneratedText(text)
  }

  const handleDocCopy = () => {
    if (docGeneratedText) {
      navigator.clipboard?.writeText(docGeneratedText)
      setDocCopied(true)
      setTimeout(() => setDocCopied(false), 2000)
    }
  }

  // ---- Contract Templates handlers ----
  const handleContractTypeChange = (tp: ContractType) => {
    setContractType(tp)
    setContractFieldValues({})
    setContractGeneratedText('')
  }

  const handleContractFieldChange = (id: string, value: string) => {
    setContractFieldValues(prev => ({ ...prev, [id]: value }))
  }

  const handleContractGenerate = () => {
    const text = generateContract(contractType, contractLang, contractFieldValues)
    setContractGeneratedText(text)
  }

  const handleContractCopy = () => {
    if (contractGeneratedText) {
      navigator.clipboard?.writeText(contractGeneratedText)
      setContractCopied(true)
      setTimeout(() => setContractCopied(false), 2000)
    }
  }

  const handlePrint = (text: string) => {
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${L('Құжат', 'Документ')}</title>
<style>body{font-family:'Times New Roman',serif;font-size:14pt;white-space:pre-wrap;padding:40px 60px;line-height:1.8;}@media print{body{padding:20px;}}</style>
</head><body>${text}</body></html>`)
      win.document.close()
      win.print()
    }
  }

  const contractFields: ContractField[] = CT_FIELDS[contractType] || []

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">{L('Құжат үлгілері мен шарт шаблондары', 'Шаблоны документов и договоров')}</h2>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <InfoChip>{L('3 санат', '3 категории')}</InfoChip>
        <InfoChip>{L('6 үлгі', '6 шаблонов')}</InfoChip>
        <InfoChip>{L('8 шарт түрі', '8 типов договоров')}</InfoChip>
        <InfoChip>{L('Қазақша / Орысша', 'Казахский / Русский')}</InfoChip>
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
        {L('Ресми құжаттар мен шарт шаблондарын толтырып, басып шығарыңыз', 'Заполните и распечатайте шаблоны документов и договоров')}
      </p>

      {/* Main Tabs */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setMainTab('docs')}
          className={`flex-1 py-3 px-4 rounded-full text-sm font-semibold transition-all ${
            mainTab === 'docs'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card border border-border text-muted-foreground hover:border-primary hover:text-primary'
          }`}
        >
          {L('Құжат үлгілері', 'Шаблоны документов')}
        </button>
        <button
          onClick={() => setMainTab('contracts')}
          className={`flex-1 py-3 px-4 rounded-full text-sm font-semibold transition-all ${
            mainTab === 'contracts'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card border border-border text-muted-foreground hover:border-primary hover:text-primary'
          }`}
        >
          {L('Шарт шаблондары', 'Шаблоны договоров')}
        </button>
      </div>

      {/* ============================================ */}
      {/* TAB 1: Document Templates                    */}
      {/* ============================================ */}
      {mainTab === 'docs' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Санат', 'Категория')}</label>
              <select
                className="w-full px-3 py-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:border-primary"
                value={categoryKey}
                onChange={e => handleCategoryChange(e.target.value)}
              >
                {Object.entries(CATEGORIES).map(([key, cat]) => (
                  <option key={key} value={key}>{isRu ? cat.labelRu : cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Үлгі', 'Шаблон')}</label>
              <select
                className="w-full px-3 py-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:border-primary"
                value={templateKey}
                onChange={e => handleTemplateChange(e.target.value)}
              >
                {templateKeys.map(key => (
                  <option key={key} value={key}>{isRu ? category.templates[key].nameRu : category.templates[key].name}</option>
                ))}
              </select>
            </div>
          </div>

          {currentTemplate && (
            <div className="space-y-3 mb-4">
              {currentTemplate.fields.map(field => (
                <div key={field}>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                    {getFieldLabel(field)}
                  </label>
                  {field === 'content' ? (
                    <textarea
                      className="w-full px-3 py-3 bg-card border border-border rounded-xl text-sm outline-none focus:border-primary min-h-[80px] resize-y"
                      value={docFieldValues[field] || ''}
                      onChange={e => handleDocFieldChange(field, e.target.value)}
                      placeholder={getFieldLabel(field)}
                    />
                  ) : (
                    <Input
                      type="text"
                      value={docFieldValues[field] || ''}
                      onChange={e => handleDocFieldChange(field, e.target.value)}
                      placeholder={getFieldLabel(field)}
                      className="text-base"
                    />
                  )}
                </div>
              ))}

              <button
                onClick={handleDocGenerate}
                className="w-full py-3 px-6 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all"
              >
                {L('Құжатты жасау', 'Создать документ')}
              </button>
            </div>
          )}

          {docGeneratedText && (
            <div className="mt-4">
              <div className="bg-white dark:bg-card border border-border rounded-2xl p-5 shadow-sm">
                <pre
                  ref={preRef}
                  className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-foreground"
                >
                  {docGeneratedText}
                </pre>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleDocCopy}
                  className="flex-1 py-3 px-4 rounded-full text-sm font-semibold bg-card border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all"
                >
                  {docCopied ? L('Көшірілді!', 'Скопировано!') : L('Көшіру', 'Скопировать')}
                </button>
                <button
                  onClick={() => generateDocx({
                    title: isRu ? currentTemplate.nameRu : currentTemplate.name,
                    content: docGeneratedText,
                    fileName: `quralhub-${templateKey}`,
                  })}
                  className="flex-1 py-3 px-4 rounded-full text-sm font-semibold bg-card border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all"
                >
                  {L('\ud83d\udce5 Word жүктеу', '\ud83d\udce5 Скачать Word')}
                </button>
                <button
                  onClick={() => handlePrint(docGeneratedText)}
                  className="flex-1 py-3 px-4 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all"
                >
                  {L('Басып шығару', 'Печать')}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============================================ */}
      {/* TAB 2: Contract Templates                    */}
      {/* ============================================ */}
      {mainTab === 'contracts' && (
        <>
          {/* Contract type selector */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">{L('Шарт түрі', 'Тип договора')}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.keys(CONTRACT_TYPE_LABELS) as ContractType[]).map(tp => {
                const info = CONTRACT_TYPE_LABELS[tp]
                const isActive = contractType === tp
                return (
                  <button
                    key={tp}
                    onClick={() => handleContractTypeChange(tp)}
                    className={`py-2.5 px-3 rounded-xl text-sm font-medium text-left transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-border text-foreground hover:border-primary'
                    }`}
                  >
                    <span className="mr-1.5">{info.emoji}</span>
                    {contractLang === 'ru' ? info.ru : info.kk}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Language selector */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Тіл / Язык', 'Язык / Тіл')}</label>
            <div className="flex gap-2">
              <button
                onClick={() => { setContractLang('kk'); setContractGeneratedText('') }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
                  contractLang === 'kk'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border text-muted-foreground hover:border-primary'
                }`}
              >
                {L('Қазақша', 'Казахский')}
              </button>
              <button
                onClick={() => { setContractLang('ru'); setContractGeneratedText('') }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
                  contractLang === 'ru'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border text-muted-foreground hover:border-primary'
                }`}
              >
                {L('Орысша', 'Русский')}
              </button>
            </div>
          </div>

          {/* Dynamic form fields */}
          <div className="space-y-3 mb-4">
            {contractFields.map(f => {
              const label = contractLang === 'ru' ? (f.lru || f.l) : f.l
              const ph = contractLang === 'ru' ? (f.phru || f.ph) : f.ph
              const isNumeric = f.ph && /^\d+$/.test(f.ph)
              return (
                <div key={f.id}>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                    {label}
                  </label>
                  <Input
                    type={f.tp || 'text'}
                    value={contractFieldValues[f.id] || (f.tp === 'date' ? f.ph : '')}
                    onChange={e => handleContractFieldChange(f.id, e.target.value)}
                    placeholder={ph}
                    inputMode={isNumeric ? 'numeric' : 'text'}
                    className="text-base"
                  />
                </div>
              )
            })}

            <button
              onClick={handleContractGenerate}
              className="w-full py-3 px-6 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all"
            >
              {contractLang === 'ru' ? L('Создать договор', 'Создать договор') : L('Шарт жасау', 'Шарт жасау')}
            </button>
          </div>

          {/* Generated contract preview */}
          {contractGeneratedText && (
            <div className="mt-4">
              <div className="bg-white dark:bg-card border border-border rounded-2xl p-5 shadow-sm">
                <pre
                  className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-foreground"
                >
                  {contractGeneratedText}
                </pre>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleContractCopy}
                  className="flex-1 py-3 px-4 rounded-full text-sm font-semibold bg-card border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all"
                >
                  {contractCopied
                    ? (contractLang === 'ru' ? L('Скопировано!', 'Скопировано!') : L('Көшірілді!', 'Көшірілді!'))
                    : (contractLang === 'ru' ? L('Копировать текст', 'Скопировать') : L('Мәтін көшіру', 'Көшіру'))
                  }
                </button>
                <button
                  onClick={() => generateDocx({
                    title: CONTRACT_TYPE_LABELS[contractType]?.[contractLang === 'ru' ? 'ru' : 'kk'] || contractType,
                    content: contractGeneratedText,
                    fileName: `quralhub-${contractType}`,
                  })}
                  className="flex-1 py-3 px-4 rounded-full text-sm font-semibold bg-card border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all"
                >
                  {contractLang === 'ru' ? L('\ud83d\udce5 Скачать Word', '\ud83d\udce5 Скачать Word') : L('\ud83d\udce5 Word жүктеу', '\ud83d\udce5 Word жүктеу')}
                </button>
                <button
                  onClick={() => handlePrint(contractGeneratedText)}
                  className="flex-1 py-3 px-4 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all"
                >
                  {contractLang === 'ru' ? L('Печать', 'Печать') : L('Басып шығару', 'Басып шығару')}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <TipBox>
        {mainTab === 'docs'
          ? L('Барлық өрістерді толтырғаннан кейін «Құжат жасау» батырмасын басыңыз. Дайын құжатты басып шығаруға немесе көшіруге болады.', 'Заполните все поля и нажмите «Создать документ». Готовый документ можно распечатать или скопировать.')
          : L('Шарт түрін таңдаңыз, тілді белгілеңіз, өрістерді толтырыңыз. Дайын шартты басып шығаруға немесе көшіруге болады.', 'Выберите тип договора, язык, заполните поля. Готовый договор можно распечатать или скопировать.')
        }
      </TipBox>

      <ShareBar tool="doctemplates" text={L('Құжат үлгілері мен шарт шаблондары — Quralhub', 'Шаблоны документов и договоров — Quralhub')} />
    </div>
  )
}
