"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { api } from "@/lib/client/api";
import type { UserRole } from "@/lib/db/schema";
import { cn, pluralRu } from "@/lib/utils";
import { ROLE, ROLE_ORDER } from "./labels";

type Props = {
  userId: string;
  role: UserRole;
  // Name or phone, for the label and the confirmation.
  who: string;
  self: boolean;
  assignedOpen: number;
  adminByEnv: boolean;
};

const isStaffRole = (role: UserRole) => role === "sourcer" || role === "admin";
const RANK: Record<UserRole, number> = { customer: 0, master: 0, sourcer: 1, admin: 2 };

// Saves on change. Granting admin and taking staff rights away ask first: a demoted person is signed out everywhere.
export function RoleSelect({ userId, role, who, self, assignedOpen, adminByEnv }: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState(role);
  const [seenRole, setSeenRole] = useState(role);
  const [pending, setPending] = useState<UserRole | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const id = `role-${userId}`;

  // Someone else changed the role and the page was refreshed: show the new value.
  if (role !== seenRole) {
    setSeenRole(role);
    setSaved(role);
    setPending(null);
  }

  async function save(next: UserRole) {
    setPending(null);
    setBusy(true);
    setMessage(null);
    try {
      const { user } = await api<{ user: { role: UserRole } }>(`/api/admin/users/${userId}`, { method: "PATCH", body: { role: next } });
      setSaved(user.role);
      setSeenRole(user.role);
      setMessage({ ok: true, text: "Сохранено" });
      router.refresh();
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  function choose(next: UserRole) {
    setMessage(null);
    if (next === saved) {
      setPending(null);
      return;
    }
    const demotes = isStaffRole(saved) && RANK[next] < RANK[saved];
    if (next === "admin" || demotes) setPending(next);
    else void save(next);
  }

  const losesWork = pending !== null && isStaffRole(saved) && !isStaffRole(pending) && assignedOpen > 0;
  const question =
    pending === "admin"
      ? `Дать права администратора пользователю «${who}»? Он сможет менять роли и цены.`
      : pending
        ? [
            `Снять права с пользователя «${who}»? Он выйдет из аккаунта на всех устройствах и войдёт заново уже с новой ролью.`,
            losesWork
              ? `У него ${assignedOpen} ${pluralRu(assignedOpen, "заявка", "заявки", "заявок")} в работе. Вернуть их в очередь сможет администратор на странице заявки.`
              : "",
          ]
            .filter(Boolean)
            .join(" ")
        : null;

  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="sr-only">
        Роль пользователя «{who}»
      </label>
      <Select
        id={id}
        value={pending ?? saved}
        disabled={self || busy}
        onChange={(e) => choose(e.target.value as UserRole)}
        className="h-10 py-1.5"
      >
        {ROLE_ORDER.map((r) => (
          <option key={r} value={r}>
            {ROLE[r].label}
          </option>
        ))}
      </Select>
      {self ? <p className="text-xs text-muted">Свою роль менять нельзя</p> : null}
      {adminByEnv ? (
        <p className="text-xs text-muted">
          Номер указан в <span className="font-mono">ADMIN_PHONES</span>: при входе роль администратора вернётся
        </p>
      ) : null}
      {question ? (
        <div role="alertdialog" aria-labelledby={`${id}-question`} className="grid gap-2 rounded-xl border border-warn/30 bg-warn-bg p-3">
          <p id={`${id}-question`} className="text-sm">
            {question}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => pending && save(pending)} autoFocus>
              {pending === "admin" ? "Да, дать права" : "Да, сменить роль"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setPending(null)}>
              Отмена
            </Button>
          </div>
        </div>
      ) : null}
      {busy ? (
        <p className="text-xs text-muted" role="status">
          Сохраняем…
        </p>
      ) : message ? (
        <p className={cn("text-xs", message.ok ? "text-ok" : "text-bad")} role={message.ok ? "status" : "alert"}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
