import { requireAdmin } from "@/lib/auth";

export default async function AdminPage() {
  const admin = await requireAdmin();

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="text-3xl font-semibold text-foreground">Administration</h1>
        <p className="text-sm text-muted-foreground">
          Minimal operational view for demonstration: see seeded admin identity and confirm role checks.
        </p>
      </div>
      <div className="rounded-2xl border border-dashed border-border/70 bg-muted/40 px-4 py-3 text-sm text-foreground/80">
        <p className="font-mono text-xs text-muted-foreground">admin user</p>
        <p className="font-semibold">{admin.email}</p>
        <p className="text-xs text-muted-foreground">Role: {admin.role}</p>
      </div>
      <p className="text-xs text-muted-foreground">
        In v0.1 admin is read-only. Seed additional admins via database insert or seed script.
      </p>
    </div>
  );
}
