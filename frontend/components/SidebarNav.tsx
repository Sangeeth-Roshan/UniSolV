"use client";

import React, { useState, useEffect } from "react";
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
    label: "Action Center",
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
    href: "/dashboard/government/applications",
    label: "Institution Applications",
    icon: "",
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
// SVG Icon Components (Heroicons Outline)
// ---------------------------------------------------------------------------
function IconGlobe() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="w-[18px] h-[18px] shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}

function IconPencilSquare() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="w-[18px] h-[18px] shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
  );
}

function IconTicket() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="w-[18px] h-[18px] shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z" />
    </svg>
  );
}

function IconBuildingOffice() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="w-[18px] h-[18px] shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6h1.5m-1.5 3h1.5m-1.5 3h1.5M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  );
}

function IconChartBar() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="w-[18px] h-[18px] shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

function IconPresentationChartLine() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="w-[18px] h-[18px] shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
    </svg>
  );
}

function IconArrowRightOnRect() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="w-[18px] h-[18px] shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="w-[18px] h-[18px] shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
    </svg>
  );
}

// Map each nav href to its icon component
function NavIcon({ href }: { href: string }) {
  switch (href) {
    case "/":                               return <IconGlobe />;
    case "/submit":                         return <IconPencilSquare />;
    case "/my-tickets":                     return <IconTicket />;
    case "/dashboard/institution":          return <IconBuildingOffice />;
    case "/dashboard/government":           return <IconChartBar />;
    case "/dashboard/government/analytics": return <IconPresentationChartLine />;
    case "/dashboard/government/applications": return <IconBuildingOffice />;
    case "/login":                          return <IconArrowRightOnRect />;
    default:                                return <IconGlobe />;
  }
}

// ---------------------------------------------------------------------------
// Role badge config
// ---------------------------------------------------------------------------
const ROLE_BADGE: Record<UserRole, { bg: string; text: string; label: string }> = {
  citizen:     { bg: "bg-emerald-500/15 border-emerald-500/30", text: "text-emerald-300", label: "Citizen" },
  government:  { bg: "bg-indigo-500/15 border-indigo-500/30",  text: "text-indigo-300",  label: "Government" },
  institution: { bg: "bg-violet-500/15 border-violet-500/30",  text: "text-violet-300",  label: "Institution" },
};

// ---------------------------------------------------------------------------
// Section divider
// ---------------------------------------------------------------------------
function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-2 mt-5 mb-1.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600 whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-800" />
    </div>
  );
}

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

  const [auth, setAuth] = useState({
    role,
    isAuthenticated,
    userEmail,
  });

  // Sync with live /api/auth/me session on mount and route changes
  useEffect(() => {
    setAuth({ role, isAuthenticated, userEmail });

    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.isAuthenticated === "boolean") {
          setAuth({
            isAuthenticated: data.isAuthenticated,
            userEmail: data.userEmail || undefined,
            role: (data.role as UserRole) || "citizen",
          });
        }
      })
      .catch(() => {});
  }, [role, isAuthenticated, userEmail, pathname]);

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.guestOnly && auth.isAuthenticated) return false;
    if (item.authOnly && !auth.isAuthenticated) return false;
    if (item.roles && !item.roles.includes(auth.role)) return false;
    return true;
  });

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      try {
        await logoutAction();
      } catch {
        // next redirect
      }
    } finally {
      window.location.href = "/login";
    }
  };

  const badge = ROLE_BADGE[auth.role] || ROLE_BADGE.citizen;

  const mainHrefs = new Set(["/", "/submit", "/my-tickets", "/login"]);
  const dashHrefs = new Set([
    "/dashboard/institution",
    "/dashboard/government",
    "/dashboard/government/analytics",
  ]);

  const mainItems = visibleItems.filter((i) => mainHrefs.has(i.href));
  const dashItems = visibleItems.filter((i) => dashHrefs.has(i.href));

  function NavLink({ item }: { item: NavItem }) {
    const isActive = pathname === item.href;
    return (
      <Link
        href={item.href}
        className={[
          "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
          "transition-all duration-200 group overflow-hidden",
          isActive
            ? "bg-indigo-500/20 text-white shadow-sm shadow-indigo-500/10"
            : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]",
        ].join(" ")}
      >
        {/* Left accent bar */}
        <span
          className={[
            "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-200",
            isActive
              ? "h-[55%] bg-indigo-400 opacity-100"
              : "h-0 opacity-0 group-hover:h-[35%] group-hover:opacity-30 group-hover:bg-slate-400",
          ].join(" ")}
        />

        {/* Icon */}
        <span
          className={[
            "transition-colors duration-200",
            isActive
              ? "text-indigo-300"
              : "text-slate-500 group-hover:text-slate-300",
          ].join(" ")}
        >
          <NavIcon href={item.href} />
        </span>

        {/* Label */}
        <span className="flex-1 leading-none">{item.label}</span>

        {/* Optional badge chip */}
        {item.badge && (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-500/25 text-indigo-300 border border-indigo-500/30">
            {item.badge}
          </span>
        )}

        {/* Active ring glow */}
        {isActive && (
          <span className="absolute inset-0 rounded-xl ring-1 ring-indigo-500/25 pointer-events-none" />
        )}
      </Link>
    );
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex flex-col w-[260px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-r border-white/[0.06] border-l-2 border-l-indigo-500/40">

      {/* ── Brand ── */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/40 group-hover:shadow-indigo-500/60 group-hover:scale-[1.06] transition-all duration-200 shrink-0">
            {/* Lightning bolt */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-5 h-5">
              <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z" clipRule="evenodd" />
            </svg>
            <span className="absolute inset-0 rounded-2xl ring-1 ring-indigo-400/30 group-hover:ring-indigo-400/60 transition-all" />
          </div>
          <div>
            <h1 className="text-[15px] font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent group-hover:from-indigo-200 group-hover:to-violet-200 transition-all duration-200">
              UniSOLV
            </h1>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium leading-none">
              Civic Intelligence Platform
            </p>
          </div>
        </Link>
      </div>

      {/* ── Role / Status Badge ── */}
      <div className="px-4 pt-4 pb-1">
        <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${badge.bg}`}>
          {/* Animated pulse dot */}
          <span className="relative flex h-2 w-2 shrink-0">
            {auth.isAuthenticated && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                auth.isAuthenticated ? "bg-emerald-400" : "bg-slate-600"
              }`}
            />
          </span>

          <div className="flex flex-col min-w-0 gap-0.5">
            {auth.isAuthenticated ? (
              <>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-500 leading-none">Signed in as</span>
                  <span
                    className={`text-[11px] font-bold leading-none px-1.5 py-0.5 rounded-full border ${badge.bg} ${badge.text}`}
                  >
                    {badge.label}
                  </span>
                </div>
                {auth.userEmail && (
                  <span className="text-[11px] font-mono text-slate-500 truncate leading-none">
                    {auth.userEmail}
                  </span>
                )}
              </>
            ) : (
              <span className="text-[12px] text-slate-500 font-medium leading-none">
                Guest Visitor
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 pb-4 overflow-y-auto">
        {mainItems.length > 0 && (
          <>
            <SectionLabel label="Main Menu" />
            <div className="space-y-0.5">
              {mainItems.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          </>
        )}

        {dashItems.length > 0 && (
          <>
            <SectionLabel label="Dashboards" />
            <div className="space-y-0.5">
              {dashItems.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          </>
        )}
      </nav>

      {/* ── Footer ── */}
      <div className="px-3 py-4 border-t border-white/[0.06] space-y-2">
        {auth.isAuthenticated ? (
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200 disabled:opacity-40 group"
          >
            <span className="text-red-500/70 group-hover:text-red-400 transition-colors">
              <IconLogout />
            </span>
            <span>{loggingOut ? "Signing out…" : "Sign Out"}</span>
          </button>
        ) : (
          <Link
            href="/login"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40 transition-all duration-200 group"
          >
            <span className="text-indigo-400 group-hover:text-indigo-300 transition-colors">
              <IconArrowRightOnRect />
            </span>
            <span>Sign In / Demo Login</span>
          </Link>
        )}

        <p className="text-[10px] text-slate-700 text-center font-mono tracking-wide pt-0.5">
          UniSOLV · Civic Governance · v0.1
        </p>
      </div>
    </aside>
  );
}
