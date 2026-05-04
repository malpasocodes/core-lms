import { requireAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MODEL_OPTIONS, getActiveModel } from "@/lib/settings";
import { setActiveModelAction } from "@/lib/settings-actions";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const active = await getActiveModel();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="text-3xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure application-wide preferences.</p>
      </div>

      {params.error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {params.error}
        </div>
      )}

      {params.notice && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {params.notice}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Model</CardTitle>
          <CardDescription>
            Select the AI model used for content generation tasks (e.g. MCQ quiz creation).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={setActiveModelAction} className="space-y-4 text-sm">
            <div className="space-y-1">
              <Label htmlFor="model-select">Active model</Label>
              <select
                id="model-select"
                name="modelId"
                required
                defaultValue={active.id}
                className="flex h-7 w-full rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] dark:bg-input/30"
              >
                {MODEL_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
