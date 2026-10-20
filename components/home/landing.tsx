import { Badge, type Tone } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SmartSearch } from "./smart-search";

const STEPS = [
  {
    title: "VIN",
    text: "Вводите VIN из техпаспорта. По нему узнаём модель и комплектацию: без них номер детали не угадать.",
  },
  {
    title: "Номер детали по каталогу",
    text: "Находим OE-номер в каталоге производителя для вашего VIN, а не «примерно для этой модели».",
  },
  {
    title: "Проверка и цена в ₸",
    text: "Подборщик в Китае проверяет совместимость и называет цену в тенге с доставкой. Заказ — только когда вы выбрали вариант.",
  },
  {
    title: "Доставка 8–20 дней",
    text: "Выкупаем деталь у поставщика и везём в ваш город. Статус заказа видно на сайте, а с подключённым ботом — и в Telegram.",
  },
];

const COVERAGE: { tone: Tone; label: string; brands: string[]; text: string }[] = [
  {
    tone: "ok",
    label: "Каталог по VIN",
    brands: ["BYD", "Geely Galaxy", "Changan Deepal"],
    text: "Открываем каталог производителя по VIN и показываем номера деталей с отметкой, что подходит.",
  },
  {
    tone: "hand",
    label: "Ручной подбор",
    brands: ["Li Auto", "Zeekr"],
    text: "Каталога по VIN у поставщика нет. Подборщик ищет по VIN, фото и описанию.",
  },
  {
    tone: "warn",
    label: "Проверяем",
    brands: ["Chery", "Haval", "Jetour"],
    text: "Каталог есть не для всех моделей. Добавьте VIN — сразу покажем, открывается ли он для вашей машины.",
  },
];

// The signed-out home page: what Tetix does, for which cars, and the same search box as after login.
export function Landing() {
  return (
    <div className="grid gap-10 sm:gap-12">
      <section className="grid gap-5 sm:pt-4">
        <div className="grid max-w-3xl gap-3">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Казахстан, Узбекистан, Кыргызстан, Россия</div>
          <h1 className="text-[28px] font-extrabold leading-[1.15] tracking-tight text-balance sm:text-[38px]">
            Запчасти из Китая для китайских машин: по VIN, фото или описанию
          </h1>
          <p className="max-w-2xl text-muted">
            Находим номер детали в каталоге производителя, подборщик в Китае проверяет совместимость и называет цену в тенге с
            доставкой.
          </p>
        </div>
        <div className="max-w-3xl">
          <SmartSearch signedIn={false} vehicles={[]} />
        </div>
      </section>

      <section aria-labelledby="how-it-works" className="grid gap-4">
        <h2 id="how-it-works" className="text-xl font-extrabold tracking-tight">
          Как это работает
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="grid content-start gap-2 rounded-2xl border border-line bg-card p-4">
              <span className="grid size-8 place-items-center rounded-full bg-ink text-sm font-bold text-paper" aria-hidden="true">
                {i + 1}
              </span>
              <h3 className="font-bold leading-snug">{step.title}</h3>
              <p className="text-sm text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="coverage" className="grid gap-4">
        <div className="grid gap-1">
          <h2 id="coverage" className="text-xl font-extrabold tracking-tight">
            Какие машины подбираем
          </h2>
          <p className="text-sm text-muted">Пишем как есть: где каталог по VIN работает, а где деталь ищет человек.</p>
        </div>
        <ul className="grid gap-3 md:grid-cols-3">
          {COVERAGE.map((group) => (
            <li key={group.label} className="grid content-start gap-2 rounded-2xl border border-line bg-card p-4">
              <Badge tone={group.tone} className="justify-self-start">
                {group.label}
              </Badge>
              <p className="font-bold">{group.brands.join(", ")}</p>
              <p className="text-sm text-muted">{group.text}</p>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted">Другая китайская марка? Создайте заявку — подборщик скажет, сможем ли найти деталь.</p>
      </section>

      <Card className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
        <div className="grid gap-1.5">
          <h2 className="text-xl font-extrabold tracking-tight">Для СТО и мастеров</h2>
          <p className="text-muted">
            Машины клиентов в одном гараже, заявки по VIN вместо переписки в мессенджерах, цена в ₸ и срок доставки ещё до
            заказа. После входа включите в профиле режим «Мастер или СТО».
          </p>
        </div>
        <ButtonLink href="/login?next=%2Fprofile" variant="dark" className="justify-self-start">
          Войти как СТО
        </ButtonLink>
      </Card>
    </div>
  );
}
