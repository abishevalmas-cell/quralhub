export interface Tool {
  id: string
  href: string
  name: string
  nameRu: string
  description: string
  descriptionRu: string
  icon: string
  category: 'calc' | 'cmp' | 'ai' | 'doc' | 'extra'
  search: string
  badge?: { text: string; type: 'hot' | 'new' | 'ai' }
  glowClass: string
  /** Grid size: 'lg' = spans 2 cols, 'sm' = compact mini-card, default = normal */
  size?: 'lg' | 'sm'
}

export const TOOLS: Tool[] = [
  // Finance
  { id: 'salary', href: '/salary', name: 'Жалақы', nameRu: 'Зарплата', description: 'Қолға алатын сома', descriptionRu: 'Сумма на руки', icon: '💰', category: 'calc', search: 'жалақы зарплата salary', badge: { text: 'ТОП', type: 'hot' }, glowClass: 'from-emerald-400 to-emerald-600' },
  { id: 'vat', href: '/vat', name: 'ҚҚС 16%', nameRu: 'НДС 16%', description: 'Жаңа мөлшерлеме', descriptionRu: 'Новая ставка', icon: '🧾', category: 'calc', search: 'ндс нқс vat 16', badge: { text: '2026', type: 'new' }, glowClass: 'from-rose-400 to-rose-600' },
  { id: 'mrp', href: '/mrp', name: 'МРП ↔ ₸', nameRu: 'МРП ↔ ₸', description: '4 325₸', descriptionRu: '4 325₸', icon: '🔢', category: 'calc', search: 'мрп mrp тенге', badge: { text: 'ТОП', type: 'hot' }, glowClass: 'from-amber-400 to-amber-600' },
  { id: 'tax', href: '/tax', name: 'ЖК салығы', nameRu: 'Налог ИП', description: 'Жеңілдетілген 4%', descriptionRu: 'Упрощёнка 4%', icon: '📊', category: 'calc', search: 'ип жк салық tax упрощёнка', glowClass: 'from-violet-400 to-violet-600' },
  { id: 'selfemployed', href: '/selfemployed', name: 'Өзін-өзі жұмыспен қамту', nameRu: 'Самозанятый', description: 'Жаңа режим', descriptionRu: 'Новый режим', icon: '👤', category: 'calc', search: 'самозанятый өзін-өзі', badge: { text: '2026', type: 'new' }, glowClass: 'from-indigo-400 to-indigo-600' },
  { id: 'kaspi', href: '/kaspi', name: 'Kaspi Red', nameRu: 'Kaspi Red', description: 'Бөліп төлеу', descriptionRu: 'Рассрочка', icon: '💳', category: 'calc', search: 'kaspi red рассрочка бөліп', glowClass: 'from-red-400 to-red-600' },
  { id: 'marketplace', href: '/marketplace', name: 'Маркетплейс пайда', nameRu: 'Маржа маркетплейса', description: 'Kaspi, WB, Ozon', descriptionRu: 'Kaspi, WB, Ozon', icon: '📦', category: 'calc', search: 'маркетплейс маржа kaspi wb wildberries ozon сату пайда', badge: { text: 'ЖАҢА', type: 'new' }, glowClass: 'from-violet-400 to-violet-600' },
  { id: 'vacation', href: '/vacation', name: 'Демалыс ақы', nameRu: 'Отпускные', description: 'Демалыс есебі', descriptionRu: 'Расчёт отпускных', icon: '🏖️', category: 'calc', search: 'отпуск демалыс ақы vacation', glowClass: 'from-teal-400 to-teal-600' },
  { id: 'biztrip', href: '/biztrip', name: 'Іссапар', nameRu: 'Командировочные', description: '6/8 МРП тәуліктік', descriptionRu: 'Суточные 6/8 МРП', icon: '✈️', category: 'calc', search: 'іссапар командировка суточные biztrip', badge: { text: 'ЖАҢА', type: 'new' }, glowClass: 'from-sky-400 to-sky-600' },
  { id: 'maternity', href: '/maternity', name: 'Декрет ақы', nameRu: 'Декретные', description: 'Ана мен бала', descriptionRu: 'Мать и ребёнок', icon: '👶', category: 'calc', search: 'декрет декретные ана бала', glowClass: 'from-pink-400 to-pink-600' },
  // Property
  { id: 'mortgage', href: '/mortgage', name: 'Тұрғын үй несиесі', nameRu: 'Ипотека', description: 'Отбасы, 7-20-25', descriptionRu: 'Отбасы, 7-20-25', icon: '🏠', category: 'calc', search: 'ипотека mortgage үй', glowClass: 'from-blue-400 to-blue-600' },
  { id: 'transport', href: '/transport', name: 'Транспорт салығы', nameRu: 'Транспортный налог', description: 'Жаңа коэффициенттер', descriptionRu: 'Новые коэффициенты', icon: '🚗', category: 'calc', search: 'транспорт авто налог', badge: { text: '2026', type: 'new' }, glowClass: 'from-slate-400 to-slate-600' },
  { id: 'communal', href: '/communal', name: 'Коммуналдық', nameRu: 'Коммунальные', description: '8 қала тарифтері', descriptionRu: 'Тарифы 8 городов', icon: '💡', category: 'calc', search: 'коммуналдық коммунальные жылу су', glowClass: 'from-yellow-300 to-orange-500' },
  { id: 'customs', href: '/customs', name: 'Кеден бажы', nameRu: 'Растаможка', description: 'ЕАЭС кеден бажы', descriptionRu: 'Таможня ЕАЭС', icon: '🚢', category: 'calc', search: 'растаможка customs кеден', glowClass: 'from-gray-400 to-gray-600' },
  { id: 'fines', href: '/fines', name: 'Жол айыппұлдары', nameRu: 'Штрафы ПДД', description: 'Жол штрафтары 2026', descriptionRu: 'Дорожные штрафы 2026', icon: '🚔', category: 'calc', search: 'штраф жол пдд жылдамдық айыппұл', badge: { text: 'ЖАҢА', type: 'new' }, glowClass: 'from-red-400 to-red-600' },
  { id: 'plates', href: '/plates', name: 'Авто нөмір', nameRu: 'Авто номер', description: 'Нөмір бағалары 2026', descriptionRu: 'Цены номеров 2026', icon: '🔢', category: 'calc', search: 'нөмір номер авто гос номер vip таңдау', badge: { text: 'ЖАҢА', type: 'new' }, glowClass: 'from-sky-400 to-sky-600' },
  // Banks
  { id: 'currency', href: '/currency', name: 'Валюта курстары', nameRu: 'Курсы валют', description: '14 қала, карта', descriptionRu: '14 городов, карта', icon: '💱', category: 'cmp', search: 'валюта доллар тенге currency обменник', badge: { text: 'ТОП', type: 'hot' }, glowClass: 'from-blue-400 to-blue-700' },
  { id: 'bankdep', href: '/bankdep', name: 'Банк депозиттер', nameRu: 'Банк депозиты', description: '14 банк салыстыру', descriptionRu: 'Сравнение 14 банков', icon: '🏦', category: 'cmp', search: 'депозит ставка банк салыстыру', badge: { text: 'ТОП', type: 'hot' }, glowClass: 'from-sky-400 to-sky-600' },
  { id: 'bankcred', href: '/bankcred', name: 'Банк кредиттер', nameRu: 'Банк кредиты', description: 'Ставкалар салыстыру', descriptionRu: 'Сравнение ставок', icon: '💳', category: 'cmp', search: 'кредит несие банк', glowClass: 'from-yellow-300 to-amber-600' },
  { id: 'connect', href: '/connect', name: 'Байланыс тарифтер', nameRu: 'Тарифы связи', description: 'Ұялы + Үй интернет', descriptionRu: 'Мобильный + Дом. интернет', icon: '📡', category: 'cmp', search: 'тариф байланыс beeline kcell tele2 интернет провайдер', badge: { text: 'ТОП', type: 'hot' }, glowClass: 'from-emerald-400 to-blue-500' },
  // Language
  { id: 'aitools', href: '/aitools', name: 'AI Аудармашы', nameRu: 'AI Переводчик', description: 'Аударма · Латын · Емле', descriptionRu: 'Перевод · Латын · Орфография', icon: '🧠', category: 'ai', search: 'аудармашы переводчик translate латын кирилл latyn орфография емле', badge: { text: 'AI', type: 'ai' }, glowClass: 'from-purple-400 to-purple-700' },
  { id: 'septik', href: '/septik', name: 'Септік құрал', nameRu: 'Склонение', description: 'Сөз, сан, лауазым, ай, күн', descriptionRu: 'Слово, число, должность', icon: '📝', category: 'extra', search: 'септік склонение сөз сан лауазым', badge: { text: '5 in 1', type: 'new' }, glowClass: 'from-purple-400 to-violet-600', size: 'sm' },
  { id: 'propisyu', href: '/propisyu', name: 'Сөзбен жазу', nameRu: 'Прописью', description: 'Сан мен күнді сөзбен', descriptionRu: 'Число и дата словами', icon: '🔤', category: 'extra', search: 'сома дата прописью сан күн жазу сөзбен', glowClass: 'from-teal-300 to-teal-600' },
  { id: 'holidays', href: '/holidays', name: 'Мерекелер 2026', nameRu: 'Праздники 2026', description: 'Күнтізбе + демалыстар', descriptionRu: 'Календарь + выходные', icon: '📅', category: 'extra', search: 'мереке демалыс күнтізбе calendar', glowClass: 'from-red-400 to-red-600' },
  // Documents
  { id: 'doctemplates', href: '/doctemplates', name: 'Құжат үлгілері', nameRu: 'Шаблоны документов', description: 'Өтініш, бұйрық, шарт, хат', descriptionRu: 'Заявление, приказ, договор', icon: '📑', category: 'doc', search: 'құжат шаблон документ бұйрық өтініш шарт', badge: { text: '20+', type: 'hot' }, glowClass: 'from-emerald-400 to-emerald-700', size: 'lg' },
  { id: 'resume', href: '/resume', name: 'Түйіндеме', nameRu: 'Резюме', description: 'Қазақша CV', descriptionRu: 'Казахское CV', icon: '👤', category: 'doc', search: 'резюме cv түйіндеме', glowClass: 'from-purple-400 to-purple-700' },
  { id: 'invoice', href: '/invoice', name: 'Шот-фактура', nameRu: 'Счёт-фактура', description: 'НДС 16% есебімен', descriptionRu: 'С учётом НДС 16%', icon: '📄', category: 'doc', search: 'шот фактура invoice счет', glowClass: 'from-yellow-300 to-amber-600' },
  { id: 'qr', href: '/qr', name: 'QR-код', nameRu: 'QR-код', description: 'WiFi, WhatsApp, визитка', descriptionRu: 'WiFi, WhatsApp, визитка', icon: '▣', category: 'doc', search: 'qr код генератор', badge: { text: 'ТОП', type: 'hot' }, glowClass: 'from-blue-400 to-blue-700' },
  { id: 'pdf', href: '/pdf', name: 'PDF құралдар', nameRu: 'PDF редактор', description: 'Сығу, біріктіру, бөлу', descriptionRu: 'Сжатие, объединение', icon: '📕', category: 'doc', search: 'pdf сығу compress біріктіру merge split', badge: { text: 'ТОП', type: 'hot' }, glowClass: 'from-red-400 to-red-700', size: 'lg' },
  { id: 'passgen', href: '/passgen', name: 'Құпия сөз', nameRu: 'Пароль', description: 'Қауіпсіз генератор', descriptionRu: 'Безопасный генератор', icon: '🔑', category: 'doc', search: 'пароль password құпия', glowClass: 'from-slate-400 to-slate-600', size: 'sm' },
  { id: 'abbrev', href: '/abbrev', name: 'Қысқартулар', nameRu: 'Сокращения', description: '47 қысқарту', descriptionRu: 'Справочник КЗ', icon: '📋', category: 'extra', search: 'қысқарту аббревиатура опв жсн бсн ндс мрп', glowClass: 'from-orange-400 to-orange-600' },
  { id: 'calendars', href: '/calendars', name: 'Күнтізбелер', nameRu: 'Календари', description: 'Мереке, мектеп, салық', descriptionRu: 'Праздники, школа, налоги', icon: '📆', category: 'extra', search: 'күнтізбе календарь мектеп каникул салық мереке кәсіби', badge: { text: 'ЖАҢА', type: 'new' }, glowClass: 'from-orange-400 to-orange-600' },
]

export const SECTIONS = [
  { key: 'calc-finance', label: 'ҚАРЖЫ ЖӘНЕ САЛЫҚ', labelRu: 'ФИНАНСЫ И НАЛОГИ', title: 'Калькуляторлар', titleRu: 'Калькуляторы', tools: ['salary', 'vat', 'mrp', 'tax', 'selfemployed', 'marketplace', 'vacation', 'biztrip', 'maternity', 'fines'] },
  { key: 'calc-property', label: 'МҮЛІК ЖӘНЕ ТҰРМЫС', labelRu: 'ИМУЩЕСТВО И БЫТ', title: 'Үй, авто, коммуналдық', titleRu: 'Дом, авто, коммунальные', tools: ['mortgage', 'transport', 'communal', 'customs', 'plates'] },
  { key: 'cmp', label: 'БАНК, ВАЛЮТА, ТАРИФ', labelRu: 'БАНК, ВАЛЮТА, ТАРИФ', title: 'Салыстыру және курстар', titleRu: 'Сравнение и курсы', tools: ['currency', 'bankdep', 'bankcred', 'kaspi', 'connect'] },
  { key: 'ai', label: 'ТІЛ ҚҰРАЛДАРЫ', labelRu: 'ЯЗЫКОВЫЕ ИНСТРУМЕНТЫ', title: 'Аударма, прописью, қысқартулар', titleRu: 'Перевод, прописью, сокращения', tools: ['aitools', 'propisyu', 'calendars', 'abbrev'] },
  { key: 'doc', label: 'ҚҰЖАТТАР МЕН ҚҰРАЛДАР', labelRu: 'ДОКУМЕНТЫ И УТИЛИТЫ', title: 'Генераторлар мен утилиталар', titleRu: 'Генераторы и утилиты', tools: ['pdf', 'doctemplates', 'resume', 'qr', 'invoice', 'septik', 'passgen'] },
]
