import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Government Overview",
  description: "City-wide civic issue analytics, escalations, and reporting.",
};

const REGIONS = [
  { name: "North District", open: "—", escalated: "—", resolved: "—" },
  { name: "South District", open: "—", escalated: "—", resolved: "—" },
  { name: "East District", open: "—", escalated: "—", resolved: "—" },
  { name: "West District", open: "—", escalated: "—", resolved: "—" },
];

export default function GovernmentDashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">Government Overview</h1>
        <p className="page-subtitle">
          City-wide analytics, escalations, and departmental performance.
        </p>
      </div>

      {/* Map placeholder */}
      <div className="glass-card mb-6 flex items-center justify-center h-64">
        <div className="text-center">
          <span className="text-4xl block mb-3">🗺️</span>
          <p className="text-slate-500 text-sm">
            Interactive PostGIS map — coming soon
          </p>
        </div>
      </div>

      {/* Regional breakdown */}
      <div className="glass-card p-6">
        <h2 className="text-base font-semibold text-white mb-5">
          Regional Breakdown
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-white/5">
                <th className="pb-3 pr-6 font-medium">Region</th>
                <th className="pb-3 pr-6 font-medium">Open</th>
                <th className="pb-3 pr-6 font-medium">Escalated</th>
                <th className="pb-3 font-medium">Resolved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {REGIONS.map((r) => (
                <tr key={r.name} className="text-slate-300">
                  <td className="py-3 pr-6 font-medium">{r.name}</td>
                  <td className="py-3 pr-6 text-indigo-400">{r.open}</td>
                  <td className="py-3 pr-6 text-amber-400">{r.escalated}</td>
                  <td className="py-3 text-emerald-400">{r.resolved}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-slate-600">
          Scaffold placeholder — data not yet connected.
        </p>
      </div>
    </div>
  );
}
