"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquare01Icon,
  BookOpen01Icon,
  UserGroupIcon,
  Settings01Icon,
  Menu01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";

type Role = "learner" | "instructor" | "admin";

type NavItem = {
  label: string;
  href: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
};

type SidebarNavProps = {
  user?: { email: string; role: Role };
};

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-teal-50 text-teal-700 font-medium"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      <HugeiconsIcon icon={item.icon} size={16} strokeWidth={2} className="shrink-0" />
      {item.label}
    </Link>
  );
}

function SidebarContent({ user, onNavigate }: { user?: { email: string; role: Role }; onNavigate?: () => void }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href));

  const baseItems: NavItem[] = user
    ? [
        { label: "Dashboard", href: "/dashboard", icon: DashboardSquare01Icon },
        { label: "Courses", href: "/courses", icon: BookOpen01Icon },
      ]
    : [];

  const adminItems: NavItem[] = [
    { label: "Roster", href: "/admin/roster", icon: UserGroupIcon },
    { label: "Admin", href: "/admin", icon: Settings01Icon },
  ];

  const navItems = user?.role === "admin" ? [...baseItems, ...adminItems] : baseItems;

  return (
    <div className="flex h-full flex-col" onClick={onNavigate}>
      {/* Brand */}
      <div className="px-4 py-5">
        <div className="text-base font-semibold tracking-wide text-slate-900">CoreLMS</div>
        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">v0.1</div>
      </div>

      <div className="mx-3 border-t border-slate-100" />

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5 px-3 py-3">
        <SignedIn>
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </SignedIn>
        <SignedOut>
          <Link
            href="/sign-in"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            Sign In
          </Link>
        </SignedOut>
      </nav>

      {/* Bottom: user button */}
      <div className="border-t border-slate-100 px-4 py-4">
        <SignedIn>
          <div className="flex items-center gap-3">
            <UserButton
              afterSignOutUrl="/"
              appearance={{ elements: { avatarBox: "h-7 w-7" } }}
            />
            {user && (
              <span className="truncate text-xs text-slate-500">{user.email}</span>
            )}
          </div>
        </SignedIn>
      </div>
    </div>
  );
}

export function SidebarNav({ user }: SidebarNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <SidebarContent user={user} />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <span className="text-sm font-semibold tracking-wide text-slate-900">CoreLMS</span>
          <span className="ml-2 text-xs uppercase tracking-[0.2em] text-slate-400">v0.1</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          <HugeiconsIcon icon={mobileOpen ? Cancel01Icon : Menu01Icon} size={20} strokeWidth={2} />
        </button>
      </div>

      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-56 bg-white shadow-xl h-full">
            <SidebarContent user={user} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
