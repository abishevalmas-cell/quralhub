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

## Telegram

Уведомления клиентам и подборщикам идут через бота. Без `TELEGRAM_BOT_TOKEN` они пишутся в лог сервера.

1. Создайте бота у @BotFather и задайте `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` (без @) и случайный `TELEGRAM_WEBHOOK_SECRET`.
2. Укажите `APP_URL` — публичный адрес сайта: по нему строятся ссылки в уведомлениях.
3. Подключите вебхук:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=$APP_URL/api/telegram/webhook" -d "secret_token=$TELEGRAM_WEBHOOK_SECRET" -d 'allowed_updates=["message"]'
```

Клиент подключает уведомления в профиле: кнопка открывает бота со ссылкой `/start <токен>`.

## Проверки

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Правила разработки: [CLAUDE.md](CLAUDE.md).
