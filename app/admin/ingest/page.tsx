import { redirect } from "next/navigation";
import { clerkClient } from "@clerk/nextjs/server";

import { getCurrentUser } from "@/lib/auth";
import { ingestNormalizedCourseAction } from "@/lib/ingest-actions";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminIngestPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }
  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;

  // Get instructors from Clerk
  const client = await clerkClient();
  const clerkUsers = await client.users.getUserList({ limit: 500 });
  const instructors = clerkUsers.data.filter(
    (u) => (u.publicMetadata?.role as string) === "instructor"
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="text-3xl font-semibold text-foreground">Ingest Course</h1>
        <p className="text-sm text-muted-foreground">
          Import a normalized JSON file to create a new course with modules and content.
        </p>
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
          <CardTitle>Import Normalized Content</CardTitle>
          <CardDescription>
            Paste the contents of a normalized JSON file (e.g., finance_normalized.json) to create
            a course. Chapters become modules; sections become content items.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={ingestNormalizedCourseAction} className="space-y-4 text-sm">
            <div className="space-y-1">
              <Label htmlFor="instructor-select">Assign Instructor</Label>
              <select
                id="instructor-select"
                name="instructorId"
                required
                className="flex h-7 w-full rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] dark:bg-input/30"
                defaultValue=""
              >
                <option value="" disabled>
                  Select an instructor
                </option>
                {instructors.map((instructor) => (
                  <option key={instructor.id} value={instructor.id}>
                    {instructor.primaryEmailAddress?.emailAddress ?? instructor.id}
                  </option>
                ))}
              </select>
              {instructors.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No instructors found. Create an instructor in Roster first.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="json-content">JSON Content</Label>
              <Textarea
                id="json-content"
                name="jsonContent"
                required
                rows={12}
                placeholder='{"schema_version": "1.0", "source": {...}, "chapters": [...]}'
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Expected format: {"{"}&quot;source&quot;: {"{"}&quot;title&quot;: &quot;...&quot;{"}"},
                &quot;chapters&quot;: [{"{"}...{"}"}]{"}"}
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={instructors.length === 0}>
              Import Course
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expected JSON Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted/50 p-4 rounded-md overflow-x-auto">
{`{
  "schema_version": "1.0",
  "source": {
    "filename": "example.pdf",
    "title": "Course Title"
  },
  "chapters": [
    {
      "chapter_number": 1,
      "title": "Chapter Title",
      "sections": [
        {
          "section_number": "1.1",
          "title": "Section Title",
          "blocks": [
            { "type": "paragraph", "text": "Content..." },
            { "type": "placeholder", "label": "Figure 1.1" }
          ]
        }
      ]
    }
  ]
}`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
