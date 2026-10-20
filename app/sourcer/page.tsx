import { redirect } from "next/navigation";
import { QueueCard } from "@/components/sourcer/queue-card";
import { QueueSearch } from "@/components/sourcer/queue-search";
import { queueHref, QueueTabs } from "@/components/sourcer/queue-tabs";
import { StaffOnly } from "@/components/sourcer/staff-only";
import { Zh } from "@/components/sourcer/zh";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { getActor } from "@/lib/auth/current";
import { isStaff } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { listQueue, parseQueueView, queueCounts, type QueueView } from "@/lib/services/sourcing";

export const metadata = { title: "Подбор · 采购" };

type Props = { searchParams: Promise<{ view?: string | string[]; q?: string | string[] }> };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const EMPTY: Record<QueueView, { title: string; text: string }> = {
  new: { title: "Новых заявок нет", text: "Все заявки разобраны. Когда клиент отправит новую, она появится здесь." },
  mine: { title: "У вас нет заявок в работе", text: "Возьмите заявку во вкладке «Новые»." },
  clarification: { title: "Никто не ждёт ответа клиента", text: "Здесь появятся заявки, по которым вы задали клиенту вопрос." },
  offered: { title: "Нет заявок с предложениями", text: "Здесь появятся заявки, где клиент выбирает из ваших вариантов." },
  all: { title: "Заявок пока нет", text: "Когда клиенты отправят заявки, они появятся здесь." },
};

export default async function SourcerQueuePage({ searchParams }: Props) {
  const actor = await getActor();
  if (!actor) redirect("/login?next=/sourcer");
  if (!isStaff(actor)) return <StaffOnly />;

  const params = await searchParams;
  const view = parseQueueView(first(params.view));
  const q = first(params.q).replace(/\s+/g, " ").trim().slice(0, 100);
  const db = await getDb();
  const [items, counts] = await Promise.all([listQueue(db, actor, { view, q }), queueCounts(db, actor)]);
  const now = new Date();
  const empty = EMPTY[view];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow={
          <>
            Подбор <Zh>采购</Zh>
          </>
        }
        title={
          <>
            Очередь заявок <Zh className="text-muted">询价队列</Zh>
          </>
        }
        actions={
          <ButtonLink href="/sourcer/orders" variant="soft">
            Заказы <Zh className="font-normal">订单</Zh>
          </ButtonLink>
        }
      >
        Возьмите заявку, найдите деталь по VIN и отправьте клиенту варианты с ценой и сроком.
      </PageHeader>

      <QueueTabs view={view} q={q} counts={counts} />
      <QueueSearch view={view} q={q} />

      {items.length ? (
        <ul className="grid gap-3" aria-label="Заявки">
          {items.map((item) => (
            <li key={item.id}>
              <QueueCard item={item} now={now} />
            </li>
          ))}
        </ul>
      ) : q ? (
        <EmptyState
          title={`Ничего не нашли по «${q}»`}
          action={
            <ButtonLink href={queueHref(view)} variant="soft">
              Сбросить поиск
            </ButtonLink>
          }
        >
          Проверьте номер заявки или OE. VIN ищется по последним 4–6 знакам. Попробуйте вкладку «Все».
        </EmptyState>
      ) : (
        <EmptyState
          title={empty.title}
          action={
            view === "mine" ? (
              <ButtonLink href={queueHref("new")} variant="soft">
                Открыть новые
              </ButtonLink>
            ) : undefined
          }
        >
          {empty.text}
        </EmptyState>
      )}
    </div>
  );
}
