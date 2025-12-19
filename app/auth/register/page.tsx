import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { registerUser } from "@/lib/auth";
import { PasswordInput } from "@/components/password-input";

type RegisterPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function RegisterPage(props: RegisterPageProps) {
  const searchParams = await props.searchParams;
  const error = searchParams?.error;

  async function registerAction(formData: FormData) {
    "use server";
    const email = (formData.get("email") as string | null) ?? "";
    const password = (formData.get("password") as string | null) ?? "";
    const role = (formData.get("role") as string | null) ?? "";

    const result = await registerUser({ email, password, role: role as any });
    if (!result.ok) {
      redirect(`/auth/register?error=${encodeURIComponent(result.message)}`);
    }

    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Register</h1>
        <p className="text-sm text-muted-foreground">
          Create an account to access CoreLMS. Choose learner or instructor; admin accounts are seeded
          separately.
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>Email + password only; passwords are hashed with bcrypt.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <form action={registerAction} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <PasswordInput id="password" name="password" label="Password" required minLength={8} />
            <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground" htmlFor="role">
                Role
              </label>
              <select
                id="role"
                name="role"
                defaultValue="learner"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="learner">Learner</option>
                <option value="instructor">Instructor</option>
              </select>
            </div>
            {error ? (
              <p className="text-sm font-semibold text-destructive">{error}</p>
            ) : null}
            <button
              type="submit"
              className="w-full rounded-md bg-foreground px-3 py-2 text-sm font-semibold text-background hover:bg-foreground/90"
            >
              Register
            </button>
          </form>
          <p>
            Already have an account? Go to the{" "}
            <Link className="text-foreground underline" href="/auth/login">
              login page
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
