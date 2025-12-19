"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
};

type PrimaryNavProps = {
  user?: { email: string; role: "learner" | "instructor" | "admin" };
};

export function PrimaryNav({ user }: PrimaryNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href));

  const navItems: NavItem[] = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Courses", href: "/courses" },
  ];

  if (user?.role === "admin") {
    navItems.push({ label: "Roster", href: "/admin/roster" });
    navItems.push({ label: "Admin", href: "/admin" });
  }

  if (user) {
    navItems.push({ label: "Logout", href: "/logout" });
  } else {
    navItems.push({ label: "Login", href: "/auth/login" });
    navItems.push({ label: "Register", href: "/auth/register" });
  }

  return (
    <div className="flex items-center gap-2">
      <nav className="hidden items-center gap-2 text-sm font-medium text-foreground/80 sm:flex">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-1 transition hover:bg-background/70 hover:text-foreground",
              isActive(item.href) && "bg-background/70 text-foreground"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="sm:hidden">
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          aria-label={open ? "Close navigation" : "Open navigation"}
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open ? (
        <div className="absolute left-0 right-0 top-16 z-50 border-b border-border bg-card/95 px-4 py-3 shadow-md sm:hidden">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition hover:bg-background/80 hover:text-foreground",
                  isActive(item.href) && "bg-background/70 text-foreground"
                )}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
