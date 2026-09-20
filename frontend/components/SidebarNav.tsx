"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
}

const NAV_ITEMS: NavItem[] = [
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
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface SidebarNavProps {
  /** Current user role — defaults to "citizen" for scaffolding. */
  role?: UserRole;
}

export function SidebarNav({ role = "citizen" }: SidebarNavProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex flex-col w-[260px] bg-slate-900/80 backdrop-blur-xl border-r border-white/5">
      {/* Logo / Brand */}
      <div className="px-6 py-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
            <span className="text-lg">🌐</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">
              UniSOLV
            </h1>
            <p className="text-xs text-slate-500">Civic Issue Platform</p>
          </div>
        </div>
      </div>

      {/* Role indicator */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-400 capitalize">
            Signed in as{" "}
            <span className="font-semibold text-indigo-300">{role}</span>
          </span>
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

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/5">
        <p className="text-xs text-slate-600 text-center">
          UniSOLV v0.1.0 — Scaffold
        </p>
      </div>
    </aside>
  );
}
