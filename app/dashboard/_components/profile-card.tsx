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
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm text-foreground">{value && value.trim() ? value : "Not set"}</p>
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

  return (
    <div className="rounded-2xl border border-border/70 bg-card/80 p-6 md:p-8 space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-muted">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            <span className="text-lg font-semibold text-muted-foreground">{initials || "?"}</span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-lg font-semibold text-foreground">{displayName}</p>
          <p className="text-sm text-muted-foreground">{email}</p>
          {accountName ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Account name: {accountName}
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
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bio</p>
        <p className="whitespace-pre-wrap text-sm text-foreground">
          {bio && bio.trim() ? bio : "Not set"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button asChild size="sm">
          <Link href="/dashboard/profile/edit">Edit profile</Link>
        </Button>
        <p className="text-xs text-muted-foreground">
          Name, email, and avatar come from your Clerk account.
        </p>
      </div>
    </div>
  );
}
