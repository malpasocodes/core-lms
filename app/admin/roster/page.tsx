import { getDb } from "@/lib/db";
import { users } from "@/lib/schema";
import { createUserAction, deleteUserAction } from "@/lib/admin-actions";
import { eq } from "drizzle-orm";

export default async function AdminRosterPage() {
  const db = await getDb();
  const userList = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="text-3xl font-semibold text-foreground">Roster</h1>
        <p className="text-sm text-muted-foreground">View all users and manage demo accounts.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
          <h2 className="text-lg font-semibold text-foreground">Users</h2>
          <div className="mt-3 divide-y divide-border overflow-hidden rounded-md border border-border/60 bg-background/80 text-sm">
            {userList.map((user) => (
              <div key={user.id} className="flex items-center justify-between px-3 py-2">
                <div>
                  <p className="font-medium text-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground">{user.role}</p>
                </div>
                <form action={deleteUserAction}>
                  <input type="hidden" name="userId" value={user.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-border px-2 py-1 text-xs font-semibold text-foreground hover:bg-muted"
                  >
                    Delete
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
          <h2 className="text-lg font-semibold text-foreground">Add user</h2>
          <form action={createUserAction} className="mt-3 space-y-3 text-sm">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                minLength={8}
                required
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground" htmlFor="role">
                Role
              </label>
              <select
                id="role"
                name="role"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                defaultValue="learner"
              >
                <option value="learner">Learner</option>
                <option value="instructor">Instructor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-foreground px-3 py-2 text-sm font-semibold text-background hover:bg-foreground/90"
            >
              Add user
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
