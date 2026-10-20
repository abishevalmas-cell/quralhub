"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { api } from "@/lib/client/api";

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
    <Card>
      <form onSubmit={save} className="grid gap-4">
        <Field label="Как к вам обращаться" htmlFor="name">
          <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} />
        </Field>
        <Field label="Город" htmlFor="city">
          <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} maxLength={80} placeholder="Алматы" />
        </Field>
        {canSwitch ? (
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-semibold">Режим</legend>
            {(["customer", "master"] as const).map((role) => (
              <label key={role} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
                <input type="radio" name="role" value={role} checked={form.role === role} onChange={() => setForm({ ...form, role })} />
                <span className="font-semibold">{ROLE_LABEL[role]}</span>
              </label>
            ))}
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
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" disabled={busy}>Сохранить</Button>
          <Button type="button" variant="ghost" onClick={logout}>Выйти</Button>
        </div>
      </form>
    </Card>
  );
}
