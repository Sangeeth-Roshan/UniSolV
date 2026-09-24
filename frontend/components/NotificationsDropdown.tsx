"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { FormattedNotification } from "@/app/api/proxy/notifications/route";

function formatRelativeTime(dateString: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString;
  }
}

function getEventBadgeStyle(type: string) {
  switch (type) {
    case "escalated":
      return {
        bg: "bg-red-500/15 border-red-500/30 text-red-300",
        iconBg: "bg-red-500/20 text-red-400",
        icon: "🚨",
      };
    case "routed":
      return {
        bg: "bg-blue-500/15 border-blue-500/30 text-blue-300",
        iconBg: "bg-blue-500/20 text-blue-400",
        icon: "🚀",
      };
    case "accepted":
      return {
        bg: "bg-violet-500/15 border-violet-500/30 text-violet-300",
        iconBg: "bg-violet-500/20 text-violet-400",
        icon: "🤝",
      };
    case "proposal_submitted":
      return {
        bg: "bg-purple-500/15 border-purple-500/30 text-purple-300",
        iconBg: "bg-purple-500/20 text-purple-400",
        icon: "📄",
      };
    case "closed":
      return {
        bg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
        iconBg: "bg-emerald-500/20 text-emerald-400",
        icon: "✅",
      };
    case "hotspot_detected":
      return {
        bg: "bg-amber-500/15 border-amber-500/30 text-amber-300",
        iconBg: "bg-amber-500/20 text-amber-400",
        icon: "🔥",
      };
    default:
      return {
        bg: "bg-slate-500/15 border-slate-500/30 text-slate-300",
        iconBg: "bg-slate-500/20 text-slate-400",
        icon: "📢",
      };
  }
}

export function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<FormattedNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load read notifications from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("unisolv_read_notifications");
      if (stored) {
        setReadIds(new Set(JSON.parse(stored)));
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/proxy/notifications", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(data.isAuthenticated !== false);
        setNotifications(data.notifications || []);
      }
    } catch {
      // offline / backend not up
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for live updates
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const markAsRead = (id: string) => {
    const updated = new Set(readIds);
    updated.add(id);
    setReadIds(updated);
    try {
      localStorage.setItem("unisolv_read_notifications", JSON.stringify(Array.from(updated)));
    } catch {
      // ignore
    }
  };

  const markAllAsRead = () => {
    const allIds = new Set(notifications.map((n) => n.id));
    setReadIds(allIds);
    try {
      localStorage.setItem("unisolv_read_notifications", JSON.stringify(Array.from(allIds)));
    } catch {
      // ignore
    }
  };

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        id="btn-notifications"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
          isOpen
            ? "bg-indigo-600/30 text-white border border-indigo-500/50"
            : "text-slate-400 hover:text-white hover:bg-white/10"
        }`}
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-lg shadow-red-500/40 animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-white/15 shadow-2xl shadow-black/60 z-50 overflow-hidden flex flex-col max-h-[520px]">
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm">Notifications</span>
              {unreadCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
                  {unreadCount} new
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs">
                  All caught up
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={fetchNotifications}
                title="Refresh notifications"
                className={`text-xs text-slate-400 hover:text-white transition-all ${
                  loading ? "animate-spin" : ""
                }`}
              >
                🔄
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="overflow-y-auto flex-1 divide-y divide-white/5">
            {!isAuthenticated ? (
              <div className="p-8 text-center">
                <span className="text-3xl block mb-2">🔒</span>
                <p className="text-sm font-medium text-slate-300 mb-1">
                  Sign in to view notifications
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  Log in to track status changes and escalations on your tickets.
                </p>
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-md transition-all"
                >
                  Sign In →
                </Link>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <span className="text-3xl block mb-2">✨</span>
                <p className="text-sm font-medium text-slate-400 mb-1">
                  No notifications yet
                </p>
                <p className="text-xs text-slate-600">
                  Updates on submitted, routed, and resolved tickets will appear here.
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !readIds.has(n.id);
                const style = getEventBadgeStyle(n.eventType);
                return (
                  <Link
                    key={n.id}
                    href={n.href}
                    onClick={() => {
                      markAsRead(n.id);
                      setIsOpen(false);
                    }}
                    className={`p-4 flex items-start gap-3 hover:bg-white/5 transition-all text-left block group ${
                      isUnread ? "bg-indigo-500/[0.04]" : "opacity-85"
                    }`}
                  >
                    {/* Event Icon */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm shadow-md ${style.iconBg}`}
                    >
                      {style.icon}
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-semibold text-xs text-slate-200 group-hover:text-white transition-colors truncate">
                          {n.title}
                        </span>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {formatRelativeTime(n.time)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {n.notes}
                      </p>

                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-500 truncate max-w-[160px]">
                          {n.ticketTitle}
                        </span>
                        {n.domain && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10 font-mono">
                            {n.domain}
                          </span>
                        )}
                        {isUnread && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 ml-auto shrink-0 shadow-sm shadow-indigo-400" />
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          {/* Footer */}
          {isAuthenticated && notifications.length > 0 && (
            <div className="p-3 border-t border-white/10 bg-slate-950/40 text-center">
              <span className="text-[11px] text-slate-500">
                Live audit trail from UniSOLV routing & escalation engine
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
