import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loginUser } from "@/lib/auth";

type LoginPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function LoginPage(props: LoginPageProps) {
  const searchParams = await props.searchParams;
  const error = searchParams?.error;

  async function loginAction(formData: FormData) {
    "use server";
    const email = (formData.get("email") as string | null) ?? "";
    const password = (formData.get("password") as string | null) ?? "";

    const result = await loginUser({ email, password });
    if (!result.ok) {
      redirect(`/auth/login?error=${encodeURIComponent(result.message)}`);
    }

    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Login</h1>
        <p className="text-sm text-muted-foreground">
          Session-based authentication with server actions and DB-backed sessions.
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Enter your credentials to continue.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <form action={loginAction} className="space-y-3">
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
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            {error ? (
              <p className="text-sm font-semibold text-destructive">{error}</p>
            ) : null}
            <button
              type="submit"
              className="w-full rounded-md bg-foreground px-3 py-2 text-sm font-semibold text-background hover:bg-foreground/90"
            >
              Login
            </button>
          </form>
          <p>
            Need to create an account? Visit the{" "}
            <Link className="text-foreground underline" href="/auth/register">
              registration page
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
