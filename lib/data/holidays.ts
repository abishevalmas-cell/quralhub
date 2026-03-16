export interface Holiday {
  date: string
  name: string
  nameRu: string
  days: number
  endDate?: string
}

export const HOLIDAYS_2026: Holiday[] = [
  { date: '2026-01-01', name: 'Жаңа жыл', nameRu: 'Новый год', days: 2, endDate: '2026-01-02' },
  { date: '2026-01-07', name: 'Православ Рождествосы', nameRu: 'Рождество', days: 1 },
  { date: '2026-03-08', name: 'Халықаралық әйелдер күні', nameRu: 'Международный женский день', days: 1 },
  { date: '2026-03-21', name: 'Наурыз мейрамы', nameRu: 'Наурыз', days: 3, endDate: '2026-03-23' },
  { date: '2026-05-01', name: 'Бірлік күні', nameRu: 'День единства', days: 1 },
  { date: '2026-05-07', name: 'Отан қорғаушылар күні', nameRu: 'День защитника Отечества', days: 1 },
  { date: '2026-05-09', name: 'Жеңіс күні', nameRu: 'День Победы', days: 1 },
  { date: '2026-06-27', name: 'Ораза айт', nameRu: 'Ураза-байрам', days: 1 },
  { date: '2026-07-06', name: 'Астана күні', nameRu: 'День столицы', days: 1 },
  { date: '2026-08-30', name: 'Конституция күні', nameRu: 'День Конституции', days: 1 },
  { date: '2026-09-03', name: 'Құрбан айт', nameRu: 'Курбан-байрам', days: 1 },
  { date: '2026-10-25', name: 'Республика күні', nameRu: 'День Республики', days: 1 },
  { date: '2026-12-01', name: 'Тұңғыш Президент күні', nameRu: 'День Первого Президента', days: 1 },
  { date: '2026-12-16', name: 'Тәуелсіздік күні', nameRu: 'День Независимости', days: 2, endDate: '2026-12-17' },
]
