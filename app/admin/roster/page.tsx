import Link from "next/link";
import { getDb } from "@/lib/db";
import { users } from "@/lib/schema";
import { createUserAction } from "@/lib/admin-actions";
import { PasswordInput } from "@/components/password-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DeleteUserButton } from "./_components/delete-user-button";
import { EditUserButton } from "./_components/edit-user-button";

const ROLES = ["learner", "instructor", "admin"] as const;
type Role = (typeof ROLES)[number];

function TabLink({ role, active, count }: { role: Role; active: boolean; count: number }) {
  return (
    <Link
      href={`/admin/roster?role=${role}`}
      className={`relative px-3 py-2 text-xs font-medium transition-colors ${
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <span className="capitalize">{role}s</span>
      <span className="ml-1.5 text-xs text-muted-foreground">({count})</span>
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
      )}
    </Link>
  );
}

export default async function AdminRosterPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const params = await searchParams;
  const activeRole = ROLES.includes(params.role as Role) ? (params.role as Role) : "learner";

  const db = await getDb();
  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt);

  const usersByRole = {
    learner: allUsers.filter((u) => u.role === "learner"),
    instructor: allUsers.filter((u) => u.role === "instructor"),
    admin: allUsers.filter((u) => u.role === "admin"),
  };

  const filteredUsers = usersByRole[activeRole];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="text-3xl font-semibold text-foreground">Roster</h1>
        <p className="text-sm text-muted-foreground">View all users and manage demo accounts.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
          <div className="flex items-center border-b border-border/60">
            {ROLES.map((role) => (
              <TabLink
                key={role}
                role={role}
                active={activeRole === role}
                count={usersByRole[role].length}
              />
            ))}
          </div>

          <div className="mt-3 divide-y divide-border overflow-hidden rounded-md border border-border/60 bg-background/80 text-sm">
            {filteredUsers.length === 0 ? (
              <div className="px-3 py-4 text-center text-muted-foreground">
                No {activeRole}s found.
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between px-3 py-2">
                  <div>
                    <p className="font-medium text-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <EditUserButton
                      userId={user.id}
                      email={user.email}
                      role={user.role}
                      createdAt={user.createdAt}
                    />
                    <DeleteUserButton userId={user.id} email={user.email} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
          <h2 className="text-lg font-semibold text-foreground">Add user</h2>
          <form action={createUserAction} className="mt-3 space-y-3 text-sm">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <PasswordInput id="password" name="password" label="Password" required minLength={8} />
            <div className="space-y-1">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                name="role"
                className="flex h-7 w-full rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] dark:bg-input/30"
                defaultValue="learner"
              >
                <option value="learner">Learner</option>
                <option value="instructor">Instructor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <Button type="submit" className="w-full">
              Add user
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
