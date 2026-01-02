import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { contentItems, courses, modules } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { createContentItemAction, updateContentItemAction } from "@/lib/module-actions";
import { DeleteContentForm } from "./_components/delete-content-form";

export default async function ContentPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }
  const isAdmin = user.role === "admin";
  const isInstructor = user.role === "instructor";
  if (!isAdmin && !isInstructor) {
    redirect("/dashboard");
  }

  const db = await getDb();
  const [moduleList, contentList] = await Promise.all([
    isAdmin
      ? db
          .select({
            id: modules.id,
            title: modules.title,
            courseTitle: courses.title,
          })
          .from(modules)
          .leftJoin(courses, eq(modules.courseId, courses.id))
          .orderBy(courses.title, modules.order)
      : db
          .select({
            id: modules.id,
            title: modules.title,
            courseTitle: courses.title,
          })
          .from(modules)
          .leftJoin(courses, eq(modules.courseId, courses.id))
          .where(eq(courses.instructorId, user.id))
          .orderBy(courses.title, modules.order),
    isAdmin
      ? db
          .select({
            id: contentItems.id,
            title: contentItems.title,
            type: contentItems.type,
            content: contentItems.content,
            moduleTitle: modules.title,
            courseTitle: courses.title,
          })
          .from(contentItems)
          .leftJoin(modules, eq(contentItems.moduleId, modules.id))
          .leftJoin(courses, eq(modules.courseId, courses.id))
          .orderBy(courses.title, modules.title, contentItems.order)
      : db
          .select({
            id: contentItems.id,
            title: contentItems.title,
            type: contentItems.type,
            content: contentItems.content,
            moduleTitle: modules.title,
            courseTitle: courses.title,
          })
          .from(contentItems)
          .leftJoin(modules, eq(contentItems.moduleId, modules.id))
          .leftJoin(courses, eq(modules.courseId, courses.id))
          .where(eq(courses.instructorId, user.id))
          .orderBy(courses.title, modules.title, contentItems.order),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Courses</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Content</h1>
        <p className="text-sm text-muted-foreground">View, create, edit, and delete content items.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>View content</CardTitle>
            <CardDescription>Content items grouped by module.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-foreground">
            {contentList.length === 0 ? (
              <p className="text-muted-foreground">No content items found.</p>
            ) : (
              <div className="divide-y divide-border rounded-md border border-border/70 bg-background/80">
                {contentList.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 px-3 py-2">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.courseTitle} • {item.moduleTitle}
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
            <CardTitle>Create content</CardTitle>
            <CardDescription>Add a page or link to a module.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createContentItemAction} className="space-y-3 text-sm">
              <div className="space-y-1">
                <Label htmlFor="create-module">Module</Label>
                <select
                  id="create-module"
                  name="moduleId"
                  required
                  className="flex h-7 w-full rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] dark:bg-input/30"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select module
                  </option>
                  {moduleList.map((mod) => (
                    <option key={mod.id} value={mod.id}>
                      {mod.title} ({mod.courseTitle})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="create-title">Title</Label>
                <Input id="create-title" name="title" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="create-type">Type</Label>
                <select
                  id="create-type"
                  name="type"
                  className="flex h-7 w-full rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] dark:bg-input/30"
                  defaultValue="page"
                >
                  <option value="page">Text page</option>
                  <option value="link">External link</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="create-content">Content (text or URL)</Label>
                <Textarea id="create-content" name="content" rows={3} required />
              </div>
              <Button type="submit" className="w-full">
                Create content
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Edit content</CardTitle>
            <CardDescription>Update title, type, or content.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateContentItemAction} className="space-y-3 text-sm">
              <div className="space-y-1">
                <Label htmlFor="edit-item">Content item</Label>
                <select
                  id="edit-item"
                  name="itemId"
                  required
                  className="flex h-7 w-full rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] dark:bg-input/30"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select content
                  </option>
                  {contentList.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} ({item.courseTitle} / {item.moduleTitle})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-title">Title</Label>
                <Input id="edit-title" name="title" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-type">Type</Label>
                <select
                  id="edit-type"
                  name="type"
                  className="flex h-7 w-full rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] dark:bg-input/30"
                  defaultValue="page"
                >
                  <option value="page">Text page</option>
                  <option value="link">External link</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-content">Content</Label>
                <Textarea id="edit-content" name="content" rows={3} required />
              </div>
              <Button type="submit" className="w-full">
                Update content
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delete content</CardTitle>
            <CardDescription>Removes the content item.</CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteContentForm items={contentList} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
