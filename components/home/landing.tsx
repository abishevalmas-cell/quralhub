import Link from "next/link";
import { CATALOG_STATUS, CATALOG_STATUS_ORDER } from "@/components/models/catalog-status";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/card";
import { BRANDS } from "@/lib/catalog";

const STEPS = [
  {
    title: "Введите VIN",
    text: "Вводите VIN из техпаспорта. По нему узнаём модель и комплектацию: без них номер детали не угадать.",
  },
  {
    title: "Номер детали по каталогу",
    text: "Находим OE-номер в каталоге производителя для вашего VIN, а не «примерно для этой модели».",
  },
  {
    title: "Проверка и цена в ₸",
    text: "Подборщик в Китае проверяет совместимость и называет цену в тенге с доставкой. Заказ — только когда вы выбрали вариант.",
  },
  {
    title: "Доставка 8–20 дней",
    text: "Выкупаем деталь у поставщика и везём в ваш город. Статус заказа видно на сайте, а с подключённым ботом — и в Telegram.",
  },
];

// Brands without a parent are listed; sub-brands (Exeed, Haval, Deepal…) are named by their own status.
const coverage = CATALOG_STATUS_ORDER.map((status) => ({
  status,
  ...CATALOG_STATUS[status],
  brands: BRANDS.filter((b) => b.catalogStatus === status).map((b) => b.name),
}));

// For visitors who are not signed in: how Tetix works and, honestly, for which brands the VIN catalog works.
export function HowItWorks() {
  return (
    <>
      <section aria-labelledby="how-it-works">
        <SectionHeading id="how-it-works" title="Как это работает" />
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="grid content-start gap-2 rounded-[14px] border border-line bg-card p-4">
              <span className="grid size-8 place-items-center rounded-full bg-strong text-sm font-bold text-strong-lime" aria-hidden="true">
                {i + 1}
              </span>
              <h3 className="font-bold leading-snug">{step.title}</h3>
              <p className="text-sm text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="coverage">
        <SectionHeading id="coverage" title="Какие машины подбираем" note={<Link href="/models" className="font-semibold underline underline-offset-4">Все модели</Link>} />
        <p className="-mt-2 mb-4 text-sm text-muted">Пишем как есть: где каталог по VIN работает, а где деталь ищет человек.</p>
        <ul className="grid gap-3 md:grid-cols-3">
          {coverage.map((group) => (
            <li key={group.status} className="grid content-start gap-2 rounded-[14px] border border-line bg-card p-4">
              <Badge tone={group.tone} className="justify-self-start">
                {group.label}
              </Badge>
              <p className="font-bold">{group.brands.join(", ")}</p>
              <p className="text-sm text-muted">{group.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">Другая китайская марка? Создайте заявку — подборщик скажет, сможем ли найти деталь.</p>
      </section>
    </>
  );
}

// "Вы мастер или работаете в СТО?" of the original page: the master mode is switched on in the profile.
export function MasterBanner({ signedIn }: { signedIn: boolean }) {
  return (
    <section
      aria-labelledby="master-banner"
      className="mt-8 flex flex-col gap-4 rounded-[18px] border border-stage-line bg-stage-b p-[18px] sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-[22px]"
    >
      <div className="min-w-0">
        <h2 id="master-banner" className="text-lg font-bold tracking-[-0.02em]">
          Вы мастер или работаете в СТО?
        </h2>
        <p className="mt-1 text-sm text-muted">
          Машины клиентов в одном гараже, заявки по VIN вместо переписки и цена в ₸ ещё до заказа. Режим мастера включается в профиле.
        </p>
      </div>
      <ButtonLink href={signedIn ? "/profile" : "/login?next=%2Fprofile"} variant="strong" className="shrink-0 self-start sm:self-auto">
        Кабинет мастера
      </ButtonLink>
    </section>
  );
}
