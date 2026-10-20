"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { api } from "@/lib/client/api";
import type { TelegramStatus } from "@/lib/services/telegram";

// The deep link carries a token that is valid for 30 minutes; it is renewed well before that while the page is open.
const REFRESH_MS = 10 * 60 * 1000;
const ENDPOINT = "/api/profile/telegram";

export function TelegramCard({ linked, url }: TelegramStatus) {
  const router = useRouter();
  const [fresh, setFresh] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const href = fresh ?? url;

  useEffect(() => {
    if (linked || !url) return;
    const timer = window.setInterval(() => {
      api<TelegramStatus>(ENDPOINT)
        .then((status) => status.url && setFresh(status.url))
        .catch(() => undefined);
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [linked, url]);

  // Back from Telegram: if the bot has linked the chat, show it without a manual reload.
  useEffect(() => {
    if (!waiting || linked) return;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      api<TelegramStatus>(ENDPOINT)
        .then((status) => {
          if (status.linked) router.refresh();
        })
        .catch(() => undefined);
    };
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [waiting, linked, router]);

  async function verify() {
    setBusy(true);
    setMessage(null);
    try {
      const status = await api<TelegramStatus>(ENDPOINT);
      if (status.linked) router.refresh();
      else {
        if (status.url) setFresh(status.url);
        setMessage("Пока не подключено. Откройте бота по кнопке выше и нажмите «Старт».");
      }
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function unlink() {
    setBusy(true);
    setMessage(null);
    try {
      await api(ENDPOINT, { method: "DELETE" });
      setWaiting(false);
      router.refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Уведомления в Telegram</h2>
        {linked ? <Badge tone="ok">Подключено</Badge> : href ? <Badge>Не подключено</Badge> : <Badge>Скоро</Badge>}
      </div>

      {linked ? (
        <>
          <p className="text-[15px] text-muted">
            Пишем в Telegram, когда подборщик ответил, пришли предложения или заказ сменил статус.
          </p>
          <div>
            <Button type="button" variant="ghost" onClick={unlink} disabled={busy} className="-ml-4">
              Отключить
            </Button>
          </div>
        </>
      ) : href ? (
        <>
          <p className="text-[15px] text-muted">
            Пришлём сообщение, когда подборщик ответит, появятся предложения или заказ сменит статус.
          </p>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={href} target="_blank" rel="noopener noreferrer" variant="dark" onClick={() => setWaiting(true)}>
              <Icon name="chat" />
              Подключить Telegram
            </ButtonLink>
            {waiting ? (
              <Button type="button" variant="soft" onClick={verify} disabled={busy}>
                {busy ? "Проверяем…" : "Проверить"}
              </Button>
            ) : null}
          </div>
          <p className="text-sm text-muted">
            {waiting
              ? "В Telegram нажмите «Старт». Бот ответит «Готово», и здесь появится отметка «Подключено»."
              : "Ссылка действует 30 минут. Не пересылайте её: по ней чат привяжется к вашему аккаунту."}
          </p>
        </>
      ) : (
        <p className="text-[15px] text-muted">
          Бот Tetix в Telegram ещё не запущен. Пока ответы подборщика и статусы видны в разделах{" "}
          <Link href="/requests" className="font-semibold text-ink underline">
            Заявки
          </Link>{" "}
          и{" "}
          <Link href="/orders" className="font-semibold text-ink underline">
            Заказы
          </Link>
          .
        </p>
      )}

      {message ? (
        <p className="text-sm text-muted" role="status">
          {message}
        </p>
      ) : null}
    </Card>
  );
}
