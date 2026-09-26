"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";

interface UserMenuProps {
  isAuthenticated: boolean;
  userEmail?: string;
  role: string;
  userInitial: string;
}

export function UserMenu({
  isAuthenticated,
  userEmail,
  role,
  userInitial,
}: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const [auth, setAuth] = useState({
    isAuthenticated,
    userEmail,
    role,
    userInitial,
  });

  // Sync with live /api/auth/me session on mount and route transitions
  useEffect(() => {
    setAuth({ isAuthenticated, userEmail, role, userInitial });

    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.isAuthenticated === 'boolean') {
          setAuth({
            isAuthenticated: data.isAuthenticated,
            userEmail: data.userEmail || undefined,
            role: data.role || 'citizen',
            userInitial: data.userInitial || 'U',
          });
        }
      })
      .catch(() => {});
  }, [isAuthenticated, userEmail, role, userInitial]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      try {
        await logoutAction();
      } catch {
        // next redirect
      }
    } finally {
      window.location.href = '/login';
    }
  };

  if (!auth.isAuthenticated) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
      >
        <span>🔑</span>
        <span>Sign In</span>
      </Link>
    );
  }

  const roleLabelMap: Record<string, { title: string; badgeColor: string }> = {
    citizen: { title: "Citizen", badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
    institution: { title: "Institution / Academic", badgeColor: "bg-violet-500/20 text-violet-300 border-violet-500/30" },
    government: { title: "Government Officer", badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  };

  const currentRole = roleLabelMap[auth.role] || { title: auth.role, badgeColor: "bg-slate-500/20 text-slate-300" };

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User profile menu"
        className="flex items-center gap-2 p-1 rounded-xl hover:bg-white/5 transition-all"
      >
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-violet-500/20 ring-2 ring-transparent hover:ring-indigo-500/50 transition-all">
          {auth.userInitial}
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-white/15 shadow-2xl shadow-black/60 z-50 overflow-hidden">
          {/* User Info Header */}
          <div className="p-4 border-b border-white/10 bg-slate-950/60">
            <p className="text-xs text-slate-400">Signed in as</p>
            <p className="text-sm font-semibold text-white truncate mt-0.5">
              {auth.userEmail || "Authenticated User"}
            </p>
            <div className="mt-2">
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${currentRole.badgeColor}`}
              >
                {currentRole.title}
              </span>
            </div>
          </div>

          {/* Quick Navigation Links */}
          <div className="p-2 border-b border-white/10 space-y-1">
            {auth.role === "citizen" && (
              <>
                <Link
                  href="/submit"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-all"
                >
                  <span>📝</span>
                  <span>Report an Issue</span>
                </Link>
                <Link
                  href="/my-tickets"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-all"
                >
                  <span>🎫</span>
                  <span>My Reported Tickets</span>
                </Link>
              </>
            )}

            {auth.role === "institution" && (
              <Link
                href="/dashboard/institution"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-all"
              >
                <span>🏛️</span>
                <span>Institution Dashboard</span>
              </Link>
            )}

            {auth.role === "government" && (
              <>
                <Link
                  href="/dashboard/government"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-all"
                >
                  <span>📊</span>
                  <span>Government Overview</span>
                </Link>
                <Link
                  href="/dashboard/government/analytics"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-all"
                >
                  <span>📈</span>
                  <span>Platform Analytics</span>
                </Link>
              </>
            )}
          </div>

          {/* Logout Action */}
          <div className="p-2">
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-left disabled:opacity-50"
            >
              <span>🚪</span>
              <span>{loggingOut ? "Signing out..." : "Sign Out"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
