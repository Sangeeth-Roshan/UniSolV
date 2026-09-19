import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UniSOLV — Civic Issue Reporting Platform",
  description: "Report, track, and resolve civic issues in your community.",
};

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero */}
      <div className="relative mb-12">
        {/* Glow */}
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-10 left-40 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Scaffold v0.1 — Local Dev
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight mb-4">
            <span className="gradient-text">UniSOLV</span>
          </h1>
          <p className="text-xl text-slate-400 leading-relaxed max-w-2xl">
            A civic-issue reporting platform that connects citizens, institutions,
            and government bodies to resolve community problems — faster.
          </p>
        </div>
      </div>

      {/* Quick-access cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
        {[
          {
            href: "/submit",
            icon: "📝",
            title: "Submit Issue",
            desc: "Report a new civic issue in your area",
            color: "from-indigo-500 to-violet-600",
            shadow: "shadow-indigo-500/20",
          },
          {
            href: "/dashboard/institution",
            icon: "🏛️",
            title: "Institution Dashboard",
            desc: "Manage assigned issues & resolutions",
            color: "from-emerald-500 to-teal-600",
            shadow: "shadow-emerald-500/20",
          },
          {
            href: "/dashboard/government",
            icon: "📊",
            title: "Government Overview",
            desc: "City-wide analytics and escalations",
            color: "from-amber-500 to-orange-600",
            shadow: "shadow-amber-500/20",
          },
        ].map((card) => (
          <a
            key={card.href}
            href={card.href}
            className="glass-card p-6 hover:border-white/20 hover:bg-white/10 transition-all duration-300 group cursor-pointer"
          >
            <div
              className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} shadow-lg ${card.shadow} mb-4 text-2xl group-hover:scale-110 transition-transform duration-200`}
            >
              {card.icon}
            </div>
            <h3 className="text-base font-semibold text-white mb-1">
              {card.title}
            </h3>
            <p className="text-sm text-slate-400">{card.desc}</p>
          </a>
        ))}
      </div>

      {/* Status strip */}
      <div className="glass-card p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-4">
          Services
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "API", status: "checking…", color: "bg-amber-400" },
            { label: "Database", status: "checking…", color: "bg-amber-400" },
            { label: "Redis", status: "checking…", color: "bg-amber-400" },
            { label: "PostGIS", status: "checking…", color: "bg-amber-400" },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-2 text-sm text-slate-400"
            >
              <span
                className={`inline-block w-2 h-2 rounded-full ${s.color} animate-pulse`}
              />
              <span className="font-medium text-slate-300">{s.label}</span>
              <span className="text-slate-600">—</span>
              <span>{s.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
