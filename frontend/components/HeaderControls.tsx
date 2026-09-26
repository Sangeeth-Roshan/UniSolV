"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { UserMenu } from "./UserMenu";

interface HeaderControlsProps {
  isAuthenticated: boolean;
  userEmail?: string;
  role: string;
  userInitial: string;
}

function getPageName(pathname: string): string {
  if (pathname === "/") return "Overview";
  if (pathname === "/submit") return "Report an Issue";
  if (pathname === "/my-tickets") return "My Tickets";
  if (pathname === "/dashboard/government/analytics") return "Platform Analytics";
  if (pathname.startsWith("/dashboard/government")) return "Government Dashboard";
  if (pathname.startsWith("/dashboard/institution")) return "Institution Portal";
  if (pathname === "/login") return "Sign In";
  return "Platform";
}

export function HeaderControls({
  isAuthenticated,
  userEmail,
  role,
  userInitial,
}: HeaderControlsProps) {
  const pathname = usePathname();
  const pageTitle = getPageName(pathname);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-8 py-4 bg-white/40 backdrop-blur-3xl border-b border-white/60 shadow-[0_4px_30px_rgba(0,0,0,0.03)] mt-1.5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <img src="https://upload.wikimedia.org/wikipedia/commons/1/17/Ashoka_Chakra.svg" alt="Ashoka Chakra" className="w-5 h-5 opacity-70 animate-[spin_30s_linear_infinite]" /><span className="text-sm text-slate-500 font-bold uppercase tracking-wider">Jharkhand Portal</span>
        <span className="text-slate-300">/</span>
        <span className="text-sm text-orange-700 font-bold uppercase tracking-wider">{pageTitle}</span>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-4">
        {/* Interactive Notifications Bell */}
        <NotificationsDropdown />

        {/* User Profile Menu & Logout */}
        <UserMenu
          isAuthenticated={isAuthenticated}
          userEmail={userEmail}
          role={role}
          userInitial={userInitial}
        />
      </div>
    </header>
  );
}
