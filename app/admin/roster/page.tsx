import Link from "next/link";
import { clerkClient } from "@clerk/nextjs/server";
import { createUserAction, approveUserAction, rejectUserAction } from "@/lib/admin-actions";
import { PasswordInput } from "@/components/password-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DeleteUserButton } from "./_components/delete-user-button";
import { EditUserButton } from "./_components/edit-user-button";
import type { Role } from "@/lib/auth";

const ROLES = ["learner", "instructor", "admin"] as const;

type ClerkUserData = {
  id: string;
  email: string;
  role: Role;
  approved: boolean;
  createdAt: Date;
};

// Check if user is approved (has approved flag or has role set - grandfathered)
function isUserApproved(publicMetadata: Record<string, unknown>): boolean {
  if (publicMetadata.approved === true) return true;
  if (publicMetadata.role && publicMetadata.approved === undefined) return true;
  return false;
}

function ViewTab({ view, active, label, count }: { view: string; active: boolean; label: string; count?: number }) {
  return (
    <Link
      href={`/admin/roster?view=${view}`}
      className={`relative px-4 py-2 text-sm font-medium transition-colors ${
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      {count !== undefined && <span className="ml-1.5 text-xs text-muted-foreground">({count})</span>}
      {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />}
    </Link>
  );
}

function RoleTabLink({ role, active, count }: { role: Role; active: boolean; count: number }) {
  return (
    <Link
      href={`/admin/roster?view=roster&role=${role}`}
      className={`relative px-3 py-2 text-xs font-medium transition-colors ${
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <span className="capitalize">{role}s</span>
      <span className="ml-1.5 text-xs text-muted-foreground">({count})</span>
      {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />}
    </Link>
  );
}

export default async function AdminRosterPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; role?: string }>;
}) {
  const params = await searchParams;
  const activeView = params.view === "approve" ? "approve" : "roster";
  const activeRole = ROLES.includes(params.role as Role) ? (params.role as Role) : "learner";

  // Fetch users from Clerk
  const client = await clerkClient();
  const { data: clerkUsers } = await client.users.getUserList({ limit: 500 });

  const allUsers: ClerkUserData[] = clerkUsers.map((user) => {
    const metadata = user.publicMetadata as Record<string, unknown>;
    return {
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? "",
      role: (metadata.role as Role) ?? "learner",
      approved: isUserApproved(metadata),
      createdAt: new Date(user.createdAt),
    };
  });

  const approvedUsers = allUsers.filter((u) => u.approved);
  const pendingUsers = allUsers.filter((u) => !u.approved);

  const usersByRole = {
    learner: approvedUsers.filter((u) => u.role === "learner"),
    instructor: approvedUsers.filter((u) => u.role === "instructor"),
    admin: approvedUsers.filter((u) => u.role === "admin"),
  };

  const filteredUsers = usersByRole[activeRole];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="text-3xl font-semibold text-foreground">Roster</h1>
        <p className="text-sm text-muted-foreground">View all users and manage accounts.</p>
      </div>

      {/* Main View Tabs */}
      <div className="flex items-center border-b border-border/60">
        <ViewTab view="roster" active={activeView === "roster"} label="View Roster" count={approvedUsers.length} />
        <ViewTab view="approve" active={activeView === "approve"} label="Approve Users" count={pendingUsers.length} />
      </div>

      {activeView === "roster" ? (
        /* View Roster */
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
            <div className="flex items-center border-b border-border/60">
              {ROLES.map((role) => (
                <RoleTabLink
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
      ) : (
        /* Approve Users */
        <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
          <p className="mb-4 text-sm text-muted-foreground">
            Users awaiting approval. Select a role and approve or reject each user.
          </p>

          <div className="divide-y divide-border overflow-hidden rounded-md border border-border/60 bg-background/80 text-sm">
            {pendingUsers.length === 0 ? (
              <div className="px-3 py-6 text-center text-muted-foreground">
                No users awaiting approval.
              </div>
            ) : (
              pendingUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between gap-4 px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Signed up {user.createdAt.toLocaleDateString()}
                    </p>
                  </div>

                  <form action={approveUserAction} className="flex items-center gap-2">
                    <input type="hidden" name="userId" value={user.id} />
                    <select
                      name="role"
                      className="flex h-8 rounded-md border border-input bg-input/20 px-2 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] dark:bg-input/30"
                      defaultValue="learner"
                    >
                      <option value="learner">Learner</option>
                      <option value="instructor">Instructor</option>
                      <option value="admin">Admin</option>
                    </select>
                    <Button type="submit" size="sm">
                      Approve
                    </Button>
                  </form>

                  <form action={rejectUserAction}>
                    <input type="hidden" name="userId" value={user.id} />
                    <Button type="submit" variant="destructive" size="sm">
                      Reject
                    </Button>
                  </form>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
