import { createMemoryDb, type Db } from "@/lib/db";
import { users, type UserRole } from "@/lib/db/schema";
import type { Actor } from "@/lib/auth/session";

export async function testDb(): Promise<Db> {
  return createMemoryDb();
}

let phoneSeq = 1000000;
export async function makeUser(db: Db, role: UserRole = "customer", extra: Partial<typeof users.$inferInsert> = {}): Promise<Actor> {
  const phone = "7701" + String(phoneSeq++).padStart(7, "0");
  const [u] = await db.insert(users).values({ phone, role, ...extra }).returning();
  return { id: u.id, role: u.role, phone: u.phone, name: u.name, company: u.company };
}
