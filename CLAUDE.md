# Tetix

Сервис подбора запчастей из Китая для китайских автомобилей (Казахстан, Узбекистан, Кыргызстан, Россия).
Цепочка: машина (VIN) → номер OE для этого VIN → предложения → проверка подборщиком → цена в ₸ → заказ.
План продукта: https://claude.ai/artifact/LfkWbUMXdJW5giYPeYY67L

This branch (`tetix`) is an orphan branch of the quralhub repo and shares no code with `main`.

## Stack

- Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS v4 (tokens in `app/globals.css`).
- Drizzle ORM on PostgreSQL. Without `DATABASE_URL` the app uses embedded PGlite in `.data/pglite`
  (auto-migrated). Tests use in-memory PGlite via `createMemoryDb()`.
- Vitest for unit/integration tests (`*.test.ts` next to the code in `__tests__/`), Playwright for e2e (`e2e/`).

## Commands

- `npm run dev` — dev server (login codes are shown on screen in development)
- `npm test` — vitest; `npm run typecheck`; `npm run lint`; `npm run build`
- `npm run db:generate` — after changing `lib/db/schema.ts`, generate a migration into `drizzle/`. Never edit applied migrations.

## Layout

- `lib/db` — schema and connection. `lib/auth` — phone OTP, sessions, `getActor()/requireActor()/requireStaff()`.
- `lib/server` — `route()` wrapper, `readJson(request, zodSchema)`, `AppError` helpers. Every route handler is wrapped in `route()`.
- `lib/services/*` — business logic. Functions take `(db: Db, actor: Actor, input)` and enforce permissions themselves,
  so they are testable without Next. Route handlers and server components only call services.
- `lib/vin`, `lib/providers`, `lib/taxonomy`, `lib/pricing`, `lib/notify`, `lib/storage` — pure domain modules.
- `components/ui` — small hand-written primitives (Button, Field, Card, Badge, Icon). Reuse them; do not add a UI kit.
- `app/api/**/route.ts` — JSON API. Pages are server components; interactive parts are small `"use client"` components using `lib/client/api.ts`.

## Rules

- UI copy is Russian; sourcer screens add Chinese labels (`<span className="zh">采购</span>`). Write plainly, active voice.
- Roles: `customer`, `master` (СТО), `sourcer`, `admin`. Customer/master is a self-chosen mode; staff roles are granted only by an admin. Check permissions on the server in services.
- INTERNAL fields (offer `priceCny`, `costKzt`, `supplierName`, `supplierUrl`, `internalNote`; internal messages) must never reach customers. Serialize offers for customers only through `lib/services/visibility.ts`.
- Compatibility is never assumed: `vin_confirmed` only when the OE is in the catalog of this VIN and the trim is unambiguous; otherwise `needs_check` or `manual`. Never auto-pick the first trim candidate.
- Money: tenge as integers, yuan as numeric strings. Never replace a missing price or currency with 0 or CNY.
- Privacy: VINs are personal data. Logs and `provider_calls` store masked VINs (`LGX…8460`). Never commit real customer VINs; fixtures use synthetic VINs with a valid check digit.
- Provider calls: server-only credentials, timeout, response size cap, no automatic retries of paid calls, cache in `provider_cache`, daily limit.
- Optimistic concurrency: rows with `version` are updated with `WHERE version = ?` and return 409 on conflict.
- Every new service gets tests covering permissions (another customer cannot read or change it).
