"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { Icon, type IconName } from "@/components/ui/icon";
import { api } from "@/lib/client/api";
import { cn } from "@/lib/utils";

const MODE_HINT: Record<"customer" | "master", { icon: IconName; text: string }> = {
  customer: { icon: "car", text: "Ищу детали для своей машины" },
  master: { icon: "wrench", text: "Подбираю детали для машин клиентов" },
};

const ROLE_LABEL: Record<string, string> = {
  customer: "Владелец машины",
  master: "Мастер или СТО",
  sourcer: "Подборщик",
  admin: "Администратор",
};

export function ProfileForm({ initial }: { initial: { name: string; company: string; city: string; role: string } }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canSwitch = initial.role === "customer" || initial.role === "master";

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api("/api/profile", {
        method: "PUT",
        body: { name: form.name, company: form.company, city: form.city, mode: canSwitch ? form.role : undefined },
      });
      setMessage("Сохранено");
      router.refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  return (
    <Card className="sm:p-6">
      <form onSubmit={save} className="grid gap-4">
        <Field label="Как к вам обращаться" htmlFor="name">
          <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} />
        </Field>
        <Field label="Город" htmlFor="city">
          <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} maxLength={80} placeholder="Алматы" />
        </Field>
        {canSwitch ? (
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-semibold">Режим</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(["customer", "master"] as const).map((role) => {
                const checked = form.role === role;
                return (
                  <label
                    key={role}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-[14px] border p-3 transition has-[input:focus-visible]:outline-3 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-lime-ink",
                      checked ? "border-ink bg-soft" : "border-line bg-card hover:border-line-strong",
                    )}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role}
                      checked={checked}
                      onChange={() => setForm({ ...form, role })}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={cn("grid size-10 shrink-0 place-items-center rounded-xl", checked ? "bg-strong text-strong-lime" : "bg-soft text-ink")}
                    >
                      <Icon name={MODE_HINT[role].icon} className="size-5" />
                    </span>
                    <span className="grid min-w-0 gap-0.5">
                      <span className="font-semibold">{ROLE_LABEL[role]}</span>
                      <span className="text-xs text-muted">{MODE_HINT[role].text}</span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "ml-auto grid size-5 shrink-0 place-items-center rounded-full border",
                        checked ? "border-strong bg-strong text-on-strong dark:border-line-strong" : "border-line-strong",
                      )}
                    >
                      {checked ? <Icon name="check" strokeWidth={2.6} className="size-3" /> : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : (
          <p className="text-sm text-muted">Роль: {ROLE_LABEL[initial.role]}</p>
        )}
        {form.role === "master" ? (
          <Field label="Название СТО" htmlFor="company">
            <Input id="company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} maxLength={120} />
          </Field>
        ) : null}
        {message ? <p className="text-sm text-muted" role="status">{message}</p> : null}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
          <Button variant="primary" disabled={busy}>
            Сохранить
          </Button>
          <Button type="button" variant="light" onClick={logout}>
            Выйти из аккаунта
          </Button>
        </div>
      </form>
    </Card>
  );
}
