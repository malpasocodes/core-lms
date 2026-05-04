import Link from "next/link";

type CourseListProps = {
  heading: string;
  emptyText: string;
  courses: { id: string; title: string; published: "true" | "false" }[];
};

export function CourseList({ heading, emptyText, courses }: CourseListProps) {
  return (
    <div className="space-y-2">
      {heading && (
        <h3 className="text-sm font-semibold text-slate-700">{heading}</h3>
      )}
      {courses.length === 0 ? (
        <p className="text-sm text-slate-400">{emptyText}</p>
      ) : (
        <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
          {courses.map((course) => (
            <div
              key={course.id}
              className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 transition-colors"
            >
              <Link
                className="text-sm font-medium text-slate-800 hover:text-emerald-700"
                href={`/courses/${course.id}`}
              >
                {course.title}
              </Link>
              <span className="text-xs text-slate-400 uppercase tracking-wide">
                {course.published === "true" ? "Published" : "Draft"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
