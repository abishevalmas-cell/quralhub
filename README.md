# Tetix

Подбор запчастей для китайских автомобилей по VIN, фото и описанию с доставкой из Китая в Казахстан и СНГ.

## Запуск

```bash
npm install
cp .env.example .env.local   # для разработки можно оставить пустым
npm run dev
```

Откройте http://localhost:3000/login. Без SMS-шлюза код входа показывается на экране (только в режиме разработки).
Без `DATABASE_URL` используется встроенная база PGlite в `.data/pglite`. Без доступа 17VIN работает режим примеров на синтетических VIN.

## Проверки

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Правила разработки: [CLAUDE.md](CLAUDE.md).
