"use client";

import dynamic from 'next/dynamic';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, AreaChart, Area
} from 'recharts';

// Dynamically import Leaflet map with SSR disabled
const HotspotMap = dynamic(() => import('./HotspotMap'), { ssr: false });

// ── Types ─────────────────────────────────────────────────────────────────────
interface DomainItem    { name: string; value: number }
interface FunnelItem    { stage: string; count: number }
interface TrendItem     { date: string; resolution_rate: number; avg_turnaround_hours: number }
interface HotspotItem   { id: number; domain: string; member_count: number; severity: number; lat: number; lon: number }
interface LeaderboardItem {
  id: number; name: string; type: string;
  reputation_score: number; reputation_by_domain: Record<string, number>; current_load: number
}
interface SummaryData {
  total_tickets: number; open_tickets: number; closed_tickets: number
  escalated_tickets: number; resolution_rate: number; avg_severity: number
  institution_count: number; avg_institution_load: number
  top_domain: string; top_domain_count: number; tickets_with_contact: number
}

interface Props {
  domains: DomainItem[]
  funnel: FunnelItem[]
  leaderboard: LeaderboardItem[]
  hotspots: HotspotItem[]
  trends: TrendItem[]
  summary?: SummaryData | null
  ticketLocations?: any[]
}

// ── KPI Mini Card ─────────────────────────────────────────────────────────────
function MiniKpi({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div className={`glass-card p-4 border-t-2 ${accent}`}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-extrabold text-white">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function AnalyticsDashboard({ domains, funnel, leaderboard, hotspots, trends, summary, ticketLocations = [] }: Props) {
  return (
    <div className="space-y-6">
      {/* ── KPI Cards ── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <MiniKpi label="Total" value={summary.total_tickets} sub="All tickets" accent="border-indigo-500" />
          <MiniKpi label="Open" value={summary.open_tickets} sub="Awaiting action" accent="border-amber-500" />
          <MiniKpi label="Resolved" value={summary.closed_tickets} sub={`${summary.resolution_rate}% rate`} accent="border-emerald-500" />
          <MiniKpi label="Escalated" value={summary.escalated_tickets} sub="Urgent" accent="border-red-500" />
          <MiniKpi label="Avg Severity" value={`${Math.round(summary.avg_severity * 100)}%`} sub={`Top: ${summary.top_domain}`} accent="border-violet-500" />
        </div>
      )}

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* Domains Chart */}
      <div className="glass-card p-6">
        <h2 className="text-base font-semibold mb-4 text-slate-200">Tickets by Domain</h2>
        {domains.length === 0 ? (
          <p className="text-slate-500 text-sm">No data yet.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={domains} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  labelStyle={{ color: '#e2e8f0' }}
                  itemStyle={{ color: '#818cf8' }}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Funnel Chart */}
      <div className="glass-card p-6">
        <h2 className="text-base font-semibold mb-4 text-slate-200">Status Funnel</h2>
        {funnel.length === 0 ? (
          <p className="text-slate-500 text-sm">No data yet.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={funnel} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="stage" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  labelStyle={{ color: '#e2e8f0' }}
                  itemStyle={{ color: '#a78bfa' }}
                />
                <Area type="monotone" dataKey="count" stroke="#8b5cf6" fill="rgba(139,92,246,0.2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="glass-card p-6 lg:col-span-2">
        <h2 className="text-base font-semibold mb-4 text-slate-200">Active Hotspots & Tickets (Jharkhand)</h2>
        <div className="h-96 rounded-xl overflow-hidden">
          <HotspotMap hotspots={hotspots} ticketLocations={ticketLocations} />
        </div>
      </div>

      {/* Trends */}
      <div className="glass-card p-6 lg:col-span-2">
        <h2 className="text-base font-semibold mb-4 text-slate-200">Performance Trends (Last 7 Days)</h2>
        {trends.length === 0 ? (
          <p className="text-slate-500 text-sm">No data yet.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis yAxisId="left" tickFormatter={(v) => `${v}%`} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}h`} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                <Line yAxisId="left"  type="monotone" dataKey="resolution_rate"      name="Resolution Rate (%)" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="avg_turnaround_hours" name="Avg Turnaround (hrs)" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="glass-card p-6 lg:col-span-2 overflow-x-auto">
        <h2 className="text-base font-semibold mb-4 text-slate-200">Institution Leaderboard</h2>
        {leaderboard.length === 0 ? (
          <p className="text-slate-500 text-sm">No institutions registered yet.</p>
        ) : (
          <table className="min-w-full text-left text-sm text-slate-400">
            <thead className="border-b border-white/10">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-300">Rank</th>
                <th className="px-4 py-3 font-medium text-slate-300">Institution</th>
                <th className="px-4 py-3 font-medium text-slate-300">Type</th>
                <th className="px-4 py-3 font-medium text-slate-300 text-right">Reputation</th>
                <th className="px-4 py-3 font-medium text-slate-300 text-right">Load</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {leaderboard.map((inst, idx) => (
                <tr key={inst.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-500">#{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-white">{inst.name}</td>
                  <td className="px-4 py-3 capitalize text-slate-400">{inst.type}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-indigo-400">{inst.reputation_score.toFixed(2)}</span>
                    <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                      {Object.entries(inst.reputation_by_domain || {}).map(([dom, score]) => (
                        <div key={dom}>{dom}: {Number(score).toFixed(2)}</div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-400">{inst.current_load}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
    </div>
  );
}
