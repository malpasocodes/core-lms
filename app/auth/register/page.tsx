import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Register</h1>
        <p className="text-sm text-muted-foreground">
          User creation will be enabled in Phase 3. This placeholder marks the flow.
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>Simple email + password registration.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Server actions will create users and establish sessions here in the next phase.</p>
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
