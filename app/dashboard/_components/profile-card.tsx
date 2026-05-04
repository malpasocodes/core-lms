import Link from "next/link";

import { Button } from "@/components/ui/button";

type Props = {
  avatarUrl: string | null;
  displayName: string;
  email: string;
  accountName: string | null;
  preferredName: string | null;
  timezone: string | null;
  location: string | null;
  linkedin: string | null;
  bio: string | null;
};

function Field({ label, value }: { label: string; value: string | null }) {
  const isSet = value && value.trim();
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
        {label}
      </p>
      <p className={isSet ? "text-sm text-slate-900" : "text-sm italic text-slate-400"}>
        {isSet ? value : "Not set"}
      </p>
    </div>
  );
}

export function ProfileCard({
  avatarUrl,
  displayName,
  email,
  accountName,
  preferredName,
  timezone,
  location,
  linkedin,
  bio,
}: Props) {
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const hasBio = bio && bio.trim();
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8 space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            <span className="text-lg font-semibold text-slate-500">{initials || "?"}</span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-lg font-semibold text-slate-900">{displayName}</p>
          <p className="text-sm text-slate-500">{email}</p>
          {accountName ? (
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
              Account: {accountName}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Preferred name" value={preferredName} />
        <Field label="Timezone" value={timezone} />
        <Field label="Location" value={location} />
        <Field label="LinkedIn" value={linkedin} />
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Bio</p>
        <p
          className={
            hasBio
              ? "whitespace-pre-wrap text-sm text-slate-900"
              : "text-sm italic text-slate-400"
          }
        >
          {hasBio ? bio : "Not set"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          asChild
          size="sm"
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <Link href="/dashboard/profile/edit">Edit profile</Link>
        </Button>
        <p className="text-xs text-slate-500">
          Name, email, and avatar come from your Clerk account.
        </p>
      </div>
    </div>
  );
}
