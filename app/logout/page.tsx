import { redirect } from "next/navigation";

import { logoutUser, requireUser } from "@/lib/auth";

export default async function LogoutPage() {
  await requireUser();

  async function logoutAction() {
    "use server";
    await logoutUser();
    redirect("/auth/login");
  }

  return (
    <form action={logoutAction} className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold text-foreground">Logout</h1>
      <p className="text-sm text-muted-foreground">
        This will end your current session across the site. You can sign back in at any time.
      </p>
      <button
        type="submit"
        className="w-fit rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background hover:bg-foreground/90"
      >
        Confirm logout
      </button>
    </form>
  );
}
