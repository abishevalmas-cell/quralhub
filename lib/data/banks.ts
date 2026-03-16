// === BANK DATA (2026 March) ===

export type DepositType = 'save' | 'flex'
export type CreditType = 'consumer' | 'mortgage' | 'auto' | 'business' | 'installment'

export interface DepositProduct {
  /** Product name */
  product: string
  /** Nominal annual rate % */
  rate: number
  /** GAER (ГЭСВ) % */
  gaer: number
  /** Available terms in months */
  terms: number[]
  /** Deposit type */
  type: DepositType
  /** Minimum amount in tenge */
  min: number
  /** Capitalization frequency */
  capitalization: string
  /** Allows top-up */
  topUp: boolean
}

export interface CreditProduct {
  /** Product name */
  product: string
  /** Credit type */
  type: CreditType
  /** Annual rate % */
  rate: number
  /** Max loan amount */
  maxAmount: number
  /** Max term in months */
  maxTerm: number
  /** Feature chips */
  features?: string[]
}

export interface Bank {
  name: string
  shortName: string
  color: string
  logo: string
  deposits: DepositProduct[]
  credits: CreditProduct[]
}

export const BANKS: Bank[] = [
  {
    name: 'Eurasian Bank',
    shortName: 'EB',
    color: '#1E3A5F',
    logo: 'https://www.google.com/s2/favicons?domain=eubank.kz&sz=64',
    deposits: [
      { product: 'Turbo Deposit', rate: 18.5, gaer: 20, terms: [3, 6], type: 'save', min: 1000, capitalization: 'ежедневная', topUp: true },
      { product: 'Turbo 12м', rate: 14.8, gaer: 15.9, terms: [12], type: 'flex', min: 1000, capitalization: 'ежедневная', topUp: true },
    ],
    credits: [
      { product: 'Без залога', type: 'consumer', rate: 21.9, maxAmount: 7_000_000, maxTerm: 60, features: ['Кепілсіз'] },
      { product: 'EB Бизнес', type: 'business', rate: 21, maxAmount: 30_000_000, maxTerm: 48 },
    ],
  },
  {
    name: 'ForteBank',
    shortName: 'FB',
    color: '#E31837',
    logo: 'https://www.google.com/s2/favicons?domain=fortebank.kz&sz=64',
    deposits: [
      { product: 'Сберегательный', rate: 18.4, gaer: 20, terms: [3, 6], type: 'save', min: 100_000, capitalization: 'ежемесячная', topUp: false },
      { product: 'Гибкий', rate: 13.0, gaer: 13.8, terms: [12], type: 'flex', min: 1_000, capitalization: 'ежемесячная', topUp: true },
    ],
    credits: [
      { product: 'Наличными', type: 'consumer', rate: 22.5, maxAmount: 10_000_000, maxTerm: 60, features: ['Кепілсіз'] },
      { product: 'Ипотека', type: 'mortgage', rate: 18, maxAmount: 50_000_000, maxTerm: 240 },
      { product: 'Forte Бизнес', type: 'business', rate: 20, maxAmount: 50_000_000, maxTerm: 60 },
    ],
  },
  {
    name: 'Kaspi Bank',
    shortName: 'KB',
    color: '#F14635',
    logo: 'https://www.google.com/s2/favicons?domain=kaspi.kz&sz=64',
    deposits: [
      { product: 'Kaspi Депозит', rate: 18.4, gaer: 20, terms: [3, 6], type: 'save', min: 100_000, capitalization: 'ежемесячная', topUp: true },
      { product: 'Гибкий', rate: 14.1, gaer: 15.0, terms: [12], type: 'flex', min: 1_000, capitalization: 'ежемесячная', topUp: true },
    ],
    credits: [
      { product: 'Kaspi Несие', type: 'consumer', rate: 20.9, maxAmount: 7_000_000, maxTerm: 48, features: ['Онлайн мақұлдау', 'Кепілсіз'] },
      { product: 'Kaspi Авто', type: 'auto', rate: 15, maxAmount: 20_000_000, maxTerm: 84 },
      { product: 'Kaspi Red', type: 'installment', rate: 0, maxAmount: 3_000_000, maxTerm: 24, features: ['0% рассрочка', 'Онлайн мақұлдау', 'Жарна жоқ'] },
    ],
  },
  {
    name: 'Halyk Bank',
    shortName: 'HB',
    color: '#00A859',
    logo: 'https://www.google.com/s2/favicons?domain=halykbank.kz&sz=64',
    deposits: [
      { product: 'Максимальный', rate: 15.85, gaer: 17.3, terms: [3], type: 'save', min: 15_000, capitalization: 'ежемесячная', topUp: false },
      { product: 'Универсальный', rate: 13.7, gaer: 14.8, terms: [12], type: 'flex', min: 1_000, capitalization: 'ежемесячная', topUp: true },
    ],
    credits: [
      { product: 'Потреб онлайн', type: 'consumer', rate: 19.5, maxAmount: 15_000_000, maxTerm: 60, features: ['Онлайн мақұлдау', 'Кепілсіз'] },
      { product: 'Ипотека', type: 'mortgage', rate: 16, maxAmount: 80_000_000, maxTerm: 240 },
      { product: 'Halyk Авто', type: 'auto', rate: 16.5, maxAmount: 30_000_000, maxTerm: 84 },
      { product: 'Halyk Бизнес', type: 'business', rate: 19, maxAmount: 100_000_000, maxTerm: 60 },
    ],
  },
  {
    name: 'БЦК',
    shortName: 'БЦК',
    color: '#003DA5',
    logo: 'https://www.google.com/s2/favicons?domain=bcc.kz&sz=64',
    deposits: [
      { product: 'Моя цель', rate: 18.4, gaer: 20, terms: [3, 6], type: 'save', min: 1, capitalization: 'ежемесячная', topUp: true },
      { product: 'Рахмет', rate: 16.5, gaer: 17.8, terms: [3], type: 'save', min: 500_000, capitalization: 'ежемесячная', topUp: false },
      { product: 'Гибкий', rate: 13.2, gaer: 14.0, terms: [12], type: 'flex', min: 1_000, capitalization: 'ежемесячная', topUp: true },
    ],
    credits: [
      { product: 'БЦК Online', type: 'consumer', rate: 21, maxAmount: 10_000_000, maxTerm: 60, features: ['Кепілсіз'] },
      { product: 'Ипотека', type: 'mortgage', rate: 17, maxAmount: 60_000_000, maxTerm: 240 },
      { product: 'БЦК Авто', type: 'auto', rate: 17, maxAmount: 25_000_000, maxTerm: 84 },
    ],
  },
  {
    name: 'Bereke Bank',
    shortName: 'BB',
    color: '#2B6CB0',
    logo: 'https://www.google.com/s2/favicons?domain=berekebank.kz&sz=64',
    deposits: [
      { product: 'Bereke депозит', rate: 18.34, gaer: 20, terms: [3, 6], type: 'save', min: 5_000_000, capitalization: 'ежедневная', topUp: true },
      { product: 'Кун Сайын', rate: 15.8, gaer: 17.0, terms: [6], type: 'flex', min: 1_000, capitalization: 'ежедневная', topUp: true },
      { product: 'Гибкий 12м', rate: 14.8, gaer: 15.9, terms: [12], type: 'flex', min: 1_000, capitalization: 'ежедневная', topUp: true },
    ],
    credits: [
      { product: 'Без залога', type: 'consumer', rate: 19, maxAmount: 8_000_000, maxTerm: 60, features: ['Кепілсіз'] },
      { product: 'Bereke Авто', type: 'auto', rate: 16, maxAmount: 20_000_000, maxTerm: 60 },
    ],
  },
  {
    name: 'Home Credit',
    shortName: 'HC',
    color: '#E4002B',
    logo: 'https://www.google.com/s2/favicons?domain=homecredit.kz&sz=64',
    deposits: [
      { product: 'Хоум+', rate: 18.23, gaer: 20, terms: [3, 6], type: 'save', min: 1_000, capitalization: 'ежедневная', topUp: true },
      { product: 'Гибкий', rate: 14.5, gaer: 15.9, terms: [12], type: 'flex', min: 1_000, capitalization: 'ежедневная', topUp: true },
    ],
    credits: [
      { product: 'Наличными', type: 'consumer', rate: 23.9, maxAmount: 5_000_000, maxTerm: 60, features: ['Кепілсіз'] },
      { product: 'Рассрочка HC', type: 'installment', rate: 0, maxAmount: 1_500_000, maxTerm: 12, features: ['0% рассрочка', 'Жарна жоқ'] },
    ],
  },
  {
    name: 'Bank RBK',
    shortName: 'RBK',
    color: '#1B4F72',
    logo: 'https://www.google.com/s2/favicons?domain=bankrbk.kz&sz=64',
    deposits: [
      { product: 'DREAM', rate: 18.4, gaer: 20, terms: [3, 6], type: 'save', min: 15_000, capitalization: 'ежемесячная', topUp: true },
      { product: 'Гибкий', rate: 13.5, gaer: 14.0, terms: [12], type: 'flex', min: 1_000, capitalization: 'ежемесячная', topUp: true },
    ],
    credits: [
      { product: 'RBK Online', type: 'consumer', rate: 22, maxAmount: 7_000_000, maxTerm: 48, features: ['Кепілсіз'] },
    ],
  },
  {
    name: 'Freedom Bank',
    shortName: 'FR',
    color: '#2D2D7F',
    logo: 'https://www.google.com/s2/favicons?domain=freedomfinance.kz&sz=64',
    deposits: [
      { product: 'Freedom Deposit', rate: 18.0, gaer: 20, terms: [3], type: 'save', min: 1_000, capitalization: 'ежемесячная', topUp: false },
      { product: 'Копилка', rate: 15.5, gaer: 16.7, terms: [12], type: 'flex', min: 500, capitalization: 'ежемесячная', topUp: true },
    ],
    credits: [
      { product: 'Freedom Online', type: 'consumer', rate: 24, maxAmount: 5_000_000, maxTerm: 48, features: ['Кепілсіз'] },
      { product: 'Freedom Несие', type: 'consumer', rate: 21.5, maxAmount: 8_000_000, maxTerm: 60 },
    ],
  },
  {
    name: 'Altyn Bank',
    shortName: 'AB',
    color: '#C8971D',
    logo: 'https://www.google.com/s2/favicons?domain=altynbank.kz&sz=64',
    deposits: [
      { product: 'Резерв', rate: 14.8, gaer: 16.0, terms: [12], type: 'save', min: 10_000, capitalization: 'ежемесячная', topUp: false },
    ],
    credits: [
      { product: 'Потреб', type: 'consumer', rate: 20.5, maxAmount: 10_000_000, maxTerm: 60, features: ['Кепілсіз'] },
    ],
  },
  {
    name: 'KZI Bank',
    shortName: 'KZI',
    color: '#0E7C86',
    logo: 'https://www.google.com/s2/favicons?domain=kzi.kz&sz=64',
    deposits: [
      { product: 'KZI Депозит', rate: 15.5, gaer: 16.9, terms: [12], type: 'flex', min: 1_000, capitalization: 'ежемесячная', topUp: true },
    ],
    credits: [
      { product: 'KZI Несие', type: 'consumer', rate: 23, maxAmount: 3_000_000, maxTerm: 36, features: ['Кепілсіз'] },
    ],
  },
  {
    name: 'Нурбанк',
    shortName: 'НБ',
    color: '#003876',
    logo: 'https://www.google.com/s2/favicons?domain=nurbank.kz&sz=64',
    deposits: [
      { product: 'Депозит', rate: 14.5, gaer: 15.9, terms: [12], type: 'flex', min: 1_000, capitalization: 'ежемесячная', topUp: true },
    ],
    credits: [
      { product: 'Потреб', type: 'consumer', rate: 22, maxAmount: 5_000_000, maxTerm: 48, features: ['Кепілсіз'] },
    ],
  },
  {
    name: 'Отбасы банк',
    shortName: 'ОБ',
    color: '#00569E',
    logo: 'https://www.google.com/s2/favicons?domain=hcsbk.kz&sz=64',
    deposits: [
      { product: 'Отбасы', rate: 12.0, gaer: 12.7, terms: [12], type: 'save', min: 1_000, capitalization: 'ежемесячная', topUp: true },
    ],
    credits: [
      { product: 'Ипотека', type: 'mortgage', rate: 5, maxAmount: 80_000_000, maxTerm: 300 },
    ],
  },
  {
    name: 'Jusan Bank',
    shortName: 'JB',
    color: '#FF6600',
    logo: 'https://www.google.com/s2/favicons?domain=jusan.kz&sz=64',
    deposits: [
      { product: 'Jusan', rate: 13.0, gaer: 13.8, terms: [12], type: 'flex', min: 1_000, capitalization: 'ежемесячная', topUp: true },
    ],
    credits: [
      { product: 'Jusan Онлайн', type: 'consumer', rate: 21.5, maxAmount: 7_000_000, maxTerm: 60, features: ['Кепілсіз'] },
      { product: 'Jusan Бизнес', type: 'business', rate: 20.5, maxAmount: 40_000_000, maxTerm: 48 },
    ],
  },
]
