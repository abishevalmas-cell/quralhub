export interface MortgageProgram {
  id: string
  bank: string
  name: string
  nameRu: string
  rate: number
  minDown: number       // % первоначальный взнос
  maxYears: number
  maxAmount: number     // максимальная сумма кредита (₸)
  type: 'state' | 'commercial'
  color: string
  conditions: string    // KZ
  conditionsRu: string  // RU
  note?: string
  noteRu?: string
}

export const MORTGAGE_PROGRAMS: MortgageProgram[] = [
  // === ГОСУДАРСТВЕННЫЕ ===
  {
    id: 'otbasy-bakyty',
    bank: 'Отбасы банк',
    name: 'Бақытты отбасы',
    nameRu: 'Бақытты отбасы',
    rate: 2,
    minDown: 10,
    maxYears: 25,
    maxAmount: 30000000,
    type: 'state',
    color: '#10B981',
    conditions: 'Көп балалы отбасылар (4+ бала), мемлекеттік тізімдегі отбасылар. Жарна 10%+. Жаңа немесе екінші нарық.',
    conditionsRu: 'Многодетные семьи (4+ детей), семьи из гос. реестра. Взнос 10%+. Новое или вторичное жильё.',
    note: 'Кезекте 6-18 ай тұру қажет',
    noteRu: 'Ожидание в очереди 6-18 мес.',
  },
  {
    id: 'otbasy-shanyraq',
    bank: 'Отбасы банк',
    name: 'Шаңырақ',
    nameRu: 'Шаңырақ',
    rate: 3.5,
    minDown: 20,
    maxYears: 25,
    maxAmount: 30000000,
    type: 'state',
    color: '#10B981',
    conditions: 'Жинақ жүйесі бойынша. Кемінде 3 жыл жинақтау, жарна 20%+. Жаңа немесе екінші нарық.',
    conditionsRu: 'По накопительной системе. Минимум 3 года накоплений, взнос 20%+. Новое или вторичное жильё.',
    note: '3+ жыл депозит жинау міндетті',
    noteRu: 'Обязательно 3+ года накоплений',
  },
  {
    id: 'otbasy-5',
    bank: 'Отбасы банк',
    name: 'Стандартты',
    nameRu: 'Стандартная',
    rate: 5,
    minDown: 20,
    maxYears: 20,
    maxAmount: 25000000,
    type: 'state',
    color: '#10B981',
    conditions: 'Жеке тұрғын үй сатып алу. Жарна 20%+. Жалақы растауы қажет.',
    conditionsRu: 'Покупка жилья. Взнос 20%+. Требуется подтверждение дохода.',
  },
  {
    id: '7-20-25',
    bank: '7-20-25',
    name: '7-20-25 бағдарламасы',
    nameRu: 'Программа 7-20-25',
    rate: 7,
    minDown: 25,
    maxYears: 20,
    maxAmount: 25000000,
    type: 'state',
    color: '#3B82F6',
    conditions: 'Тек жаңа құрылыс. Жарна 25%+. Бастапқы нарық ғана. Halyk, BCC, Forte, Bereke, Bank RBK арқылы.',
    conditionsRu: 'Только новостройки. Взнос 25%+. Только первичный рынок. Через Halyk, BCC, Forte, Bereke, Bank RBK.',
    note: 'Тек жаңа үйлерге',
    noteRu: 'Только новостройки',
  },
  // === КОММЕРЧЕСКИЕ ===
  {
    id: 'halyk',
    bank: 'Halyk Bank',
    name: 'Halyk ипотека',
    nameRu: 'Halyk ипотека',
    rate: 18,
    minDown: 20,
    maxYears: 20,
    maxAmount: 100000000,
    type: 'commercial',
    color: '#0EA5E9',
    conditions: 'Жаңа және екінші нарық. Жарна 20%+. Жалақы картасы Halyk Bank болса — жеңілдік мүмкін.',
    conditionsRu: 'Новое и вторичное жильё. Взнос 20%+. Скидка возможна при зарплатной карте Halyk Bank.',
  },
  {
    id: 'kaspi-ipoteka',
    bank: 'Kaspi Bank',
    name: 'Kaspi ипотека',
    nameRu: 'Kaspi ипотека',
    rate: 19,
    minDown: 30,
    maxYears: 15,
    maxAmount: 50000000,
    type: 'commercial',
    color: '#EF4444',
    conditions: 'Жарна 30%+. 15 жылға дейін. Kaspi.kz қосымшасы арқылы онлайн рәсімдеу. Жылдам мақұлдау.',
    conditionsRu: 'Взнос 30%+. До 15 лет. Онлайн оформление через Kaspi.kz. Быстрое одобрение.',
  },
  {
    id: 'bcc',
    bank: 'Bank CenterCredit',
    name: 'BCC ипотека',
    nameRu: 'BCC ипотека',
    rate: 17.5,
    minDown: 20,
    maxYears: 20,
    maxAmount: 80000000,
    type: 'commercial',
    color: '#F59E0B',
    conditions: 'Жаңа және екінші нарық. Жарна 20%+. Зейнетақы жарнасын растау арқылы.',
    conditionsRu: 'Новое и вторичное жильё. Взнос 20%+. Подтверждение через пенсионные отчисления.',
  },
  {
    id: 'forte',
    bank: 'Forte Bank',
    name: 'ForteIpoteka',
    nameRu: 'ForteIpoteka',
    rate: 18.5,
    minDown: 20,
    maxYears: 20,
    maxAmount: 70000000,
    type: 'commercial',
    color: '#8B5CF6',
    conditions: 'Жаңа және екінші нарық. Жарна 20%+. Мақұлдау 1-3 жұмыс күні.',
    conditionsRu: 'Новое и вторичное жильё. Взнос 20%+. Одобрение за 1-3 рабочих дня.',
  },
  {
    id: 'bereke',
    bank: 'Bereke Bank',
    name: 'Bereke ипотека',
    nameRu: 'Bereke ипотека',
    rate: 17,
    minDown: 20,
    maxYears: 20,
    maxAmount: 60000000,
    type: 'commercial',
    color: '#14B8A6',
    conditions: 'Жаңа және екінші нарық. Жарна 20%+. Мемлекеттік қызметкерлерге жеңілдіктер мүмкін.',
    conditionsRu: 'Новое и вторичное жильё. Взнос 20%+. Возможны льготы для госслужащих.',
  },
  {
    id: 'eurasian',
    bank: 'Евразийский банк',
    name: 'Eurasian ипотека',
    nameRu: 'Eurasian ипотека',
    rate: 19,
    minDown: 20,
    maxYears: 20,
    maxAmount: 60000000,
    type: 'commercial',
    color: '#64748B',
    conditions: 'Жаңа және екінші нарық. Жарна 20%+. Стандартты шарттар.',
    conditionsRu: 'Новое и вторичное жильё. Взнос 20%+. Стандартные условия.',
  },
]

export interface MortgageNews {
  date: string
  title: string
  titleRu: string
  text: string
  textRu: string
  tag: 'new' | 'info' | 'warn'
}

export const MORTGAGE_NEWS: MortgageNews[] = [
  {
    date: '2026-03',
    title: 'Отбасы банк ставкасы 2%-ға дейін төмендеді',
    titleRu: 'Отбасы банк снизил ставку до 2%',
    text: '«Бақытты отбасы» бағдарламасы бойынша көп балалы отбасыларға ипотека ставкасы 2%-ға дейін төмендетілді. 4 және одан көп балалы отбасылар қолдана алады.',
    textRu: 'По программе «Бақытты отбасы» ставка ипотеки для многодетных семей снижена до 2%. Доступна семьям с 4 и более детьми.',
    tag: 'new',
  },
  {
    date: '2026-02',
    title: '7-20-25 бағдарламасы 2027 жылға ұзартылды',
    titleRu: 'Программа 7-20-25 продлена до 2027 года',
    text: 'Үкімет 7-20-25 бағдарламасын 2027 жылдың соңына дейін ұзартты. Шарттар: жаңа құрылыс, 25% жарна, 7% ставка, 20 жыл мерзім. Арызды Halyk, BCC, Forte, Bereke, Bank RBK арқылы беруге болады.',
    textRu: 'Правительство продлило программу 7-20-25 до конца 2027 года. Условия: новостройка, 25% взнос, 7% ставка, 20 лет. Заявки через Halyk, BCC, Forte, Bereke, Bank RBK.',
    tag: 'info',
  },
  {
    date: '2026-01',
    title: 'Коммерциялық ставкалар 17-19% деңгейінде',
    titleRu: 'Коммерческие ставки на уровне 17-19%',
    text: 'Ұлттық банктың базалық ставкасы 14.25%-ға төмендегенімен, коммерциялық банктердің ипотека ставкалары 17-19% деңгейінде қалып отыр. Bereke Bank — ең төменгі коммерциялық ставка (17%).',
    textRu: 'Несмотря на снижение базовой ставки Нацбанка до 14.25%, коммерческие ставки по ипотеке остаются на уровне 17-19%. Bereke Bank — самая низкая коммерческая ставка (17%).',
    tag: 'info',
  },
  {
    date: '2025-12',
    title: 'Kaspi Bank ипотека шарттарын жаңартты',
    titleRu: 'Kaspi Bank обновил условия ипотеки',
    text: 'Kaspi Bank ипотека жарнасын 30%-ға дейін көтерді, бірақ мақұлдау жылдамдығы 10 минутқа дейін қысқарды. Максималды сома — 50 млн ₸, мерзім — 15 жыл.',
    textRu: 'Kaspi Bank повысил первоначальный взнос до 30%, но ускорил одобрение до 10 минут. Максимальная сумма — 50 млн ₸, срок — 15 лет.',
    tag: 'warn',
  },
]
