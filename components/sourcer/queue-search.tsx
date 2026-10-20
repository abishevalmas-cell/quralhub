import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SearchBox } from "@/components/ui/field";
import type { QueueView } from "@/lib/services/sourcing";
import { queueHref } from "./queue-tabs";

// A plain GET form: works before scripts load and keeps the search in the URL.
export function QueueSearch({ view, q }: { view: QueueView; q: string }) {
  return (
    <form action="/sourcer" method="get" role="search" className="mb-5 grid gap-1.5">
      {view !== "new" ? <input type="hidden" name="view" value={view} /> : null}
      <SearchBox
        id="queue-q"
        name="q"
        showLabel
        label={
          <>
            Поиск по номеру, названию, OE или концу VIN <span className="zh font-normal text-muted" lang="zh">搜索</span>
          </>
        }
        defaultValue={q}
        maxLength={100}
        placeholder="№ 1024, колодки, 10273368-00, 8460"
      >
        <Button type="submit" variant="strong" className="shrink-0">
          Найти
        </Button>
      </SearchBox>
      {q ? (
        <Link href={queueHref(view)} className="justify-self-start text-sm font-semibold text-muted underline">
          Сбросить поиск
        </Link>
      ) : null}
    </form>
  );
}
