'use client'
import { useState } from 'react'
import { BackButton } from '@/components/layout/BackButton'
import { ShareBar } from '@/components/shared/ShareBar'
import { TipBox } from '@/components/shared/TipBox'
import { InfoChip } from '@/components/shared/InfoChip'
import { useApp } from '@/components/layout/Providers'

import { MergePdf } from './pdf/MergePdf'
import { SplitPdf } from './pdf/SplitPdf'
import { CompressPdf } from './pdf/CompressPdf'
import { RotatePdf } from './pdf/RotatePdf'
import { RemovePagesPdf } from './pdf/RemovePagesPdf'
import { PageNumbersPdf } from './pdf/PageNumbersPdf'
import { WatermarkPdf } from './pdf/WatermarkPdf'
import { ImageToPdf } from './pdf/ImageToPdf'
import { TextToPdf } from './pdf/TextToPdf'
import { EditPdf } from './pdf/EditPdf'
import { RemoveBackgroundTool } from './pdf/RemoveBackgroundTool'
import { PdfToImage } from './pdf/PdfToImage'
import { WordToPdf } from './pdf/WordToPdf'
import { ExcelToPdf } from './pdf/ExcelToPdf'
import { PdfToWord } from './pdf/PdfToWord'
import { PdfToExcel } from './pdf/PdfToExcel'

type ToolKey = 'merge' | 'split' | 'compress' | 'rotate' | 'removepages' | 'pagenums' | 'watermark' | 'img2pdf' | 'text2pdf' | 'edit' | 'removebg' | 'pdf2img' | 'word2pdf' | 'excel2pdf' | 'pdf2word' | 'pdf2excel'

interface PdfTool {
  key: ToolKey
  icon: string
  title: [string, string]
  desc: [string, string]
}

const TOOLS: PdfTool[] = [
  { key: 'merge', icon: '📎', title: ['Біріктіру', 'Объединить'], desc: ['Бірнеше PDF файлды біріктіру', 'Объединить несколько PDF файлов'] },
  { key: 'split', icon: '✂️', title: ['Бөлу', 'Разделить'], desc: ['PDF файлды бөліктерге бөлу', 'Разделить PDF на части'] },
  { key: 'compress', icon: '📦', title: ['Сығу', 'Сжать'], desc: ['PDF файл көлемін кішірейту', 'Уменьшить размер PDF'] },
  { key: 'rotate', icon: '🔄', title: ['Бұру', 'Повернуть'], desc: ['PDF беттерін бұру', 'Повернуть страницы PDF'] },
  { key: 'removepages', icon: '🗑️', title: ['Беттер өшіру', 'Удалить страницы'], desc: ['Қажетсіз беттерді алып тастау', 'Удалить ненужные страницы'] },
  { key: 'pagenums', icon: '🔢', title: ['Бет нөмірлері', 'Нумерация'], desc: ['Беттерге нөмір қосу', 'Добавить нумерацию страниц'] },
  { key: 'watermark', icon: '💧', title: ['Су белгі', 'Водяной знак'], desc: ['PDF файлға watermark қосу', 'Добавить водяной знак в PDF'] },
  { key: 'img2pdf', icon: '🖼️', title: ['Сурет → PDF', 'Изображение → PDF'], desc: ['Суреттерді PDF файлға біріктіру', 'Объединить изображения в PDF'] },
  { key: 'text2pdf', icon: '📝', title: ['Мәтін → PDF', 'Текст → PDF'], desc: ['Мәтінді PDF файлға айналдыру', 'Конвертировать текст в PDF'] },
  { key: 'edit', icon: '✏️', title: ['PDF Редактор', 'Редактор PDF'], desc: ['Печать, подпись', 'Печать, подпись, текст'] },
  { key: 'removebg', icon: '🎨', title: ['Фон алу', 'Удалить фон'], desc: ['Печать/қолтаңба', 'Для печати/подписи'] },
  { key: 'pdf2img', icon: '🖼️', title: ['PDF → Сурет', 'PDF → Картинка'], desc: ['JPG/PNG', 'JPG/PNG'] },
  { key: 'word2pdf', icon: '📝', title: ['Word → PDF', 'Word → PDF'], desc: ['DOCX конвертер', 'DOCX конвертер'] },
  { key: 'excel2pdf', icon: '📊', title: ['Excel → PDF', 'Excel → PDF'], desc: ['XLSX конвертер', 'XLSX конвертер'] },
  { key: 'pdf2word', icon: '📝', title: ['PDF → Word', 'PDF → Word'], desc: ['DOCX-ке конвертер', 'DOCX конвертер'] },
  { key: 'pdf2excel', icon: '📊', title: ['PDF → Excel', 'PDF → Excel'], desc: ['XLSX-ке конвертер', 'XLSX конвертер'] },
]

const TOOL_COMPONENTS: Record<ToolKey, React.ComponentType> = {
  merge: MergePdf,
  split: SplitPdf,
  compress: CompressPdf,
  rotate: RotatePdf,
  removepages: RemovePagesPdf,
  pagenums: PageNumbersPdf,
  watermark: WatermarkPdf,
  img2pdf: ImageToPdf,
  text2pdf: TextToPdf,
  edit: EditPdf,
  removebg: RemoveBackgroundTool,
  pdf2img: PdfToImage,
  word2pdf: WordToPdf,
  excel2pdf: ExcelToPdf,
  pdf2word: PdfToWord,
  pdf2excel: PdfToExcel,
}

export function PdfToolsPage() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz
  const isRu = lang === 'ru'

  const [activeTool, setActiveTool] = useState<ToolKey | null>(null)

  const tool = TOOLS.find(t => t.key === activeTool)
  const ToolComponent = activeTool ? TOOL_COMPONENTS[activeTool] : null

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">{L('📕 PDF құралдар', '📕 PDF инструменты')}</h2>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <InfoChip>{L('16 құрал', '16 инструментов')}</InfoChip>
        <InfoChip>{L('Тегін', 'Бесплатно')}</InfoChip>
        <InfoChip>{L('100% қауіпсіз', '100% безопасно')}</InfoChip>
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
        {L('PDF файлдармен жұмыс — біріктіру, бөлу, сығу, бұру, нөмірлеу, редакциялау', 'Работа с PDF — объединение, разделение, сжатие, поворот, нумерация, редактирование')}
      </p>

      {/* Security badge */}
      <div className="mb-4 p-3 rounded-xl bg-green-50 dark:bg-green-950/30 text-[13px] text-green-800 dark:text-green-200 leading-relaxed border border-green-200/30 dark:border-green-800/30 flex items-center gap-2">
        <span className="text-lg">🔒</span>
        <span>{L('100% қауіпсіз — файлдар серверге жіберілмейді, барлығы браузерде өңделеді', '100% безопасно — файлы не отправляются на сервер, всё обрабатывается в браузере')}</span>
      </div>

      {/* Tool Grid */}
      {!activeTool && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {TOOLS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTool(t.key)}
              className="p-4 bg-card border border-border rounded-2xl text-center hover:border-primary hover:shadow-md transition-all group min-h-[44px]"
            >
              <div className="text-2xl mb-2">{t.icon}</div>
              <p className="text-sm font-bold mb-1 group-hover:text-primary transition-colors">{isRu ? t.title[1] : t.title[0]}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">{isRu ? t.desc[1] : t.desc[0]}</p>
            </button>
          ))}
        </div>
      )}

      {/* Active Tool */}
      {activeTool && ToolComponent && (
        <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
          <button
            onClick={() => setActiveTool(null)}
            className="mb-4 text-sm text-primary font-semibold hover:underline flex items-center gap-1 min-h-[44px]"
          >
            ← {L('Барлық құралдар', 'Все инструменты')}
          </button>

          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            {tool?.icon} {tool ? (isRu ? tool.title[1] : tool.title[0]) : ''}
          </h3>

          <ToolComponent />
        </div>
      )}

      <TipBox>
        {L('Барлық файлдар тек сіздің браузеріңізде өңделеді. Ешқандай деректер серверге жіберілмейді.', 'Все файлы обрабатываются только в вашем браузере. Никакие данные не отправляются на сервер.')}
      </TipBox>

      <ShareBar tool="pdf" text={L('PDF құралдар — Quralhub', 'PDF инструменты — Quralhub')} />
    </div>
  )
}
