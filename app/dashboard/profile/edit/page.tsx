import { redirect } from "next/navigation";
import Link from "next/link";

import { eq } from "drizzle-orm";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentUser } from "@/lib/auth";
import { ensureUserInDb } from "@/lib/user-sync";
import { getDb } from "@/lib/db";
import { userProfiles } from "@/lib/schema";
import { updateUserProfileAction } from "@/lib/profile-actions";

export default async function EditProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "learner") redirect("/dashboard");

  await ensureUserInDb();

  const db = await getDb();
  const profileRow = await db
    .select({
      preferredName: userProfiles.preferredName,
      timezone: userProfiles.timezone,
      location: userProfiles.location,
      linkedin: userProfiles.linkedin,
      bio: userProfiles.bio,
    })
    .from(userProfiles)
    .where(eq(userProfiles.userId, user.id))
    .limit(1);
  const profile = profileRow[0] ?? null;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Profile
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Edit profile</h1>
        <p className="text-sm text-muted-foreground">
          Name, email, and avatar are managed in your Clerk account.
        </p>
      </div>

      <form
        action={updateUserProfileAction}
        className="max-w-2xl space-y-6 rounded-2xl border border-border/70 bg-card/80 p-6 md:p-8"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="preferredName">Preferred name</Label>
            <Input
              id="preferredName"
              name="preferredName"
              defaultValue={profile?.preferredName ?? ""}
              maxLength={200}
              placeholder="George"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="timezone">Timezone</Label>
            <Input
              id="timezone"
              name="timezone"
              defaultValue={profile?.timezone ?? ""}
              maxLength={200}
              placeholder="Etc/UTC"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              defaultValue={profile?.location ?? ""}
              maxLength={200}
              placeholder="Liverpool, UK"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="linkedin">LinkedIn</Label>
            <Input
              id="linkedin"
              name="linkedin"
              defaultValue={profile?.linkedin ?? ""}
              maxLength={200}
              placeholder="https://linkedin.com/in/your-handle"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            name="bio"
            rows={5}
            defaultValue={profile?.bio ?? ""}
            maxLength={1000}
            placeholder="A short bio (up to 1000 characters)."
          />
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit">Save profile</Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
