import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LogoutPlaceholderPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Logout</h1>
        <p className="text-sm text-muted-foreground">
          This is a placeholder route; real sign-out will be wired during authentication in Phase 3.
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Not yet implemented</CardTitle>
          <CardDescription>Session handling will land with auth.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>For now, use the navigation to explore other areas of the LMS shell.</p>
          <p>
            Need to log in instead? Visit the{" "}
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
