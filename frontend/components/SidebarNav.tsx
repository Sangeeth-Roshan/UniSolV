"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type UserRole = "citizen" | "institution" | "government";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  /** Roles that can see this nav item. Undefined = visible to all. */
  roles?: UserRole[];
  badge?: string;
  authOnly?: boolean;
  guestOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Overview",
    icon: "🌐",
  },
  {
    href: "/submit",
    label: "Report an Issue",
    icon: "📝",
    roles: ["citizen"],
  },
  {
    href: "/my-tickets",
    label: "My Tickets",
    icon: "🎫",
    roles: ["citizen"],
  },
  {
    href: "/dashboard/institution",
    label: "Institution Dashboard",
    icon: "🏛️",
    roles: ["institution"],
  },
  {
    href: "/dashboard/government",
    label: "Government Overview",
    icon: "📊",
    roles: ["government"],
  },
  {
    href: "/dashboard/government/analytics",
    label: "Analytics",
    icon: "📈",
    roles: ["government"],
  },
  {
    href: "/login",
    label: "Login / Sign Up",
    icon: "🔑",
    guestOnly: true,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface SidebarNavProps {
  /** Current user role — defaults to "citizen" for scaffolding. */
  role?: UserRole;
  isAuthenticated?: boolean;
  userEmail?: string;
}

export function SidebarNav({
  role = "citizen",
  isAuthenticated = false,
  userEmail,
}: SidebarNavProps) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.guestOnly && isAuthenticated) return false;
    if (item.authOnly && !isAuthenticated) return false;
    if (item.roles && !item.roles.includes(role)) return false;
    return true;
  });

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutAction();
    } catch {
      // next redirect
    }
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex flex-col w-[260px] bg-slate-900/80 backdrop-blur-xl border-r border-white/5">
      {/* Logo / Brand */}
      <div className="px-6 py-6 border-b border-white/5">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
            <span className="text-lg">🌐</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight group-hover:text-indigo-300 transition-colors">
              UniSOLV
            </h1>
            <p className="text-xs text-slate-500">Civic Intelligence Platform</p>
          </div>
        </Link>
      </div>

      {/* Role indicator */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex flex-col gap-1 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isAuthenticated ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
              }`}
            />
            <span className="text-xs text-slate-400 capitalize">
              {isAuthenticated ? (
                <>
                  Signed in as{" "}
                  <span className="font-semibold text-indigo-300">{role}</span>
                </>
              ) : (
                <span className="text-slate-400">Guest Visitor</span>
              )}
            </span>
          </div>
          {userEmail && (
            <span className="text-[11px] font-mono text-slate-400 truncate">
              {userEmail}
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        <p className="px-2 mb-3 text-xs font-semibold uppercase tracking-widest text-slate-600">
          Navigation
        </p>
        {visibleItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive ? "active" : ""}`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="badge bg-indigo-500/20 text-indigo-300">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout Button */}
      <div className="px-4 py-4 border-t border-white/5 space-y-2">
        {isAuthenticated ? (
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all disabled:opacity-50"
          >
            <span>🚪</span>
            <span>{loggingOut ? "Signing out..." : "Sign Out"}</span>
          </button>
        ) : (
          <Link
            href="/login"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all"
          >
            <span>🔑</span>
            <span>Sign In / Demo Login</span>
          </Link>
        )}
        <p className="text-[11px] text-slate-600 text-center">
          UniSOLV Civic Governance v0.1
        </p>
      </div>
    </aside>
  );
}
