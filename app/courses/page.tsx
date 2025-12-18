import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CoursesPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Courses</h1>
        <p className="text-sm text-muted-foreground">
          A simple list of courses will live here once creation/enrollment land in later phases.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Empty state</CardTitle>
          <CardDescription>
            This is a placeholder until course creation (Phase 5) and enrollment (Phase 6) are wired.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p className="rounded-lg border border-dashed border-border/70 bg-muted/40 px-3 py-2">
            When courses exist, they will be listed here with quick access to their overviews.
          </p>
          <p className="text-xs text-foreground/60">
            Looking for where a course lives? Try the course detail stub:
            <Link className="ml-1 text-foreground underline" href="/courses/demo-course">
              /courses/demo-course
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
