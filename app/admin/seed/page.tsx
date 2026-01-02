import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { seedDemoUsers } from "@/lib/seed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminSeedPage() {
  await requireAdmin();

  async function seedAction() {
    "use server";
    await seedDemoUsers();
    redirect("/admin?seed=done");
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="text-3xl font-semibold text-foreground">Seed</h1>
        <p className="text-sm text-muted-foreground">Populate the database with demo data.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seed demo users</CardTitle>
          <CardDescription>
            Inserts admin, instructor, and learner demo accounts if they do not already exist.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={seedAction}>
            <Button type="submit">Run seed</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
