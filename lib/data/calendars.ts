export interface CalendarEvent {
  date: string
  name: string
  nameRu: string
  type: 'holiday' | 'professional' | 'religious' | 'international' | 'school'
  days?: number
}

// Professional days (кәсіби мерекелер)
export const PROFESSIONAL_DAYS_2026: CalendarEvent[] = [
  { date: '2026-01-12', name: 'Прокуратура қызметкерлері күні', nameRu: 'День работников прокуратуры', type: 'professional' },
  { date: '2026-02-18', name: 'Ұлттық гвардия күні', nameRu: 'День Национальной гвардии', type: 'professional' },
  { date: '2026-03-12', name: 'Кадастр қызметкерлері күні', nameRu: 'День работников кадастра', type: 'professional' },
  { date: '2026-03-22', name: 'Су ресурстары күні', nameRu: 'Всемирный день водных ресурсов', type: 'international' },
  { date: '2026-04-02', name: 'Геолог күні', nameRu: 'День геолога', type: 'professional' },
  { date: '2026-04-15', name: 'Ғылым күні', nameRu: 'День науки', type: 'professional' },
  { date: '2026-05-31', name: 'Полиция күні', nameRu: 'День полиции', type: 'professional' },
  { date: '2026-06-01', name: 'Балаларды қорғау күні', nameRu: 'День защиты детей', type: 'international' },
  { date: '2026-06-05', name: 'Қоршаған орта күні', nameRu: 'День окружающей среды', type: 'international' },
  { date: '2026-06-14', name: 'Медицина қызметкерлері күні', nameRu: 'День медицинского работника', type: 'professional' },
  { date: '2026-06-28', name: 'Кеден қызметкерлері күні', nameRu: 'День таможенника', type: 'professional' },
  { date: '2026-07-02', name: 'Дипломатия қызметкерлері күні', nameRu: 'День дипломата', type: 'professional' },
  { date: '2026-08-11', name: 'Құрылысшы күні', nameRu: 'День строителя', type: 'professional' },
  { date: '2026-08-14', name: 'Кәсіпкер күні', nameRu: 'День предпринимателя', type: 'professional' },
  { date: '2026-09-01', name: 'Білім күні', nameRu: 'День знаний', type: 'school' },
  { date: '2026-09-27', name: 'Туризм күні', nameRu: 'День туризма', type: 'international' },
  { date: '2026-10-05', name: 'Мұғалімдер күні', nameRu: 'День учителя', type: 'professional' },
  { date: '2026-10-31', name: 'Автомобиль көлігі күні', nameRu: 'День автомобилиста', type: 'professional' },
  { date: '2026-11-01', name: 'Домбыра күні', nameRu: 'День домбры', type: 'professional' },
  { date: '2026-12-22', name: 'Энергетик күні', nameRu: 'День энергетика', type: 'professional' },
]

// School calendar 2026-2027
export const SCHOOL_CALENDAR = {
  term1: { start: '2026-09-01', end: '2026-10-24', label: '1-тоқсан' },
  fall_break: { start: '2026-10-26', end: '2026-11-01', label: 'Күзгі каникул' },
  term2: { start: '2026-11-02', end: '2026-12-26', label: '2-тоқсан' },
  winter_break: { start: '2026-12-28', end: '2027-01-10', label: 'Қысқы каникул' },
  term3: { start: '2027-01-11', end: '2027-03-20', label: '3-тоқсан' },
  spring_break: { start: '2027-03-22', end: '2027-03-29', label: 'Көктемгі каникул' },
  term4: { start: '2027-03-30', end: '2027-05-25', label: '4-тоқсан' },
  summer_break: { start: '2027-05-26', end: '2027-08-31', label: 'Жазғы каникул' },
}

// Tax calendar 2026 (deadlines)
export const TAX_CALENDAR_2026: CalendarEvent[] = [
  { date: '2026-01-15', name: 'ИПН, СО, ВОСМС — желтоқсан 2025', nameRu: 'ИПН, СО, ВОСМС за декабрь 2025', type: 'professional' },
  { date: '2026-01-25', name: 'НДС декларация — 4-тоқсан 2025', nameRu: 'Декларация НДС за 4 кв. 2025', type: 'professional' },
  { date: '2026-02-15', name: 'ИПН, СО, ВОСМС — қаңтар', nameRu: 'ИПН, СО, ВОСМС за январь', type: 'professional' },
  { date: '2026-03-15', name: 'Упрощёнка 910.00 — 2-жартыжылдық 2025', nameRu: 'ФНО 910.00 за 2-е полугодие 2025', type: 'professional' },
  { date: '2026-03-31', name: 'КПН декларация — 2025 жыл', nameRu: 'Декларация КПН за 2025 год', type: 'professional' },
  { date: '2026-04-01', name: 'Транспорт салығы — 2026 жыл', nameRu: 'Транспортный налог за 2026 год', type: 'professional' },
  { date: '2026-04-15', name: 'ИПН декларация (240.00) — 2025 жыл', nameRu: 'Декларация ИПН (240.00) за 2025 год', type: 'professional' },
  { date: '2026-04-25', name: 'НДС декларация — 1-тоқсан 2026', nameRu: 'Декларация НДС за 1 кв. 2026', type: 'professional' },
  { date: '2026-07-25', name: 'НДС декларация — 2-тоқсан 2026', nameRu: 'Декларация НДС за 2 кв. 2026', type: 'professional' },
  { date: '2026-08-15', name: 'Упрощёнка 910.00 — 1-жартыжылдық 2026', nameRu: 'ФНО 910.00 за 1-е полугодие 2026', type: 'professional' },
  { date: '2026-10-25', name: 'НДС декларация — 3-тоқсан 2026', nameRu: 'Декларация НДС за 3 кв. 2026', type: 'professional' },
]
