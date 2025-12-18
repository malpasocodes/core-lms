import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { PrimaryNav } from "@/components/layout/primary-nav";
import { getCurrentUser } from "@/lib/auth";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
  const user = await getCurrentUser();

  return (
    <html lang="en" className={inter.variable}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <div className="min-h-screen bg-background">
          <header className="relative border-b border-border bg-card/80 backdrop-blur-sm">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
              <div className="flex items-center gap-2 text-foreground">
                <div className="text-lg font-semibold tracking-wide">
                  CoreLMS
                </div>
                <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  v0.1
                </span>
              </div>
              <PrimaryNav user={user ?? undefined} />
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
