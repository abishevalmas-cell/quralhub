export interface Fine {
  id: string
  category: string
  description: string
  descriptionRu: string
  mrp: number
  amount: number // mrp × 4325
  article: string
  repeat?: number // повторное нарушение MRP
  note?: string
}

export const FINE_CATEGORIES = [
  { id: 'speed', name: 'Жылдамдық', nameRu: 'Скорость', icon: '🏎️' },
  { id: 'parking', name: 'Тұрақ', nameRu: 'Парковка', icon: '🅿️' },
  { id: 'docs', name: 'Құжаттар', nameRu: 'Документы', icon: '📄' },
  { id: 'belt', name: 'Қауіпсіздік', nameRu: 'Безопасность', icon: '🔒' },
  { id: 'drunk', name: 'Алкоголь', nameRu: 'Алкоголь', icon: '🚫' },
  { id: 'signals', name: 'Сигналдар', nameRu: 'Сигналы/знаки', icon: '🚦' },
  { id: 'other', name: 'Басқа', nameRu: 'Прочее', icon: '⚠️' },
]

export const FINES: Fine[] = [
  // Speed violations
  { id: 'speed-10-20', category: 'speed', description: 'Жылдамдықты 10-20 км/с асыру', descriptionRu: 'Превышение на 10-20 км/ч', mrp: 5, amount: 21625, article: '592-бап 1-бөлік' },
  { id: 'speed-20-40', category: 'speed', description: 'Жылдамдықты 20-40 км/с асыру', descriptionRu: 'Превышение на 20-40 км/ч', mrp: 10, amount: 43250, article: '592-бап 2-бөлік' },
  { id: 'speed-40-60', category: 'speed', description: 'Жылдамдықты 40-60 км/с асыру', descriptionRu: 'Превышение на 40-60 км/ч', mrp: 20, amount: 86500, article: '592-бап 3-бөлік', repeat: 40 },
  { id: 'speed-60+', category: 'speed', description: 'Жылдамдықты 60+ км/с асыру', descriptionRu: 'Превышение на 60+ км/ч', mrp: 30, amount: 129750, article: '592-бап 4-бөлік', note: 'Куәлік 6 айға алынуы мүмкін' },

  // Parking
  { id: 'park-sidewalk', category: 'parking', description: 'Жаяу жүргіншілер жолына тұрақтау', descriptionRu: 'Парковка на тротуаре', mrp: 5, amount: 21625, article: '597-бап' },
  { id: 'park-disabled', category: 'parking', description: 'Мүгедектер орнына тұрақтау', descriptionRu: 'Парковка на месте для инвалидов', mrp: 10, amount: 43250, article: '597-бап 3-бөлік' },
  { id: 'park-crosswalk', category: 'parking', description: 'Өту жолында тұрақтау', descriptionRu: 'Парковка на пешеходном переходе', mrp: 5, amount: 21625, article: '597-бап' },
  { id: 'park-bus', category: 'parking', description: 'Аялдамада тұрақтау', descriptionRu: 'Парковка на остановке', mrp: 5, amount: 21625, article: '597-бап' },

  // Documents
  { id: 'no-license', category: 'docs', description: 'Куәліксіз жүру', descriptionRu: 'Вождение без прав', mrp: 10, amount: 43250, article: '612-бап' },
  { id: 'no-insurance', category: 'docs', description: 'Сақтандырусыз жүру', descriptionRu: 'Без страховки', mrp: 5, amount: 21625, article: '613-бап' },
  { id: 'no-techcheck', category: 'docs', description: 'Техкөріксіз жүру', descriptionRu: 'Без техосмотра', mrp: 5, amount: 21625, article: '590-бап' },
  { id: 'expired-license', category: 'docs', description: 'Мерзімі өткен куәлік', descriptionRu: 'Просроченные права', mrp: 15, amount: 64875, article: '612-бап 3-бөлік' },

  // Safety
  { id: 'no-belt', category: 'belt', description: 'Белбеусіз жүру', descriptionRu: 'Без ремня безопасности', mrp: 5, amount: 21625, article: '593-бап' },
  { id: 'no-child-seat', category: 'belt', description: 'Балалар орындығынсыз', descriptionRu: 'Без детского кресла', mrp: 10, amount: 43250, article: '593-бап 2-бөлік' },
  { id: 'phone', category: 'belt', description: 'Телефонмен сөйлесу', descriptionRu: 'Разговор по телефону', mrp: 5, amount: 21625, article: '594-бап' },

  // Alcohol
  { id: 'drunk-first', category: 'drunk', description: 'Мас күйде жүру (бірінші рет)', descriptionRu: 'Вождение в нетрезвом (первый раз)', mrp: 50, amount: 216250, article: '608-бап', note: 'Куәлік 3 жылға алынады' },
  { id: 'drunk-repeat', category: 'drunk', description: 'Мас күйде жүру (қайталап)', descriptionRu: 'Повторное вождение в нетрезвом', mrp: 200, amount: 865000, article: '608-бап 3-бөлік', note: 'Қылмыстық жауапкершілік' },
  { id: 'refuse-test', category: 'drunk', description: 'Медициналық тексерістен бас тарту', descriptionRu: 'Отказ от медосвидетельствования', mrp: 50, amount: 216250, article: '608-бап 2-бөлік', note: 'Куәлік 3 жылға алынады' },

  // Signals
  { id: 'red-light', category: 'signals', description: 'Қызыл бағдаршамнан өту', descriptionRu: 'Проезд на красный', mrp: 10, amount: 43250, article: '596-бап', repeat: 20 },
  { id: 'wrong-lane', category: 'signals', description: 'Қарсы жолақпен жүру', descriptionRu: 'Выезд на встречную полосу', mrp: 15, amount: 64875, article: '596-бап 3-бөлік', note: 'Куәлік 6 айға алынуы мүмкін' },
  { id: 'no-turn-signal', category: 'signals', description: 'Бұрылыс сигналынсыз', descriptionRu: 'Без сигнала поворота', mrp: 3, amount: 12975, article: '595-бап' },

  // Other
  { id: 'tinted-windows', category: 'other', description: 'Рұқсатсыз тонировка', descriptionRu: 'Незаконная тонировка', mrp: 10, amount: 43250, article: '590-бап 6-бөлік' },
  { id: 'no-plates', category: 'other', description: 'Нөмірсіз жүру', descriptionRu: 'Без номерных знаков', mrp: 15, amount: 64875, article: '590-бап 3-бөлік' },
  { id: 'pedestrian', category: 'other', description: 'Жаяу жүргіншіге жол бермеу', descriptionRu: 'Непропуск пешехода', mrp: 10, amount: 43250, article: '600-бап' },
  { id: 'accident-leave', category: 'other', description: 'Апат орнынан кету', descriptionRu: 'Оставление места ДТП', mrp: 30, amount: 129750, article: '610-бап', note: 'Куәлік 1 жылға алынуы мүмкін' },
]
