import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Login</h1>
        <p className="text-sm text-muted-foreground">
          Authentication will be implemented in Phase 3. This placeholder shows where the experience lives.
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>Session-based auth with email and password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Form fields and server actions will be wired here during Phase 3.</p>
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
