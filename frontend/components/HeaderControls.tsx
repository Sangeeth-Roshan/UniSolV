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
    <header className="sticky top-0 z-30 flex items-center justify-between px-8 py-4 bg-slate-950/80 backdrop-blur-sm border-b border-white/5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500 font-medium">UniSOLV</span>
        <span className="text-slate-700">/</span>
        <span className="text-sm text-slate-300 font-medium">{pageTitle}</span>
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
