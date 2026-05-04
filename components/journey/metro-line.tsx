import Link from "next/link";

import { cn } from "@/lib/utils";
import type {
  ActivityType,
  AssessmentType,
  SectionBreak,
  Station,
  StationStatus,
} from "@/lib/journey";

type MetroLineProps = {
  stations: Station[];
  sectionBreaks?: SectionBreak[];
  showComingSoon?: boolean;
  density?: "default" | "compact";
};

const ACTIVITY_TYPE_LABEL: Record<ActivityType, string> = {
  watch: "Watch",
  listen: "Listen",
  read: "Read",
  write: "Write",
};

const ASSESSMENT_BADGE: Record<AssessmentType, { letter: string; title: string }> = {
  mcq: { letter: "K", title: "Knowledge check" },
  open_ended: { letter: "W", title: "Writing" },
};

function StationCircle({ status, isMilestone }: { status: StationStatus; isMilestone: boolean }) {
  const base =
    "relative flex items-center justify-center transition-colors";
  const sizing = isMilestone ? "h-5 w-5 rotate-45" : "h-4 w-4 rounded-full";
  const ring = "border-2";

  if (status === "done") {
    return (
      <span
        aria-hidden="true"
        className={cn(base, sizing, ring, "border-purple-600 bg-purple-600")}
      >
        {!isMilestone && (
          <svg
            viewBox="0 0 12 12"
            className="h-2.5 w-2.5 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="2.5,6.5 5,9 9.5,3.5" />
          </svg>
        )}
      </span>
    );
  }

  if (status === "current") {
    return (
      <span aria-hidden="true" className="relative flex items-center justify-center">
        <span className="absolute h-7 w-7 rounded-full bg-emerald-300/60 motion-safe:animate-ping motion-reduce:opacity-70" />
        <span
          className={cn(
            base,
            sizing,
            ring,
            "border-emerald-600 bg-emerald-500 shadow-sm"
          )}
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(base, sizing, ring, "border-slate-300 bg-white")}
    />
  );
}

function Segment({
  fromStatus,
  toStatus,
  sectionBreak,
}: {
  fromStatus: StationStatus;
  toStatus: StationStatus;
  sectionBreak?: SectionBreak;
}) {
  let track: string;
  if (fromStatus === "done" && toStatus === "done") {
    track = "bg-purple-500";
  } else if (fromStatus === "done" && toStatus === "current") {
    track = "bg-gradient-to-r from-purple-500 to-emerald-500";
  } else if (fromStatus === "current") {
    track = "bg-gradient-to-r from-emerald-500 to-slate-200";
  } else {
    track = "bg-slate-200";
  }

  return (
    <div className="relative flex shrink-0 items-center" aria-hidden="true">
      {sectionBreak && (
        <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          {sectionBreak.label}
        </span>
      )}
      <div className={cn("h-0.5 w-12", track)} />
      {sectionBreak && (
        <span className="absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-slate-300" />
      )}
    </div>
  );
}

function StationLabel({
  label,
  type,
  status,
}: {
  label: string;
  type: ActivityType;
  status: StationStatus;
}) {
  return (
    <div className="mt-3 w-24 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
        {ACTIVITY_TYPE_LABEL[type]}
      </p>
      <p
        className={cn(
          "mt-0.5 line-clamp-2 text-xs font-medium leading-snug",
          status === "locked" ? "text-slate-400" : "text-slate-800"
        )}
      >
        {label}
      </p>
    </div>
  );
}

function AssessmentBadges({ types }: { types: AssessmentType[] }) {
  if (types.length === 0) return <div className="mt-1 h-4" aria-hidden="true" />;
  const visible = types.slice(0, 2);
  const overflow = types.length - visible.length;
  return (
    <div className="mt-1 flex items-center justify-center gap-1">
      {visible.map((t, i) => (
        <span
          key={i}
          title={ASSESSMENT_BADGE[t].title}
          aria-label={ASSESSMENT_BADGE[t].title}
          className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-600"
        >
          {ASSESSMENT_BADGE[t].letter}
        </span>
      ))}
      {overflow > 0 && (
        <span className="text-[9px] font-bold text-slate-500">+{overflow}</span>
      )}
    </div>
  );
}

function ComingSoonCap({ standalone = false }: { standalone?: boolean }) {
  return (
    <div className="flex flex-col items-center" aria-hidden="true">
      {!standalone && (
        <div className="mb-0 flex items-center">
          <div className="h-0.5 w-12 border-t-2 border-dashed border-slate-300 bg-transparent" />
        </div>
      )}
      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-300 bg-white" />
      <p className="mt-3 w-24 text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
        Coming soon
      </p>
    </div>
  );
}

function StationItem({ station, compact }: { station: Station; compact: boolean }) {
  const isMilestone = station.assessments.length > 0;
  const interactive = station.status !== "locked" && station.href;

  const inner = (
    <div className="flex flex-col items-center">
      <StationCircle status={station.status} isMilestone={isMilestone} />
      {!compact && (
        <>
          <StationLabel label={station.label} type={station.type} status={station.status} />
          <AssessmentBadges types={station.assessments} />
        </>
      )}
    </div>
  );

  const ariaProps =
    station.status === "current"
      ? { "aria-current": "step" as const }
      : station.status === "locked"
        ? { "aria-disabled": true }
        : {};

  if (interactive && station.href) {
    return (
      <li
        className="flex shrink-0 flex-col items-center"
        {...ariaProps}
      >
        <Link
          href={station.href}
          className="rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
          aria-label={`${ACTIVITY_TYPE_LABEL[station.type]}: ${station.label}`}
        >
          {inner}
        </Link>
      </li>
    );
  }

  return (
    <li
      className="flex shrink-0 cursor-not-allowed flex-col items-center"
      {...ariaProps}
    >
      {inner}
    </li>
  );
}

export function MetroLine({
  stations,
  sectionBreaks = [],
  showComingSoon = false,
  density = "default",
}: MetroLineProps) {
  const compact = density === "compact";
  const breaksByAfterId = new Map(sectionBreaks.map((b) => [b.afterId, b]));

  if (stations.length === 0) {
    return (
      <div className="flex items-center justify-center py-6">
        <ComingSoonCap standalone />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-x-auto",
        compact ? "py-2" : "py-6",
        "scrollbar-thin"
      )}
    >
      <ol
        role="list"
        className={cn("flex items-start", compact ? "gap-0" : "gap-0")}
        style={{ minHeight: compact ? "1.5rem" : "5.5rem" }}
      >
        {stations.map((station, i) => {
          const next = stations[i + 1];
          const segmentBreak = breaksByAfterId.get(station.id);
          return (
            <div key={station.id} className="flex items-start">
              <StationItem station={station} compact={compact} />
              {next && (
                <div className={cn("flex shrink-0", compact ? "items-center" : "items-start pt-2")}>
                  <Segment
                    fromStatus={station.status}
                    toStatus={next.status}
                    sectionBreak={segmentBreak}
                  />
                </div>
              )}
              {!next && showComingSoon && (
                <div className={cn("flex shrink-0", compact ? "items-center" : "items-start pt-0")}>
                  <ComingSoonCap />
                </div>
              )}
            </div>
          );
        })}
      </ol>
    </div>
  );
}
