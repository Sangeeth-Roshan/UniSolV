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
    "/dashboard/government/applications"
  ]);

  const mainItems = visibleItems.filter((i) => mainHrefs.has(i.href));
  const dashItems = visibleItems.filter((i) => dashHrefs.has(i.href));

  function NavLink({ item }: { item: NavItem }) {
    const isActive = pathname === item.href;
    return (
      <Link
        href={item.href}
        className={[
          "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold",
          "transition-all duration-200 group overflow-hidden",
          isActive
            ? "bg-orange-50 text-orange-800 border border-orange-200 shadow-sm"
            : "text-slate-600 hover:text-slate-900 hover:bg-white/40",
        ].join(" ")}
      >
        {/* Left accent bar */}
        <span
          className={[
            "absolute left-0 top-1/2 -translate-y-1/2 w-[4px] rounded-r-md transition-all duration-200",
            isActive
              ? "h-[60%] bg-[#FF9933] opacity-100"
              : "h-0 opacity-0 group-hover:h-[40%] group-hover:opacity-100 group-hover:bg-[#138808]",
          ].join(" ")}
        />

        {/* Icon */}
        <span
          className={[
            "transition-colors duration-200",
            isActive
              ? "text-orange-600"
              : "text-slate-400 group-hover:text-slate-600",
          ].join(" ")}
        >
          <NavIcon href={item.href} />
        </span>

        {/* Label */}
        <span className="flex-1 leading-none uppercase tracking-wide text-xs">{item.label}</span>

        {/* Optional badge chip */}
        {item.badge && (
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-orange-100 text-orange-700 border border-orange-200">
            {item.badge}
          </span>
        )}
      </Link>
    );
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex flex-col w-[260px] bg-white/50 backdrop-blur-3xl border-r border-white/60 border-l-4 border-l-[#FF9933] shadow-[4px_0_24px_rgba(0,0,0,0.02)]">

      {/* ── Brand ── */}
      <div className="px-5 py-6 border-b border-slate-200 bg-white/40">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white border-2 border-[#138808] shadow-sm group-hover:shadow-md group-hover:scale-[1.06] transition-all duration-200 shrink-0">
            {/* Jharkhand Emblem */}
            <img src="https://upload.wikimedia.org/wikipedia/commons/f/f0/Seal_of_Jharkhand.svg" alt="Jharkhand Emblem" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <h1 className="text-[14px] font-black tracking-tight text-slate-800 uppercase">
              Govt. of Jharkhand
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
              UniSOLV Portal
            </p>
          </div>
        </Link>
      </div>

      {/* ── Role / Status Badge ── */}
      <div className="px-4 pt-5 pb-2">
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-white/40 border-slate-200 shadow-sm`}>
          {/* Animated pulse dot */}
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            {auth.isAuthenticated && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#138808] opacity-60" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                auth.isAuthenticated ? "bg-[#138808]" : "bg-slate-400"
              }`}
            />
          </span>

          <div className="flex flex-col min-w-0 gap-0.5">
            {auth.isAuthenticated ? (
              <>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Signed in as</span>
                  <span
                    className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md border bg-white text-slate-800 border-slate-300 shadow-sm`}
                  >
                    {badge.label}
                  </span>
                </div>
                {auth.userEmail && (
                  <span className="text-[11px] font-semibold text-slate-600 truncate leading-none mt-1">
                    {auth.userEmail}
                  </span>
                )}
              </>
            ) : (
              <span className="text-[11px] text-slate-500 font-bold uppercase">
                Guest Visitor
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        {mainItems.length > 0 && (
          <>
            <SectionLabel label="Public Services" />
            <div className="space-y-1">
              {mainItems.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          </>
        )}

        {dashItems.length > 0 && (
          <>
            <div className="mt-4" />
            <SectionLabel label="Official Portals" />
            <div className="space-y-1">
              {dashItems.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          </>
        )}
      </nav>

      {/* ── Footer ── */}
      <div className="px-3 py-4 border-t border-slate-200 bg-white/40 space-y-2">
        {auth.isAuthenticated ? (
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-all duration-200 disabled:opacity-40 uppercase tracking-wide shadow-sm"
          >
            <IconLogout />
            <span>{loggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        ) : (
          <Link
            href="/login"
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold text-white bg-[#138808] hover:bg-green-700 transition-all duration-200 uppercase tracking-wide shadow-sm"
          >
            <IconArrowRightOnRect />
            <span>Citizen Login</span>
          </Link>
        )}

        <p className="text-[10px] text-slate-400 text-center font-semibold uppercase tracking-wider pt-2">
          Govt of Jharkhand • UniSOLV
        </p>
      </div>
    </aside>
  );
}
