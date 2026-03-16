export interface WordOfDay {
  kk: string
  ru: string
  en: string
  type: string       // part of speech
  example: string    // example sentence KZ
  exampleRu: string  // example sentence RU
  origin?: string    // etymology note
}

// 30 rare/interesting/archaic Kazakh words — rotating daily
export const WORDS_OF_DAY: WordOfDay[] = [
  { kk: 'сағыныш', ru: 'тоска, ностальгия', en: 'longing, nostalgia', type: 'зат есім', example: 'Туған жерге сағыныш — ең күшті сезім.', exampleRu: 'Тоска по родине — сильнейшее чувство.', origin: 'Тюркское «сағын» — скучать' },
  { kk: 'жұлдыз', ru: 'звезда', en: 'star', type: 'зат есім', example: 'Аспандағы жұлдыз жарқырап тұр.', exampleRu: 'Звезда на небе ярко сияет.' },
  { kk: 'тұмар', ru: 'оберег, талисман', en: 'amulet, talisman', type: 'зат есім', example: 'Әжем маған тұмар тағып берді.', exampleRu: 'Бабушка повесила мне тумар (оберег).', origin: 'Древнетюркский оберег треугольной формы' },
  { kk: 'мейірім', ru: 'милосердие, доброта', en: 'mercy, kindness', type: 'зат есім', example: 'Мейірімді адам — бақытты адам.', exampleRu: 'Добрый человек — счастливый человек.' },
  { kk: 'шаттық', ru: 'радость, веселье', en: 'joy, happiness', type: 'зат есім', example: 'Балалардың шаттығы үйді нұрландырды.', exampleRu: 'Радость детей озарила дом.' },
  { kk: 'ерлік', ru: 'героизм, подвиг', en: 'heroism, feat', type: 'зат есім', example: 'Батырлардың ерлігі жырда жатталды.', exampleRu: 'Подвиги батыров запечатлены в эпосе.', origin: 'Ер — мужчина, герой' },
  { kk: 'тілек', ru: 'пожелание, мечта', en: 'wish, desire', type: 'зат есім', example: 'Бүгін сенің тілегің орындалсын!', exampleRu: 'Пусть сегодня твоё желание исполнится!' },
  { kk: 'жаңбыр', ru: 'дождь', en: 'rain', type: 'зат есім', example: 'Көктемгі жаңбыр жерге жылылық әкелді.', exampleRu: 'Весенний дождь принёс тепло земле.' },
  { kk: 'қонақжай', ru: 'гостеприимство', en: 'hospitality', type: 'сын есім', example: 'Қазақ халқы — қонақжай халық.', exampleRu: 'Казахский народ — гостеприимный народ.', origin: 'Қонақ (гость) + жай (место)' },
  { kk: 'думан', ru: 'веселье, празднество', en: 'festivity, revelry', type: 'зат есім', example: 'Тойда думан басталды.', exampleRu: 'На свадьбе началось веселье.' },
  { kk: 'арман', ru: 'мечта', en: 'dream', type: 'зат есім', example: 'Арманыңа жету — ең үлкен бақыт.', exampleRu: 'Достичь мечты — величайшее счастье.' },
  { kk: 'бесік', ru: 'колыбель', en: 'cradle', type: 'зат есім', example: 'Бесік жыры — ананың алғашқы әні.', exampleRu: 'Колыбельная — первая песня матери.', origin: 'Традиционная казахская деревянная колыбель' },
  { kk: 'көкпар', ru: 'козлодрание', en: 'kokpar (horseback game)', type: 'зат есім', example: 'Көкпар — қазақтың ұлттық ойыны.', exampleRu: 'Кокпар — национальная казахская игра.', origin: 'Көк (синий) + пар (туша)' },
  { kk: 'шаңырақ', ru: 'шанырак (верх юрты / семейный очаг)', en: 'shanyrak (yurt crown / family hearth)', type: 'зат есім', example: 'Шаңырағыңды шайқалтпа!', exampleRu: 'Не позволь пошатнуться шаныраку!', origin: 'Верхняя часть юрты, символ семьи на гербе КЗ' },
  { kk: 'көктем', ru: 'весна', en: 'spring', type: 'зат есім', example: 'Көктемде табиғат оянады.', exampleRu: 'Весной природа пробуждается.' },
  { kk: 'дастархан', ru: 'дастархан (скатерть / стол)', en: 'dastarkhan (table spread)', type: 'зат есім', example: 'Дастарханға отырыңыз!', exampleRu: 'Пожалуйста, садитесь к дастархану!', origin: 'Персидское слово, символ гостеприимства' },
  { kk: 'жігер', ru: 'энергия, воля', en: 'energy, willpower', type: 'зат есім', example: 'Жігеріңді жоғалтпа!', exampleRu: 'Не теряй силы воли!' },
  { kk: 'тыныштық', ru: 'тишина, покой', en: 'silence, peace', type: 'зат есім', example: 'Далада тыныштық орнады.', exampleRu: 'В степи воцарилась тишина.' },
  { kk: 'сезім', ru: 'чувство', en: 'feeling, sense', type: 'зат есім', example: 'Махаббат — ең күшті сезім.', exampleRu: 'Любовь — самое сильное чувство.' },
  { kk: 'білім', ru: 'знание, образование', en: 'knowledge, education', type: 'зат есім', example: 'Білім — бақыттың кілті.', exampleRu: 'Знание — ключ к счастью.' },
  { kk: 'домбыра', ru: 'домбра', en: 'dombra (instrument)', type: 'зат есім', example: 'Домбыра — қазақ музыкасының жүрегі.', exampleRu: 'Домбра — сердце казахской музыки.', origin: 'Двуструнный щипковый инструмент' },
  { kk: 'батыр', ru: 'богатырь, герой', en: 'hero, warrior', type: 'зат есім', example: 'Қобыланды — ұлы батыр.', exampleRu: 'Кобыланды — великий батыр.', origin: 'Baatur — монгольско-тюркское слово' },
  { kk: 'құрмет', ru: 'уважение, почёт', en: 'respect, honour', type: 'зат есім', example: 'Ұлыларға құрмет — біздің дәстүр.', exampleRu: 'Уважение к старшим — наша традиция.' },
  { kk: 'жыр', ru: 'эпос, поэма', en: 'epic poem', type: 'зат есім', example: '«Қыз Жібек» — ұлы жыр.', exampleRu: '«Кыз Жибек» — великий эпос.', origin: 'Устная эпическая традиция казахов' },
  { kk: 'ырым', ru: 'примета, поверье', en: 'omen, superstition', type: 'зат есім', example: 'Бесікке бөбек салу — ырым.', exampleRu: 'Укладывание младенца в бесик — обычай.', origin: 'Казахские народные приметы и обряды' },
  { kk: 'даму', ru: 'развитие', en: 'development', type: 'зат есім', example: 'Елдің дамуы — халықтың тілеуі.', exampleRu: 'Развитие страны — желание народа.' },
  { kk: 'кеңістік', ru: 'пространство', en: 'space', type: 'зат есім', example: 'Ғарыш кеңістігі — шексіз.', exampleRu: 'Космическое пространство — бесконечно.' },
  { kk: 'тарих', ru: 'история', en: 'history', type: 'зат есім', example: 'Тарихты білу — болашақты түсіну.', exampleRu: 'Знать историю — понимать будущее.', origin: 'Арабское «tarikh»' },
  { kk: 'намыс', ru: 'честь, достоинство', en: 'honour, dignity', type: 'зат есім', example: 'Намыс — адамның ең қымбат қасиеті.', exampleRu: 'Честь — самое ценное качество человека.', origin: 'Центральное понятие казахской этики' },
  { kk: 'алтын', ru: 'золото', en: 'gold', type: 'зат есім', example: 'Алтын алма, білім ал.', exampleRu: 'Не бери золото — бери знание.', origin: 'Тюркское слово, ставшее именем' },
]

export function getWordOfDay(): WordOfDay {
  const now = new Date()
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)
  return WORDS_OF_DAY[dayOfYear % WORDS_OF_DAY.length]
}
