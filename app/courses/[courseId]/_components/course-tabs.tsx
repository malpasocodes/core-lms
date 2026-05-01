"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type CourseTabsProps = {
  courseId: string;
  canEdit: boolean;
};

const tabs = [
  { key: "overview", label: "Overview" },
  { key: "modules", label: "Modules" },
  { key: "assessments", label: "Assessments" },
  { key: "announcements", label: "Announcements" },
];

export function CourseTabs({ courseId, canEdit }: CourseTabsProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const activeTab = searchParams.get("tab") || "overview";
  const isGradebook = pathname.endsWith("/gradebook");

  const allTabs = canEdit
    ? [...tabs, { key: "create-module", label: "Create Module" }, { key: "import", label: "Import" }]
    : tabs;

  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-border/60 bg-muted/30 p-1">
      {allTabs.map((tab) => (
        <Link
          key={tab.key}
          href={`/courses/${courseId}?tab=${tab.key}`}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            !isGradebook && activeTab === tab.key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </Link>
      ))}
      {canEdit && (
        <Link
          href={`/courses/${courseId}/gradebook`}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            isGradebook
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Gradebook
        </Link>
      )}
    </div>
  );
}
