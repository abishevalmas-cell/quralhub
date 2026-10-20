import type { CustomerRequestView } from "@/lib/services/requests";
import { cn, formatDateTime } from "@/lib/utils";

type Message = CustomerRequestView["messages"][number];

export function MessageThread({ messages }: { messages: Message[] }) {
  if (!messages.length) return <p className="text-sm text-muted">Сообщений пока нет.</p>;
  return (
    <ol className="grid gap-3">
      {messages.map((m) => {
        const time = <time dateTime={new Date(m.createdAt).toISOString()}>{formatDateTime(m.createdAt)}</time>;
        if (m.from === "system")
          return (
            <li key={m.id} className="px-2 text-center text-sm text-muted">
              <span className="whitespace-pre-line">{m.body}</span> · {time}
            </li>
          );
        const mine = m.from === "customer";
        return (
          <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "grid max-w-[85%] gap-1 rounded-2xl px-4 py-2.5",
                mine ? "rounded-br-md bg-ink text-paper" : "rounded-bl-md border border-line bg-card",
              )}
            >
              <div className={cn("text-xs font-semibold", mine ? "text-paper/70" : "text-muted")}>
                {mine ? "Вы" : "Подборщик"} · {time}
              </div>
              <p className="whitespace-pre-line break-words text-[15px]">{m.body}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
