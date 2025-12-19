import Link from "next/link";

type CourseListProps = {
  heading: string;
  emptyText: string;
  courses: { id: string; title: string; published: "true" | "false" }[];
};

export function CourseList({ heading, emptyText, courses }: CourseListProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{heading}</h3>
      {courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border/70 bg-card/70 text-sm">
          {courses.map((course) => (
            <div key={course.id} className="flex items-center justify-between px-4 py-3">
              <div className="space-y-1">
                <Link className="font-medium text-foreground underline" href={`/courses/${course.id}`}>
                  {course.title}
                </Link>
                <p className="text-xs text-muted-foreground">{course.id}</p>
              </div>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {course.published === "true" ? "Published" : "Draft"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
