import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { seedDemoUsers } from "@/lib/seed";

export default async function AdminSeedPage() {
  await requireAdmin();

  async function seedAction() {
    "use server";
    await seedDemoUsers();
    redirect("/admin?seed=done");
  }

  return (
    <form action={seedAction} className="space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">Seed demo users</h1>
      <p className="text-sm text-muted-foreground">
        Inserts admin, instructor, and learner demo accounts if they do not already exist.
      </p>
      <button
        type="submit"
        className="rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background hover:bg-foreground/90"
      >
        Run seed
      </button>
    </form>
  );
}
