import { hashSync } from "bcryptjs";

import { getDb } from "@/lib/db";
import { users } from "@/lib/schema";

const demoUsers = [
  {
    email: "alfred.essa@gmail.com",
    password: "changeme-admin",
    role: "admin",
  },
  {
    email: "malpaso@alfredcodes.com",
    password: "changeme-instructor",
    role: "instructor",
  },
  {
    email: "aessa@drurylanemedia.com",
    password: "changeme-student",
    role: "learner",
  },
] as const;

export async function seedDemoUsers() {
  const db = await getDb();

  for (const demo of demoUsers) {
    const existing = await db.query.users.findFirst({
      columns: { id: true },
      where: (u, { eq }) => eq(u.email, demo.email),
    });
    if (existing) {
      continue;
    }
    await db.insert(users).values({
      id: crypto.randomUUID(),
      email: demo.email.toLowerCase(),
      passwordHash: hashSync(demo.password, 12),
      role: demo.role as any,
    });
  }
}
