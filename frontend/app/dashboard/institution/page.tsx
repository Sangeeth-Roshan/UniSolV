import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Institution Dashboard",
  description: "Manage and resolve civic issues assigned to your institution.",
};

const STATS = [
  { label: "Open Issues", value: "—", icon: "📋", color: "text-indigo-400" },
  { label: "In Progress", value: "—", icon: "⏳", color: "text-amber-400" },
  { label: "Resolved", value: "—", icon: "✅", color: "text-emerald-400" },
  { label: "Avg. Resolution", value: "—", icon: "📈", color: "text-violet-400" },
];

export default function InstitutionDashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">Institution Dashboard</h1>
        <p className="page-subtitle">
          Review, manage, and resolve issues assigned to your institution.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STATS.map((stat) => (
          <div key={stat.label} className="glass-card p-5">
            <div className="flex items-start justify-between mb-3">
              <span className="text-xl">{stat.icon}</span>
              <span
                className={`text-2xl font-bold ${stat.color} tabular-nums`}
              >
                {stat.value}
              </span>
            </div>
            <p className="text-sm text-slate-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Issues table placeholder */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Assigned Issues</h2>
          <span className="badge bg-indigo-500/20 text-indigo-300">
            Scaffold placeholder
          </span>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-xl bg-white/5 border border-white/5 animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
