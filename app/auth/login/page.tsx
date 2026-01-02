import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { loginUser } from "@/lib/auth";
import { PasswordInput } from "@/components/password-input";

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
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <PasswordInput id="password" name="password" label="Password" required />
            {error ? (
              <p className="text-sm font-semibold text-destructive">{error}</p>
            ) : null}
            <Button type="submit" className="w-full">
              Login
            </Button>
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
