import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type CoursePageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function CourseDetailPage(props: CoursePageProps) {
  const { courseId } = (await props.params) || {};

  if (!courseId) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Course</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {courseId}
        </h1>
        <p className="text-sm text-muted-foreground">
          This is a placeholder for the course overview. Modules and assignments will be added in later phases.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Course description</CardTitle>
            <CardDescription>Show high-level context for learners.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Placeholder content. In future phases, this will surface instructor-authored metadata.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modules</CardTitle>
            <CardDescription>Ordered learning materials go here.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            No modules yet. Module creation and ordering will land in Phase 8.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
