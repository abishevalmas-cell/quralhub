import { Notice } from "@/components/garage/notice";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { JOURNAL_LIMIT, type ProviderStatusReport } from "@/lib/services/admin";
import { USER_DAILY_LIVE_CALLS } from "@/lib/services/catalog";
import { cn, pluralRu } from "@/lib/utils";
import { astanaDateTime, formatCount } from "./format";
import { CALL_MODE, CALL_OPERATION, CALL_STATUS } from "./labels";

// The newest live answer explains most outages; these are the ones an admin can fix.
const PROBLEMS: Record<string, { title: string; text: string }> = {
  auth: {
    title: "17VIN не принял логин или пароль",
    text: "Проверьте TETIX_17VIN_USER и TETIX_17VIN_PASSWORD на сервере и перезапустите приложение. Пока доступа нет, клиенты оставляют заявки на ручной подбор.",
  },
  quota_or_expired: {
    title: "Пакет запросов 17VIN закончился или истёк",
    text: "Продлите пакет у 17VIN. Пока доступа нет, клиенты оставляют заявки на ручной подбор.",
  },
  not_configured: {
    title: "17VIN не настроен",
    text: "Проверьте переменные TETIX_17VIN_USER и TETIX_17VIN_PASSWORD на сервере.",
  },
};

function Env({ children }: { children: string }) {
  return <code className="rounded bg-card px-1 py-0.5 font-mono text-[13px] break-all">{children}</code>;
}

function Stat({ label, value, note }: { label: string; value: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="grid content-start gap-1 rounded-xl bg-soft px-3 py-2.5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-xl font-bold tracking-[-0.02em] tabular-nums">{value}</dd>
      {note ? <dd className="text-sm text-muted">{note}</dd> : null}
    </div>
  );
}

function UsageBar({ used, limit }: { used: number; limit: number }) {
  const share = limit > 0 ? Math.min(1, used / limit) : 1;
  const tone = share >= 1 ? "bg-bad" : share >= 0.8 ? "bg-warn" : "bg-ok";
  return (
    <div
      role="meter"
      aria-label="Запросы к 17VIN сегодня"
      aria-valuemin={0}
      aria-valuemax={limit}
      aria-valuenow={Math.min(used, limit)}
      aria-valuetext={`${used} из ${limit}`}
      className="h-2.5 overflow-hidden rounded-full bg-soft"
    >
      <div className={cn("h-full rounded-full", tone)} style={{ width: `${Math.round(share * 100)}%` }} />
    </div>
  );
}

export function ProviderPanel({ report }: { report: ProviderStatusReport }) {
  const live = report.mode === "live";
  const left = Math.max(0, report.dailyLimit - report.callsToday);
  const lastLive = report.lastCalls.find((call) => call.mode === "live");
  const problem = live && lastLive ? PROBLEMS[lastLive.status] : undefined;
  const shown = report.lastCalls.length;
  const journalNote =
    shown >= JOURNAL_LIMIT
      ? `Последние ${JOURNAL_LIMIT} обращений, сначала новые.`
      : `${formatCount(shown)} ${pluralRu(shown, "обращение", "обращения", "обращений")}, сначала новые.`;

  return (
    <>
      <Card className="grid gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-bold">Доступ к каталогу</h3>
          <Badge tone={live ? "ok" : "warn"}>{live ? "Живой доступ 17VIN" : "Режим примеров"}</Badge>
        </div>
        <p className="text-[15px]">
          {live
            ? "Расшифровка VIN и каталог идут через 17VIN, каждый запрос оплачивается. Ответы хранятся в кеше: повторная расшифровка того же VIN и повторное открытие страницы каталога бесплатны."
            : "Ключи 17VIN на сервере не заданы. Гараж и каталог показывают синтетические примеры с пометкой «Пример», деньги не тратятся."}
        </p>
        <dl className="grid gap-3 sm:grid-cols-3">
          {live ? (
            <>
              <Stat label="Запросов к 17VIN сегодня" value={`${formatCount(report.callsToday)} из ${formatCount(report.dailyLimit)}`} />
              <Stat label="Осталось на сегодня" value={formatCount(left)} />
            </>
          ) : (
            <>
              <Stat label="Обращений к примерам сегодня" value={formatCount(report.callsToday)} note="Бесплатно, в лимит не входят" />
              <Stat label="Лимит живого доступа" value={`${formatCount(report.dailyLimit)} в сутки`} />
            </>
          )}
          <Stat label="Ответов в кеше" value={formatCount(report.cacheEntries)} note="Повторный запрос из кеша бесплатен" />
        </dl>
        {live ? <UsageBar used={report.callsToday} limit={report.dailyLimit} /> : null}
        <p className="text-sm text-muted">
          Счётчик обнуляется в 00:00 UTC, это 05:00 по Астане. Кроме общего лимита, у клиента {USER_DAILY_LIVE_CALLS.customer} запросов в
          сутки, у мастера {USER_DAILY_LIVE_CALLS.master}; у сотрудников ограничения нет.
        </p>
        <div className="grid gap-1.5 rounded-xl border border-line bg-soft px-4 py-3 text-sm">
          <p>
            Логин и пароль 17VIN задаются на сервере в переменных <Env>TETIX_17VIN_USER</Env> и <Env>TETIX_17VIN_PASSWORD</Env>. Здесь
            они не показываются и в базе не хранятся.
          </p>
          <p>
            Дневной лимит — переменная <Env>TETIX_17VIN_DAILY_LIMIT</Env>. После изменения переменных перезапустите приложение.
          </p>
        </div>
      </Card>

      {live && left === 0 ? (
        <Notice tone="warn" title="Дневной лимит запросов исчерпан">
          Новые запросы к 17VIN пройдут после 05:00 по Астане. До этого работают только ответы из кеша, а клиенты могут оставить заявку на
          ручной подбор.
        </Notice>
      ) : null}
      {problem ? (
        <Notice tone="bad" title={problem.title}>
          {problem.text}
        </Notice>
      ) : null}

      <Card className="grid gap-3 p-4 sm:p-5">
        <div>
          <h3 className="text-lg font-bold">Журнал запросов</h3>
          <p className="mt-1 text-sm text-muted">
            {journalNote} VIN показан только началом и концом. Ответы из кеша сюда не попадают.
          </p>
        </div>
        {report.lastCalls.length === 0 ? (
          <p className="rounded-xl bg-soft px-4 py-6 text-center text-muted">Обращений к каталогу ещё не было.</p>
        ) : (
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Последние обращения к каталогу 17VIN</caption>
              <thead className="border-b border-line text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2 font-semibold sm:pl-0">
                    Запрос
                  </th>
                  <th scope="col" className="px-2 py-2 font-semibold">
                    Что искали
                  </th>
                  <th scope="col" className="py-2 pr-4 pl-2 font-semibold sm:pr-2">
                    Ответ
                  </th>
                  <th scope="col" className="hidden px-2 py-2 text-right font-semibold sm:table-cell sm:pr-0">
                    Время ответа
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {report.lastCalls.map((call) => {
                  const status = CALL_STATUS[call.status] ?? { label: call.status, tone: "neutral" as const };
                  return (
                    <tr key={call.id} className="align-top">
                      <td className="px-4 py-2.5 sm:pl-0">
                        <div className="font-semibold">{CALL_OPERATION[call.operation] ?? call.operation}</div>
                        <div className="text-xs whitespace-nowrap text-muted tabular-nums">
                          <time dateTime={new Date(call.createdAt).toISOString()}>{astanaDateTime(call.createdAt)}</time>
                          {" · "}
                          {CALL_MODE[call.mode] ?? call.mode}
                        </div>
                      </td>
                      <td className="max-w-48 px-2 py-2.5 font-mono text-xs break-all">{call.inputMask}</td>
                      <td className="py-2.5 pr-4 pl-2 sm:pr-2">
                        <Badge tone={status.tone}>{status.label}</Badge>
                        {call.providerCode !== null ? (
                          <div className="mt-0.5 text-xs text-muted tabular-nums">код {call.providerCode}</div>
                        ) : null}
                        {call.status !== "pending" ? (
                          <div className="text-xs text-muted tabular-nums sm:hidden">{formatCount(call.durationMs)} мс</div>
                        ) : null}
                      </td>
                      <td className="hidden px-2 py-2.5 text-right whitespace-nowrap tabular-nums sm:table-cell sm:pr-0">
                        {call.status === "pending" ? "—" : `${formatCount(call.durationMs)} мс`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted">Время по Астане (UTC+5).</p>
      </Card>
    </>
  );
}
