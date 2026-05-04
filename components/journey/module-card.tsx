import { cn } from "@/lib/utils";
import type { JourneyModule } from "@/lib/journey";
import { MetroLine } from "@/components/journey/metro-line";

const MODULE_STATUS_COPY: Record<JourneyModule["status"], string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

const MODULE_STATUS_CLASSES: Record<JourneyModule["status"], string> = {
  not_started: "bg-slate-100 text-slate-600 border-slate-200",
  in_progress: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-purple-50 text-purple-700 border-purple-200",
};

export function ModuleCard({ module }: { module: JourneyModule }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            Module {module.order}
          </p>
          <h2 className="text-xl font-semibold text-slate-900">{module.title}</h2>
          {module.totalActivities > 0 && (
            <p className="text-xs text-slate-500">
              {module.completedActivities} of {module.totalActivities} complete
            </p>
          )}
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em]",
            MODULE_STATUS_CLASSES[module.status]
          )}
        >
          {MODULE_STATUS_COPY[module.status]}
        </span>
      </header>

      <div className="mt-6">
        <MetroLine
          stations={module.stations}
          sectionBreaks={module.sectionBreaks}
          showComingSoon={module.showComingSoon}
        />
      </div>
    </article>
  );
}
