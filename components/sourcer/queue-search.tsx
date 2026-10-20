import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import type { QueueView } from "@/lib/services/sourcing";
import { queueHref } from "./queue-tabs";

// A plain GET form: works before scripts load and keeps the search in the URL.
export function QueueSearch({ view, q }: { view: QueueView; q: string }) {
  return (
    <form action="/sourcer" method="get" role="search" className="mb-5 grid gap-1.5">
      <label htmlFor="queue-q" className="text-sm font-semibold">
        Поиск по номеру, названию, OE или концу VIN <span className="zh font-normal text-muted" lang="zh">搜索</span>
      </label>
      <div className="flex gap-2">
        {view !== "new" ? <input type="hidden" name="view" value={view} /> : null}
        <Input id="queue-q" name="q" type="search" defaultValue={q} maxLength={100} placeholder="№ 1024, колодки, 10273368-00, 8460" />
        <Button type="submit" variant="soft" aria-label="Найти" className="px-3">
          <Icon name="search" />
        </Button>
      </div>
      {q ? (
        <Link href={queueHref(view)} className="justify-self-start text-sm font-semibold text-muted underline">
          Сбросить поиск
        </Link>
      ) : null}
    </form>
  );
}
