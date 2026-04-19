import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import "./globals.css";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import type { Role } from "@/lib/auth";

export const metadata: Metadata = {
  title: "CoreLMS Demonstration",
  description:
    "A minimalist LMS shell built with Next.js, Neon Postgres, and restrained UI to prove the commodity nature of the core LMS.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkUser = await currentUser();

  const user = clerkUser
    ? {
        email: clerkUser.primaryEmailAddress?.emailAddress ?? "",
        role: (clerkUser.publicMetadata?.role as Role) ?? "learner",
      }
    : undefined;

  return (
    <ClerkProvider>
      <html lang="en">
        <body className="antialiased bg-slate-50 text-slate-900">
          <div className="flex min-h-screen">
            <SidebarNav user={user} />
            <div className="flex flex-1 flex-col min-w-0 lg:min-h-screen">
              <main className="flex-1 px-8 py-8">
                <div className="mx-auto max-w-5xl">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
