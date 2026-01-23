"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
};

type PrimaryNavProps = {
  user?: { email: string; role: "learner" | "instructor" | "admin" };
};

function RosterDropdown({ isActive }: { isActive: boolean }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex items-center gap-1 rounded-md px-3 py-1 transition hover:bg-background/70 hover:text-foreground",
          isActive && "bg-background/70 text-foreground"
        )}
      >
        Roster
        <svg
          className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-md border border-border bg-card py-1 shadow-lg">
          <Link
            href="/admin/roster?view=roster"
            className="block px-4 py-2 text-sm hover:bg-background/70"
            onClick={() => setOpen(false)}
          >
            View Roster
          </Link>
          <Link
            href="/admin/roster?view=approve"
            className="block px-4 py-2 text-sm hover:bg-background/70"
            onClick={() => setOpen(false)}
          >
            Approve Users
          </Link>
        </div>
      )}
    </div>
  );
}

export function PrimaryNav({ user }: PrimaryNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href));

  const navItems: NavItem[] = user
    ? [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Courses", href: "/courses" },
      ]
    : [];

  const isAdmin = user?.role === "admin";

  return (
    <div className="flex items-center gap-4">
      <SignedIn>
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
          {isAdmin && <RosterDropdown isActive={isActive("/admin/roster")} />}
        </nav>

        {/* Mobile menu button */}
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

        {/* Mobile menu dropdown */}
        {open && (
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
              {isAdmin && (
                <>
                  <div className="mt-2 border-t border-border pt-2">
                    <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Roster
                    </p>
                  </div>
                  <Link
                    href="/admin/roster?view=roster"
                    className={cn(
                      "rounded-md px-3 py-2 text-sm font-medium transition hover:bg-background/80 hover:text-foreground",
                      pathname?.includes("/admin/roster") && "bg-background/70 text-foreground"
                    )}
                    onClick={() => setOpen(false)}
                  >
                    View Roster
                  </Link>
                  <Link
                    href="/admin/roster?view=approve"
                    className="rounded-md px-3 py-2 text-sm font-medium transition hover:bg-background/80 hover:text-foreground"
                    onClick={() => setOpen(false)}
                  >
                    Approve Users
                  </Link>
                </>
              )}
            </div>
          </div>
        )}

        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: "h-8 w-8",
            },
          }}
        />
      </SignedIn>

      <SignedOut>
        <Link
          href="/sign-in"
          className={cn(
            "rounded-md px-3 py-1 text-sm font-semibold text-foreground transition hover:bg-background/70"
          )}
        >
          Sign In
        </Link>
      </SignedOut>
    </div>
  );
}
