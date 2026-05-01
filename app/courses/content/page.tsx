import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { activities, courses, modules, sections } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { DeleteContentForm } from "./_components/delete-content-form";

export default async function ContentPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }
  const isAdmin = user.role === "admin";
  const isInstructor = user.role === "instructor";
  if (!isAdmin && !isInstructor) {
    redirect("/dashboard");
  }

  const db = await getDb();
  const baseQuery = db
    .select({
      id: activities.id,
      title: activities.title,
      type: activities.type,
      content: activities.content,
      sectionTitle: sections.title,
      moduleTitle: modules.title,
      courseTitle: courses.title,
    })
    .from(activities)
    .leftJoin(sections, eq(activities.sectionId, sections.id))
    .leftJoin(modules, eq(sections.moduleId, modules.id))
    .leftJoin(courses, eq(modules.courseId, courses.id));

  const activityList = isAdmin
    ? await baseQuery.orderBy(courses.title, modules.title, sections.title, activities.order)
    : await baseQuery
        .where(eq(courses.instructorId, user.id))
        .orderBy(courses.title, modules.title, sections.title, activities.order);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Courses</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Activities</h1>
        <p className="text-sm text-muted-foreground">
          Browse and remove activities. Create or edit activities from the corresponding course page.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>View activities</CardTitle>
            <CardDescription>Activities grouped by course and section.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-foreground">
            {activityList.length === 0 ? (
              <p className="text-muted-foreground">No activities found.</p>
            ) : (
              <div className="divide-y divide-border rounded-md border border-border/70 bg-background/80">
                {activityList.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 px-3 py-2">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.courseTitle} • {item.moduleTitle} › {item.sectionTitle}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{item.content}</p>
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {item.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delete activity</CardTitle>
            <CardDescription>Removes the activity and any attached assessments.</CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteContentForm items={activityList} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
