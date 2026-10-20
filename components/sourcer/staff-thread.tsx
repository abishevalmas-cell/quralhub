import type { StaffMessage } from "@/lib/services/sourcing";
import { cn, formatDateTime } from "@/lib/utils";
import { Zh } from "./zh";

// The whole conversation as staff see it. Internal notes are marked so nobody mistakes them for what the customer read.
export function StaffThread({ messages, customerName }: { messages: StaffMessage[]; customerName: string }) {
  if (!messages.length) return <p className="text-sm text-muted">Сообщений пока нет.</p>;
  return (
    <ol className="grid gap-3">
      {messages.map((m) => {
        const time = <time dateTime={new Date(m.createdAt).toISOString()}>{formatDateTime(m.createdAt)}</time>;
        const internalTag = (
          <>
            Внутренняя заметка <Zh>内部</Zh>
          </>
        );
        if (m.from === "system")
          return (
            <li key={m.id} className="flex justify-center">
              <span className="max-w-[92%] rounded-[12px] bg-soft px-3 py-1.5 text-center text-[13px] text-muted">
                {m.internal ? <span className="font-semibold text-hand">{internalTag} · </span> : null}
                <span className="whitespace-pre-line">{m.body}</span> · {time}
              </span>
            </li>
          );
        const author = m.from === "customer" ? `Клиент · ${customerName}` : m.mine ? "Вы" : m.authorName || "Подборщик";
        if (m.internal)
          return (
            <li key={m.id} className="flex justify-end">
              <div className="grid max-w-[90%] gap-1 rounded-[18px] rounded-br-md border border-dashed border-hand/60 bg-hand-bg px-4 py-2.5">
                <div className="text-xs font-bold text-hand">
                  {internalTag} · {author} · {time}
                </div>
                <p className="whitespace-pre-line break-words text-[15px]">{m.body}</p>
              </div>
            </li>
          );
        const fromCustomer = m.from === "customer";
        return (
          <li key={m.id} className={cn("flex", fromCustomer ? "justify-start" : "justify-end")}>
            <div
              className={cn(
                "grid max-w-[85%] gap-1 rounded-[18px] px-4 py-2.5",
                fromCustomer ? "rounded-bl-md border border-line bg-card" : "rounded-br-md bg-strong text-on-strong",
              )}
            >
              <div className={cn("text-xs font-semibold", fromCustomer ? "text-muted" : "text-on-strong/70")}>
                {author} · {time}
              </div>
              <p className="whitespace-pre-line break-words text-[15px]">{m.body}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
