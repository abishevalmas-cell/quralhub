import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import type { AdminUser, RoleFilter } from "@/lib/services/admin";
import { USER_SEARCH_MAX, USERS_LIMIT } from "@/lib/services/admin";
import { formatDate, pluralRu } from "@/lib/utils";
import { formatCount } from "./format";
import { ROLE, ROLE_ORDER } from "./labels";
import { RoleSelect } from "./role-select";

type Props = { actorId: string; users: AdminUser[]; truncated: boolean; q: string; role: RoleFilter | "" };

const RESET_HREF = "/admin#users";

// A plain GET form: works before scripts load and keeps the search in the URL.
function UserSearch({ q, role }: { q: string; role: RoleFilter | "" }) {
  return (
    <form action={RESET_HREF} method="get" role="search" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px_auto] sm:items-end">
      <Field label="Имя, компания, город или телефон" htmlFor="users-q">
        <Input id="users-q" name="q" type="search" defaultValue={q} maxLength={USER_SEARCH_MAX} placeholder="Ержан, СТО Мотор, 701 123" />
      </Field>
      <Field label="Роль" htmlFor="users-role">
        <Select id="users-role" name="role" defaultValue={role}>
          <option value="">Все роли</option>
          <option value="staff">Сотрудники: подборщики и администраторы</option>
          {ROLE_ORDER.map((r) => (
            <option key={r} value={r}>
              {ROLE[r].label}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" variant="soft">
        Найти
      </Button>
    </form>
  );
}

function RoleHelp() {
  return (
    <details className="rounded-2xl border border-line bg-card px-4 py-3 text-[15px]">
      <summary className="cursor-pointer font-semibold">Что может каждая роль</summary>
      <dl className="mt-2 grid gap-2">
        {ROLE_ORDER.map((r) => (
          <div key={r} className="grid gap-1 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-3">
            <dt>
              <Badge tone={ROLE[r].tone}>{ROLE[r].label}</Badge>
            </dt>
            <dd className="text-muted">{ROLE[r].hint}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

export function UsersSection({ actorId, users, truncated, q, role }: Props) {
  const filtered = Boolean(q || role);
  return (
    <>
      <UserSearch q={q} role={role} />
      <RoleHelp />
      {users.length === 0 ? (
        <EmptyState
          title={filtered ? "Никого не нашли" : "Пользователей пока нет"}
          action={
            filtered ? (
              <Link href={RESET_HREF} className="font-semibold underline">
                Сбросить поиск
              </Link>
            ) : undefined
          }
        >
          {filtered ? "Проверьте написание или ищите по последним 4 цифрам телефона." : null}
        </EmptyState>
      ) : (
        <>
          <p className="text-sm text-muted" role="status">
            {truncated
              ? `Показаны первые ${USERS_LIMIT}, сначала новые. Уточните поиск, чтобы найти остальных.`
              : `${filtered ? "Найдено" : "Всего"}: ${formatCount(users.length)}`}
            {filtered ? (
              <>
                {" · "}
                <Link href={RESET_HREF} className="font-semibold text-ink underline">
                  Сбросить поиск
                </Link>
              </>
            ) : null}
          </p>
          <div className="overflow-x-auto rounded-2xl border border-line bg-card">
            <table className="w-full text-left text-[15px]">
              <caption className="sr-only">Пользователи и их роли, сначала новые</caption>
              <thead className="border-b border-line text-sm text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Пользователь
                  </th>
                  <th scope="col" className="hidden px-3 py-3 text-right font-semibold sm:table-cell">
                    Заявки
                  </th>
                  <th scope="col" className="hidden px-3 py-3 text-right font-semibold sm:table-cell">
                    Заказы
                  </th>
                  <th scope="col" className="hidden px-3 py-3 font-semibold md:table-cell">
                    С нами с
                  </th>
                  <th scope="col" className="w-[44%] px-4 py-3 font-semibold sm:w-56">
                    Роль
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.map((user) => {
                  const self = user.id === actorId;
                  const staff = user.role === "sourcer" || user.role === "admin";
                  return (
                    <tr key={user.id} className="align-top">
                      <td className="min-w-0 px-4 py-3">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-semibold break-words">{user.name || <span className="text-muted">Без имени</span>}</span>
                          {self ? <Badge>Это вы</Badge> : null}
                        </div>
                        {user.company ? <div className="text-sm break-words">{user.company}</div> : null}
                        <div className="text-sm whitespace-nowrap text-muted tabular-nums">{user.phone}</div>
                        {user.city ? <div className="text-sm text-muted">{user.city}</div> : null}
                        <div className="mt-1 text-sm text-muted tabular-nums sm:hidden">
                          Заявок: {formatCount(user.requests)} · Заказов: {formatCount(user.orders)}
                        </div>
                        <div className="text-sm text-muted md:hidden">С нами с {formatDate(user.createdAt)}</div>
                        {staff && user.assignedOpen > 0 ? (
                          <div className="mt-1 text-sm text-hand">
                            Ведёт {formatCount(user.assignedOpen)} {pluralRu(user.assignedOpen, "заявку", "заявки", "заявок")}
                          </div>
                        ) : null}
                      </td>
                      <td className="hidden px-3 py-3 text-right tabular-nums sm:table-cell">{formatCount(user.requests)}</td>
                      <td className="hidden px-3 py-3 text-right tabular-nums sm:table-cell">{formatCount(user.orders)}</td>
                      <td className="hidden px-3 py-3 whitespace-nowrap text-muted md:table-cell">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3">
                        <RoleSelect
                          userId={user.id}
                          role={user.role}
                          who={user.name || user.phone}
                          self={self}
                          assignedOpen={user.assignedOpen}
                          adminByEnv={user.adminByEnv}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
