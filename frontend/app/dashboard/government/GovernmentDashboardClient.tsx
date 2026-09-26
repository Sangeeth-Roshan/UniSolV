'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import type { Ticket, Summary, InstitutionWorkload, SlaRisk, StaleTicket } from './page'

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  tickets: Ticket[]
  stats: Summary
  workload: InstitutionWorkload[]
  slaRisk: SlaRisk | null
  staleTickets: StaleTicket[]
  dispatchTicket: (id: number) => Promise<void>
  assignTicket: (id: number, instId: number) => Promise<void>
  verifyTicket?: (id: number) => Promise<void>
  closeTicket: (id: number) => Promise<void>
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusBadge(status: string) {
  const m: Record<string, string> = {
    pending_validation: 'bg-amber-100 text-amber-950 border border-amber-300 font-bold shadow-sm',
    routed:             'bg-orange-100 text-orange-950 border border-orange-300 font-bold shadow-sm',
    accepted:           'bg-orange-50 text-orange-900 border border-orange-200 font-bold shadow-sm',
    in_progress:        'bg-amber-100 text-amber-950 border border-amber-400 font-bold shadow-sm',
    piloting:           'bg-green-100 text-green-950 border border-green-300 font-bold shadow-sm',
    verified:           'bg-[#138808] text-white border border-green-600 font-bold shadow-sm',
    closed:             'bg-slate-100 text-slate-800 border border-slate-300 font-bold shadow-sm',
    escalated:          'bg-red-600 text-white border border-red-500 font-bold shadow-sm',
  }
  return m[status] ?? 'bg-slate-100 text-slate-700 border border-slate-300 font-bold'
}

function slaBadge(level: string) {
  const m: Record<string, string> = {
    breached: 'bg-red-100 text-red-900 border border-red-300 font-bold shadow-sm',
    critical: 'bg-orange-100 text-orange-950 border border-orange-300 font-bold shadow-sm',
    at_risk:  'bg-amber-100 text-amber-950 border border-amber-300 font-bold shadow-sm',
    safe:     'bg-green-100 text-green-950 border border-green-300 font-bold shadow-sm',
    no_sla:   'bg-slate-100 text-slate-600 border border-slate-300',
  }
  return m[level] ?? 'bg-slate-100 text-slate-600 border border-slate-300'
}

function slaLabel(level: string) {
  const m: Record<string, string> = {
    breached: '🔴 SLA Breached', critical: '🟠 < 6h left', at_risk: '🟡 < 24h left',
    safe: '🟢 On Track', no_sla: '— No SLA'
  }
  return m[level] ?? level
}

function severityColor(s: number | null) {
  if (!s) return 'text-slate-500'
  if (s >= 0.8) return 'text-red-600 font-extrabold'
  if (s >= 0.6) return 'text-orange-600 font-bold'
  return 'text-[#138808] font-bold'
}

function severityBar(s: number | null) {
  if (!s) return 'bg-slate-200'
  if (s >= 0.8) return 'bg-red-500'
  if (s >= 0.6) return 'bg-orange-500'
  return 'bg-[#138808]'
}

function capacityBadge(status: string) {
  const m: Record<string, string> = {
    available:  'bg-green-100 text-green-800 border border-green-300 font-bold shadow-sm',
    low_load:   'bg-teal-100 text-teal-800 border border-teal-300 font-bold shadow-sm',
    moderate:   'bg-amber-100 text-amber-800 border border-amber-300 font-bold shadow-sm',
    overloaded: 'bg-red-100 text-red-800 border border-red-300 font-bold shadow-sm',
  }
  return m[status] ?? 'bg-slate-100 text-slate-600 border border-slate-200'
}

function getReputationPct(score: number): number {
  if (score <= 1.0) return Math.round(score * 100);
  if (score <= 5.0) return Math.round((score / 5.0) * 100);
  return Math.min(100, Math.round(score));
}

function getReputationColor(pct: number): string {
  if (pct >= 75) return 'text-[#138808]';
  if (pct >= 50) return 'text-[#FF9933]';
  return 'text-red-600';
}

function getReputationBadge(pct: number): string {
  if (pct >= 75) return 'text-[#138808] bg-emerald-50 border-emerald-300';
  if (pct >= 50) return 'text-[#FF9933] bg-orange-50 border-orange-300';
  return 'text-red-700 bg-red-50 border-red-300';
}

function timeAgo(iso?: string | null) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Progress stepper: status pipeline ────────────────────────────────────────
const PIPELINE = ['pending_validation','routed','accepted','in_progress','piloting','verified','closed']
const PIPELINE_LABELS = ['Pending','Routed','Accepted','In Progress','Piloting','Verified','Closed']

function ProgressPipeline({ status }: { status: string }) {
  const idx = PIPELINE.indexOf(status)
  return (
    <div className="flex items-center gap-0 w-full mt-3 overflow-x-auto">
      {PIPELINE.map((s, i) => (
        <React.Fragment key={s}>
          <div className="flex flex-col items-center gap-1 min-w-0 shrink-0">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
              s === status
                ? 'bg-[#FF9933] border-[#FF9933] text-slate-900 shadow-sm shadow-[#FF9933]/40 scale-110'
                : i < idx
                ? 'bg-[#138808]/20 border-[#138808]/40 text-[#138808]'
                : 'bg-slate-100 border-slate-300 text-slate-600'
            }`}>
              {i < idx ? '✓' : i + 1}
            </div>
            <span className={`text-[9px] leading-tight text-center w-12 font-medium ${
              s === status ? 'text-orange-600' : i < idx ? 'text-[#138808]' : 'text-slate-700'
            }`}>{PIPELINE_LABELS[i]}</span>
          </div>
          {i < PIPELINE.length - 1 && (
            <div className={`flex-1 h-0.5 mx-0.5 min-w-3 ${i < idx ? 'bg-[#138808]/40' : 'bg-slate-100'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon }: {
  label: string; value: string | number; sub?: string; color: string; icon: React.ReactNode
}) {
  return (
    <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-5 flex items-start gap-4 hover:-translate-y-1 transition-transform">
      <div className={`shrink-0 w-11 h-11 rounded-xl ${color} flex items-center justify-center`}>{icon}</div>
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-extrabold text-slate-900 leading-none mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Tab button ────────────────────────────────────────────────────────────────
function Tab({ label, active, onClick, badge }: {
  label: string; active: boolean; onClick: () => void; badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl border transition-all backdrop-blur-xl ${
        active
          ? 'bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 border-orange-500 text-white shadow-md shadow-orange-600/25 scale-[1.02]'
          : 'bg-white/70 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-white/90 shadow-sm'
      }`}
    >
      <span>{label}</span>
      {badge != null && badge > 0 && (
        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${active ? 'bg-white text-orange-700 shadow-sm' : 'bg-red-100 text-red-700 border border-red-200'}`}>
          {badge}
        </span>
      )}
    </button>
  )
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function GovernmentDashboardClient({
  tickets, stats, workload, slaRisk, staleTickets, dispatchTicket, assignTicket, verifyTicket, closeTicket
}: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'tickets' | 'routing' | 'sla' | 'stale'>('overview')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [domainFilter, setDomainFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'severity' | 'date' | 'sla' | 'status'>('severity')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  
  // Assign modal state
  const [assignModalTicket, setAssignModalTicket] = useState<Ticket | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Lock body scroll and listen for Escape key when modal is open
  useEffect(() => {
    if (assignModalTicket) {
      document.body.style.overflow = 'hidden'
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setAssignModalTicket(null)
      }
      window.addEventListener('keydown', onKeyDown)
      return () => {
        document.body.style.overflow = ''
        window.removeEventListener('keydown', onKeyDown)
      }
    } else {
      document.body.style.overflow = ''
    }
  }, [assignModalTicket])

  const domains = useMemo(() => {
    const s = new Set(tickets.map(t => t.domain).filter(Boolean) as string[])
    return Array.from(s).sort()
  }, [tickets])

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: tickets.length }
    tickets.forEach(t => { c[t.status] = (c[t.status] ?? 0) + 1 })
    return c
  }, [tickets])

  const filtered = useMemo(() => {
    let r = [...tickets]
    if (statusFilter !== 'all') r = r.filter(t => t.status === statusFilter)
    if (domainFilter !== 'all') r = r.filter(t => t.domain === domainFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(t =>
        t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) ||
        (t.domain ?? '').toLowerCase().includes(q) || String(t.id).includes(q) ||
        (t.assigned_institution?.name ?? '').toLowerCase().includes(q)
      )
    }
    r.sort((a, b) => {
      if (sortBy === 'severity') return (b.severity_score ?? 0) - (a.severity_score ?? 0)
      if (sortBy === 'sla') {
        const ah = a.sla_hours_remaining ?? 9999, bh = b.sla_hours_remaining ?? 9999
        return ah - bh
      }
      if (sortBy === 'date') return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      return a.status.localeCompare(b.status)
    })
    return r
  }, [tickets, statusFilter, domainFilter, search, sortBy])

  const slaAlerts = (slaRisk?.breached.length ?? 0) + (slaRisk?.critical.length ?? 0)
  const staleCount = staleTickets.length

  // ── MODAL: MANUAL ASSIGN ────────────────────────────────────────────────────
  const ManualAssignModal = () => {
    if (!assignModalTicket || !mounted) return null
    return createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/40 transition-opacity"
        onClick={(e) => { if (e.target === e.currentTarget) setAssignModalTicket(null) }}
      >
        <div className="relative bg-white/95 backdrop-blur-xl border border-white/80 rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.35)] w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Indian Flag Tricolor Accent Strip */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />

          <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white/70">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Manual Routing Override</h2>
              <p className="text-xs text-slate-600">Assign Ticket #{assignModalTicket.id} to an accredited institution or agency.</p>
            </div>
            <button onClick={() => setAssignModalTicket(null)} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          <div className="p-5 overflow-y-auto space-y-3 bg-slate-50/50">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-1">Available Institutions ({workload.length})</p>
            {workload.sort((a,b) => b.reputation_score - a.reputation_score).map(inst => {
              const isDomainMatch = inst.domains_of_expertise.includes(assignModalTicket.domain ?? '')
              const isOverloaded = inst.capacity_status === 'overloaded'
              const repPct = getReputationPct(inst.reputation_score)
              return (
                <div key={inst.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-orange-500/80 hover:bg-orange-50/40 bg-white/90 backdrop-blur-xl shadow-sm transition-all">
                  <div className="flex-1 mr-4">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{inst.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md uppercase font-extrabold ${capacityBadge(inst.capacity_status)}`}>
                        {inst.capacity_status.replace('_',' ')}
                      </span>
                      {isDomainMatch && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md uppercase font-extrabold bg-orange-100 text-orange-800 border border-orange-300 shadow-sm">
                          ✓ Domain Match
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 flex flex-wrap gap-4 items-center">
                      <span>Type: <span className="text-slate-800 font-semibold capitalize">{inst.type}</span></span>
                      <span className="flex items-center gap-1.5">
                        <span>Reputation:</span>
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold border ${getReputationBadge(repPct)}`}>
                          {repPct}%
                        </span>
                      </span>
                      <span>Active Load: <span className={`font-extrabold ${isOverloaded ? 'text-red-600' : 'text-[#138808]'}`}>{inst.current_load}</span> issues</span>
                    </div>
                  </div>
                  <form action={async () => {
                    await assignTicket(assignModalTicket.id, inst.id)
                    setAssignModalTicket(null)
                  }}>
                    <button type="submit" className="text-xs font-bold px-4 py-2.5 rounded-xl bg-[#138808] hover:bg-green-700 text-white transition-all border border-green-600 shadow-md shadow-green-700/20 hover:scale-105 shrink-0">
                      Assign Institution
                    </button>
                  </form>
                </div>
              )
            })}
          </div>
        </div>
      </div>,
      document.body
    )
  }

  // ── TAB: OVERVIEW ───────────────────────────────────────────────────────────
  const OverviewTab = () => (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard label="Total Tickets" value={stats.total_tickets} sub="Platform wide" color="bg-orange-100"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>} />
        <KpiCard label="Open" value={stats.open_tickets} sub="Need action" color="bg-amber-500/20"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <KpiCard label="Resolved" value={stats.closed_tickets} sub={`${stats.resolution_rate}% rate`} color="bg-[#138808]/20"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#138808]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <KpiCard label="Escalated" value={stats.escalated_tickets} sub="Needs urgent review" color="bg-red-500/20"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
        <KpiCard label="Avg Severity" value={`${Math.round(stats.avg_severity * 100)}%`} sub="All tickets" color="bg-violet-500/20"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>} />
        <KpiCard label="Institutions" value={stats.institution_count} sub={`Avg Rep: ${getReputationPct(stats.avg_institution_reputation)}%`} color="bg-cyan-500/20"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>} />
      </div>

      {/* Alert Banner - Intense Red High Visibility Alert */}
      {(slaAlerts > 0 || staleCount > 0 || stats.escalated_tickets > 0) && (
        <div className="rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 p-5 flex flex-wrap items-center gap-4 shadow-[0_0_35px_rgba(220,38,38,0.5)] border-2 border-red-400 ring-4 ring-red-500/25 relative overflow-hidden backdrop-blur-2xl animate-pulse">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center shrink-0 shadow-lg text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div className="flex-1 min-w-[280px]">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              <p className="text-base font-black text-white uppercase tracking-wider drop-shadow-sm">
                🚨 Immediate Attention Required
              </p>
            </div>
            <p className="text-xs text-red-100 font-medium mb-3">
              Critical civic grievance bottlenecks detected in Jharkhand. Review and intervene immediately to maintain SLA compliance.
            </p>
            <div className="flex flex-wrap gap-2.5">
              {slaAlerts > 0 && (
                <button
                  onClick={() => setActiveTab('sla')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white text-red-700 font-black text-xs shadow-md hover:bg-red-50 hover:scale-105 transition-all"
                >
                  <span>⏱️</span>
                  <span>{slaAlerts} SLA Breach / Critical</span>
                  <span className="text-[10px] text-red-500 font-black">→</span>
                </button>
              )}
              {staleCount > 0 && (
                <button
                  onClick={() => setActiveTab('stale')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white text-amber-900 font-black text-xs shadow-md hover:bg-amber-50 hover:scale-105 transition-all"
                >
                  <span>⏳</span>
                  <span>{staleCount} Stale Ticket{staleCount !== 1 ? 's' : ''} (&gt;24h)</span>
                  <span className="text-[10px] text-amber-600 font-black">→</span>
                </button>
              )}
              {stats.escalated_tickets > 0 && (
                <button
                  onClick={() => { setStatusFilter('escalated'); setActiveTab('tickets') }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white text-rose-900 font-black text-xs shadow-md hover:bg-rose-50 hover:scale-105 transition-all"
                >
                  <span>⚡</span>
                  <span>{stats.escalated_tickets} Escalated to Officers</span>
                  <span className="text-[10px] text-rose-600 font-black">→</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Pipeline Summary */}
      <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Issue Pipeline Tracker</h2>
          <p className="text-xs text-slate-600">Top domain: <span className="text-slate-600 font-semibold">{stats.top_domain}</span> ({stats.top_domain_count} tickets)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.status_breakdown).sort((a,b) => b[1]-a[1]).map(([status, count]) => {
            const pct = stats.total_tickets > 0 ? ((count / stats.total_tickets) * 100).toFixed(0) : '0'
            const colors: Record<string, string> = {
              pending_validation:'bg-amber-500', routed:'bg-blue-500', accepted:'bg-violet-500',
              in_progress:'bg-cyan-500', piloting:'bg-teal-500', verified:'bg-[#138808]',
              closed:'bg-slate-500', escalated:'bg-red-500',
            }
            return (
              <button key={status} onClick={() => { setStatusFilter(status); setActiveTab('tickets') }}
                className="flex items-center gap-1.5 text-xs text-slate-500 bg-white/60 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:border-slate-300 hover:text-slate-900 transition-all">
                <span className={`w-2 h-2 rounded-full ${colors[status] ?? 'bg-slate-600'}`} />
                <span className="font-semibold text-slate-600">{count}</span>
                <span className="capitalize">{status.replace(/_/g, ' ')}</span>
                <span className="text-slate-700">({pct}%)</span>
              </button>
            )
          })}
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span>Overall Resolution Rate</span>
            <span className="font-bold text-slate-900">{stats.resolution_rate}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#138808] to-teal-500" style={{ width: `${Math.min(stats.resolution_rate, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* 2-col quick view: Institution health + SLA overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Institution snapshot */}
        <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-5 hover:border-orange-500/20 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Institution Capacity Watch</h2>
            <button onClick={() => setActiveTab('routing')} className="text-xs text-orange-600 hover:underline">View Intelligence →</button>
          </div>
          {workload.length === 0 ? (
            <p className="text-slate-600 text-sm text-center py-4">No institutions registered.</p>
          ) : (
            <div className="space-y-3">
              {workload.slice(0, 4).map(inst => (
                <div key={inst.id} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">{inst.name}</p>
                      <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${capacityBadge(inst.capacity_status)}`}>
                        {inst.capacity_status.replace('_',' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${
                          inst.capacity_status === 'overloaded' ? 'bg-red-500' :
                          inst.capacity_status === 'moderate' ? 'bg-amber-500' : 'bg-[#138808]'
                        }`} style={{ width: `${Math.min((inst.current_load / 15) * 100, 100)}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 shrink-0">Load: {inst.current_load}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-extrabold border ${getReputationBadge(getReputationPct(inst.reputation_score))}`}>
                      {getReputationPct(inst.reputation_score)}%
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">Reputation</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SLA Risk snapshot */}
        <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-5 hover:border-orange-500/20 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">SLA Health Overview</h2>
            <button onClick={() => setActiveTab('sla')} className="text-xs text-orange-600 hover:underline">Monitor SLAs →</button>
          </div>
          {!slaRisk ? (
            <p className="text-slate-600 text-sm text-center py-4">No active tickets with SLA.</p>
          ) : (
            <div className="space-y-2">
              {[
                { label: '🔴 SLA Breached', count: slaRisk.summary.breached_count, color: 'bg-red-500' },
                { label: '🟠 Critical (< 6h)', count: slaRisk.summary.critical_count, color: 'bg-orange-500' },
                { label: '🟡 At Risk (< 24h)', count: slaRisk.summary.at_risk_count, color: 'bg-amber-500' },
                { label: '🟢 On Track', count: slaRisk.summary.safe_count, color: 'bg-[#138808]' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <p className="text-xs text-slate-500 flex-1">{item.label}</p>
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${slaRisk.summary.total_active > 0 ? (item.count / slaRisk.summary.total_active) * 100 : 0}%` }} />
                  </div>
                  <span className="text-xs font-bold text-slate-600 w-5 text-right">{item.count}</span>
                </div>
              ))}
              <p className="text-xs text-slate-600 mt-2 text-center">{slaRisk.summary.total_active} active tickets under SLA monitoring</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // ── TAB: TICKET MANAGEMENT ──────────────────────────────────────────────────
  const TicketsTab = () => (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="relative group">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-focus-within:text-orange-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder="Search by title, description, domain, ID, institution..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-600 focus:outline-none focus:border-orange-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all shadow-sm" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['all', ...Object.keys(statusCounts).filter(k => k !== 'all')] as string[]).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-xl border font-semibold transition-all capitalize ${statusFilter === s ? 'bg-orange-600 border-orange-500 text-slate-900 shadow-sm shadow-[#FF9933]/30' : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}>
              {s === 'all' ? `All (${statusCounts.all})` : `${s.replace(/_/g,' ')} (${statusCounts[s]})`}
            </button>
          ))}
          {domains.length > 0 && <>
            <span className="h-5 w-px bg-slate-100 mx-1" />
            <select value={domainFilter} onChange={e => setDomainFilter(e.target.value)}
              className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-600 focus:outline-none focus:border-orange-500/50 cursor-pointer hover:border-slate-300 transition-colors">
              <option value="all">All Domains</option>
              {domains.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </>}
          <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-600 focus:outline-none focus:border-orange-500/50 cursor-pointer ml-auto hover:border-slate-300 transition-colors">
            <option value="severity">Sort: Severity ↓</option>
            <option value="sla">Sort: SLA Urgency</option>
            <option value="date">Sort: Newest</option>
            <option value="status">Sort: Status</option>
          </select>
        </div>
      </div>

      <p className="text-xs text-slate-600">Showing <span className="text-slate-600 font-semibold">{filtered.length}</span> of <span className="text-slate-600 font-semibold">{tickets.length}</span> tickets</p>

      {/* Ticket Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-12 text-center">
          <p className="text-4xl mb-2">🔍</p>
          <p className="text-slate-600 font-medium text-lg">No tickets match criteria</p>
          <p className="text-slate-500 text-sm mt-1">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(ticket => {
            const isExpanded = expandedId === ticket.id
            const isCritical = (ticket.severity_score ?? 0) >= 0.8
            const isEscalated = ticket.status === 'escalated'
            const slaUrgent = ticket.sla_status === 'breached' || ticket.sla_status === 'critical'

            // Find the latest significant event note for progress tracking
            const lastUpdate = [...ticket.events].reverse().find(e => e.notes)

            return (
              <div key={ticket.id} className={`bg-white/60 backdrop-blur-2xl border border-white/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all ${
                isEscalated ? 'border-red-500/30 bg-red-500/5' : slaUrgent ? 'border-orange-500/25 bg-orange-500/5' : isCritical ? 'border-amber-500/20' : 'border-slate-200 hover:border-orange-500/30'
              }`}>
                {/* Card header — click to expand */}
                <div className="p-5 cursor-pointer group" onClick={() => setExpandedId(isExpanded ? null : ticket.id)}>
                  <div className="flex items-start gap-4">
                    {/* Severity bar */}
                    <div className="shrink-0 flex flex-col items-center gap-1 pt-0.5">
                      <div className="w-1.5 h-16 bg-slate-100 rounded-full overflow-hidden flex flex-col-reverse shadow-sm">
                        <div className={`rounded-full ${severityBar(ticket.severity_score)}`}
                          style={{ height: `${(ticket.severity_score ?? 0) * 100}%` }} />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className="text-xs font-mono text-slate-500 font-medium">#{ticket.id}</span>
                            {isEscalated && <span className="text-[9px] font-bold text-red-300 bg-red-500/20 border border-red-500/30 px-1.5 py-0.5 rounded shadow-sm">ESCALATED</span>}
                            {isCritical && !isEscalated && <span className="text-[9px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded shadow-sm">CRITICAL</span>}
                            {slaUrgent && <span className="text-[9px] font-bold text-orange-300 bg-orange-500/20 border border-orange-500/30 px-1.5 py-0.5 rounded shadow-sm">SLA URGENT</span>}
                            {ticket.classification_confidence != null && (
                              <span className="text-[9px] text-orange-700 bg-orange-50 border border-orange-500/20 px-1.5 py-0.5 rounded" title="AI Classification Confidence">
                                AI 🤖 {(ticket.classification_confidence * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-slate-900 text-[15px] leading-snug group-hover:text-orange-700 transition-colors">{ticket.title}</h3>
                        </div>
                        <div className="shrink-0 text-right space-y-1.5">
                          <span className={`block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-sm ${statusBadge(ticket.status)}`}>
                            {ticket.status.replace(/_/g,' ')}
                          </span>
                          {ticket.sla_status && ticket.sla_status !== 'no_sla' && (
                            <span className={`block px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${slaBadge(ticket.sla_status)}`}>
                              {slaLabel(ticket.sla_status)}
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-slate-500 line-clamp-2 mb-3 mt-1 leading-relaxed">{ticket.description}</p>

                      {/* Meta tags */}
                      <div className="flex flex-wrap items-center gap-2">
                        {ticket.domain && (
                          <span className="text-xs font-mono bg-orange-50 text-orange-700 border border-orange-500/20 px-2 py-0.5 rounded-md shadow-sm">{ticket.domain}</span>
                        )}
                        <span className={`text-xs font-bold ${severityColor(ticket.severity_score)}`}>
                          Sev: {ticket.severity_score != null ? Math.round(ticket.severity_score * 100) + '%' : '—'}
                        </span>
                        {ticket.assigned_institution ? (
                          <span className="text-xs bg-violet-500/10 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                            🏢 {ticket.assigned_institution.name}
                            <span className="text-violet-400/70 capitalize">({ticket.assigned_institution.type})</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-300">Unassigned</span>
                        )}
                        {ticket.sla_hours_remaining != null && (
                          <span className={`text-xs px-2 py-0.5 rounded-md font-mono font-semibold ${ticket.sla_hours_remaining < 0 ? 'text-red-400 bg-red-500/10' : ticket.sla_hours_remaining < 24 ? 'text-amber-400 bg-amber-500/10' : 'text-slate-500 bg-slate-100'}`}>
                            ⏱ {ticket.sla_hours_remaining < 0 ? `${Math.abs(ticket.sla_hours_remaining)}h overdue` : `${ticket.sla_hours_remaining}h left`}
                          </span>
                        )}
                        {ticket.contact_phone && (
                          <a href={`tel:${ticket.contact_phone}`} onClick={e => e.stopPropagation()}
                            className="text-xs text-orange-700 hover:text-slate-900 flex items-center gap-1 bg-orange-50 border border-orange-500/20 px-2 py-0.5 rounded-md transition-colors shadow-sm">
                            📞 {ticket.contact_phone}
                          </a>
                        )}
                        <span className="text-xs text-slate-500 ml-auto font-medium">{timeAgo(ticket.created_at)}</span>
                      </div>

                      {/* Progress Pipeline Visualization */}
                      {ticket.status !== 'pending_validation' && (
                        <ProgressPipeline status={ticket.status} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-white/30">
                    <div className="p-5 space-y-5">
                      
                      {/* Media gallery */}
                      {ticket.media_urls && ticket.media_urls.length > 0 && (() => {
                        const isAudio = (u: string) => {
                          const l = u.toLowerCase()
                          return l.endsWith('.webm') || l.endsWith('.wav') || l.endsWith('.mp3') || l.endsWith('.ogg') || l.endsWith('.m4a') || l.includes('recording') || l.includes('audio') || l.includes('voice')
                        }
                        const isImg = (u: string) => {
                          const l = u.toLowerCase()
                          return l.endsWith('.png') || l.endsWith('.jpg') || l.endsWith('.jpeg') || l.endsWith('.webp') || l.endsWith('.gif') || l.endsWith('.svg') || l.includes('.png') || l.includes('.jpg')
                        }
                        const getUrl = (u: string) => {
                          if (u.startsWith('http://') || u.startsWith('https://')) return u
                          const clean = u.replace(/^\/+/, '').replace(/^uploads\//, '')
                          return `/uploads/${clean}`
                        }

                        return (
                          <div className="space-y-3">
                            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-600 flex items-center gap-1.5">
                              <span>📎</span>
                              <span>Attached Evidence / Media Files ({ticket.media_urls.length})</span>
                            </p>
                            <div className="flex gap-3 flex-wrap items-center">
                              {ticket.media_urls.map((url, i) => {
                                const fullUrl = getUrl(url)
                                const isVoice = isAudio(url)
                                const isImage = isImg(url)

                                if (isVoice) {
                                  return (
                                    <div
                                      key={i}
                                      className="p-3 rounded-2xl bg-gradient-to-r from-orange-50 via-white to-amber-50 border border-orange-300 shadow-sm backdrop-blur-xl flex flex-col gap-2 min-w-[260px] max-w-sm"
                                    >
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="inline-flex items-center gap-1.5 font-bold text-orange-950">
                                          <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                          </svg>
                                          <span>Citizen Voice Note #{i + 1}</span>
                                        </span>
                                        <a
                                          href={fullUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-[11px] font-bold text-orange-600 hover:text-orange-800 hover:underline"
                                        >
                                          Open ↗
                                        </a>
                                      </div>
                                      <audio
                                        controls
                                        preload="metadata"
                                        src={fullUrl}
                                        className="w-full h-8 rounded-lg accent-orange-600 focus:outline-none"
                                      />
                                    </div>
                                  )
                                }

                                if (isImage) {
                                  return (
                                    <a
                                      key={i}
                                      href={fullUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="shrink-0 group relative block h-24 w-32 rounded-xl bg-slate-50 border-2 border-slate-200 hover:border-orange-500 transition-all overflow-hidden shadow-sm hover:shadow-md"
                                    >
                                      <img
                                        src={fullUrl}
                                        alt={`Evidence ${i + 1}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                        onError={(e) => {
                                          (e.currentTarget as HTMLElement).style.display = 'none'
                                        }}
                                      />
                                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/80 to-transparent p-1.5 text-center text-[10px] text-white font-bold group-hover:text-orange-200 transition-colors">
                                        View Photo #{i + 1} ↗
                                      </span>
                                    </a>
                                  )
                                }

                                return (
                                  <a
                                    key={i}
                                    href={fullUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-orange-500 text-xs font-bold text-slate-800 hover:text-orange-700 shadow-sm transition-all"
                                  >
                                    <span>📄 Document #{i + 1}</span>
                                    <span className="text-[10px] text-orange-600">↗</span>
                                  </a>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })()}

                      {/* Progress Update Highlight */}
                      {lastUpdate && ticket.status !== 'closed' && (
                        <div className="bg-orange-50 border border-orange-500/20 rounded-xl p-4 flex gap-3 shadow-sm">
                          <div className="mt-0.5 text-orange-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">Latest Progress: {lastUpdate.type.replace(/_/g,' ')}</p>
                            <p className="text-sm text-slate-700">{lastUpdate.notes}</p>
                            <p className="text-[10px] text-slate-500 mt-1">{timeAgo(lastUpdate.time)}</p>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Institution detail */}
                        {ticket.assigned_institution && (
                          <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/20 h-full">
                            <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-3">Institution Assignment</p>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <p className="text-slate-500 mb-0.5">Name</p>
                                <p className="text-slate-900 font-semibold">{ticket.assigned_institution.name}</p>
                              </div>
                              <div>
                                <p className="text-slate-500 mb-0.5">Type</p>
                                <p className="text-slate-600 capitalize">{ticket.assigned_institution.type}</p>
                              </div>
                              <div>
                                <p className="text-slate-500 mb-0.5">Reputation</p>
                                <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-extrabold border ${getReputationBadge(getReputationPct(ticket.assigned_institution.reputation_score))}`}>
                                  {getReputationPct(ticket.assigned_institution.reputation_score)}%
                                </span>
                              </div>
                              <div>
                                <p className="text-slate-500 mb-0.5">Current Load</p>
                                <p className={`font-bold ${ticket.assigned_institution.current_load > 10 ? 'text-red-400' : ticket.assigned_institution.current_load > 5 ? 'text-amber-400' : 'text-[#138808]'}`}>
                                  {ticket.assigned_institution.current_load} tickets active
                                </p>
                              </div>
                            </div>
                            {ticket.assigned_institution.domains_of_expertise.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1">
                                {ticket.assigned_institution.domains_of_expertise.map(d => (
                                  <span key={d} className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${d === ticket.domain ? 'bg-[#138808]/15 text-[#138808] border-[#138808]/40' : 'bg-slate-100/80 text-slate-500 border-slate-300'}`}>
                                    {d === ticket.domain ? '★ ' : ''}{d}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Activity timeline */}
                        <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 max-h-64 overflow-y-auto">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4 sticky top-0 bg-white/90 py-1 backdrop-blur-sm z-10">Complete Audit Trail ({ticket.events?.length ?? 0})</h4>
                          {(ticket.events?.length ?? 0) === 0 ? (
                            <p className="text-xs text-slate-600 italic">No events recorded yet.</p>
                          ) : (
                            <div className="relative pl-5 space-y-4">
                              <div className="absolute left-1.5 top-1 bottom-1 w-px bg-slate-200" />
                              {ticket.events.map((e, i) => (
                                <div key={i} className="flex items-start gap-3 relative">
                                  <span className={`absolute -left-4 top-1 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${i === ticket.events.length - 1 ? 'bg-[#138808] shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-500'}`} />
                                  <div>
                                    <p className="text-xs font-bold text-slate-600 capitalize flex items-center gap-2">
                                      {e.type.replace(/_/g,' ')}
                                      <span suppressHydrationWarning className="text-[10px] text-slate-500 font-normal">{e.time ? new Date(e.time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) : '—'}</span>
                                    </p>
                                    {e.notes && <p className="text-xs text-slate-500 mt-1 leading-relaxed bg-slate-50 p-2 rounded border border-slate-200">{e.notes}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Panel */}
                    <div className="px-5 py-4 bg-slate-100 flex gap-2 flex-wrap items-center">
                      {ticket.status !== 'closed' && (
                        <div className="flex items-center gap-2 mr-auto">
                          <button onClick={() => setAssignModalTicket(ticket)} className="inline-flex items-center gap-2 px-4 py-2 bg-white/90 text-orange-900 text-xs font-extrabold uppercase tracking-wider rounded-xl hover:bg-orange-50 transition-all border border-orange-300 shadow-sm backdrop-blur-xl">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                            Manual Assign
                          </button>
                          
                          <form action={async () => { await dispatchTicket(ticket.id) }}>
                            <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 via-[#FF9933] to-amber-500 hover:from-orange-600 hover:to-orange-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all border border-orange-400/80 shadow-md shadow-orange-500/25 backdrop-blur-xl hover:scale-105">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                              Auto-Route Priority
                            </button>
                          </form>
                        </div>
                      )}

                      {ticket.status === 'piloting' && verifyTicket && (
                        <form action={async () => { await verifyTicket(ticket.id) }}>
                          <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600/90 text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-emerald-500 transition-all border border-emerald-500/40 shadow-sm shadow-emerald-500/20">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Verify &amp; Approve Completion
                          </button>
                        </form>
                      )}

                      {ticket.status !== 'closed' && (
                        <form action={async () => { await closeTicket(ticket.id) }}>
                          <button type="submit" className="inline-flex items-center gap-2 px-5 py-2 bg-slate-200/80 text-slate-900 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-slate-600 transition-all border border-slate-500/40">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            Close / Mark Resolved
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  // ── TAB: INSTITUTION ROUTING ─────────────────────────────────────────────────
  const RoutingTab = () => (
    <div className="space-y-5">
      <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-5 flex items-start gap-4 bg-[#FF9933]/5 border-orange-500/20 shadow-sm">
        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
        </div>
        <div className="text-sm text-slate-600 leading-relaxed">
          <p className="font-bold text-slate-900 mb-1 text-base">Institution Routing Intelligence</p>
          Analyze the active workload and capacity of universities and corporate partners. The AI routing engine assigns tickets based on <strong>domain expertise (2x weight)</strong>, <strong>reputation score (1x weight)</strong>, and <strong>available capacity (1x weight)</strong>. Use this dashboard to identify bottlenecks and manually intervene if an institution becomes overloaded.
        </div>
      </div>

      {workload.length === 0 ? (
        <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-8 text-center text-slate-500">No institutions registered.</div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {workload.map(inst => {
            const totalActive = Object.entries(inst.status_counts).filter(([s]) => s !== 'closed').reduce((a,[,v]) => a+v, 0)
            return (
              <div key={inst.id} className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-0 overflow-hidden hover:border-orange-500/30 transition-colors">
                {/* Header row */}
                <div className="p-5 border-b border-slate-200 bg-white/40 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-extrabold text-slate-900 text-lg">{inst.name}</h3>
                      <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-md">{inst.type}</span>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase tracking-widest shadow-sm ${capacityBadge(inst.capacity_status)}`}>
                        {inst.capacity_status.replace('_',' ')}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(inst.domains_of_expertise as string[]).map(d => (
                        <span key={d} className="text-xs bg-orange-50 text-orange-700 border border-orange-500/20 px-2 py-0.5 rounded-md font-mono shadow-sm">{d}</span>
                      ))}
                      {inst.domains_of_expertise.length === 0 && <span className="text-xs text-slate-500 italic">No domain specializations</span>}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8 text-right bg-slate-100 p-3 rounded-xl border border-slate-200">
                    <div>
                      <p className={`text-2xl font-black leading-none ${getReputationColor(getReputationPct(inst.reputation_score))}`}>{getReputationPct(inst.reputation_score)}%</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Global Rep</p>
                    </div>
                    <div className="w-px h-8 bg-slate-100" />
                    <div>
                      <p className={`text-2xl font-black leading-none ${inst.current_load > 10 ? 'text-red-400' : inst.current_load > 5 ? 'text-amber-400' : 'text-[#138808]'}`}>{inst.current_load}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Active Load</p>
                    </div>
                    <div className="w-px h-8 bg-slate-100" />
                    <div>
                      <p className="text-2xl font-black text-teal-400 leading-none">{inst.resolution_rate}%</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Resolution</p>
                    </div>
                  </div>
                </div>

                <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Performance stats */}
                  <div className="lg:col-span-1 space-y-5">
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                        <span>Capacity Utilization</span>
                        <span>{Math.min(Math.round((inst.current_load / 15) * 100), 100)}%</span>
                      </div>
                      <div className="h-2.5 bg-white rounded-full overflow-hidden shadow-sm">
                        <div className={`h-full rounded-full transition-all ${
                          inst.capacity_status === 'overloaded' ? 'bg-red-500' :
                          inst.capacity_status === 'moderate' ? 'bg-amber-500' : 'bg-[#138808]'
                        }`} style={{ width: `${Math.min((inst.current_load / 15) * 100, 100)}%` }} />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1.5 text-right">Based on est. 15 ticket limit</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/80 border border-slate-200 rounded-xl p-3">
                        <p className="text-xl font-black text-slate-900">{inst.total_tickets}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Total Assigned</p>
                      </div>
                      <div className="bg-white/80 border border-slate-200 rounded-xl p-3">
                        <p className="text-xl font-black text-cyan-400">{totalActive}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Currently Active</p>
                      </div>
                      <div className={`bg-white/80 border rounded-xl p-3 ${inst.sla_breached > 0 ? 'border-red-500/40 bg-red-500/5' : 'border-slate-200'}`}>
                        <p className={`text-xl font-black ${inst.sla_breached > 0 ? 'text-red-400' : 'text-slate-500'}`}>{inst.sla_breached}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">SLA Breached</p>
                      </div>
                      <div className={`bg-white/80 border rounded-xl p-3 ${inst.sla_at_risk + inst.sla_critical > 0 ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-200'}`}>
                        <p className={`text-xl font-black ${inst.sla_at_risk + inst.sla_critical > 0 ? 'text-amber-400' : 'text-slate-500'}`}>{inst.sla_at_risk + inst.sla_critical}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">SLA At Risk</p>
                      </div>
                    </div>
                  </div>

                  {/* Progress & Domain stats */}
                  <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="bg-white/30 rounded-xl p-4 border border-slate-200">
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-3 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        Current Queue Breakdown
                      </p>
                      {Object.entries(inst.status_counts).length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No tickets in pipeline</p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {Object.entries(inst.status_counts).sort((a,b)=>b[1]-a[1]).map(([s, c]) => (
                            <div key={s} className="flex items-center justify-between bg-slate-100 p-2 rounded-lg">
                              <span className={`text-[11px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${statusBadge(s)}`}>
                                {s.replace(/_/g,' ')}
                              </span>
                              <span className="font-bold text-slate-900 text-sm">{c}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-white/30 rounded-xl p-4 border border-slate-200">
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-3 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        Domain Performance Score
                      </p>
                      {Object.keys(inst.reputation_by_domain).length === 0 ? (
                        <p className="text-xs text-slate-500 italic">Insufficient data</p>
                      ) : (
                        <div className="space-y-3">
                          {Object.entries(inst.reputation_by_domain).sort((a,b) => b[1]-a[1]).map(([dom, score]) => (
                            <div key={dom}>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-slate-600 font-mono truncate">{dom}</span>
                                <span className="font-bold text-orange-600">{Number(score).toFixed(2)}</span>
                              </div>
                              <div className="h-1.5 bg-white rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-[#FF9933]" style={{ width: `${Number(score) * 100}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  // ── TAB: SLA RISK ────────────────────────────────────────────────────────────
  const SlaTab = () => {
    if (!slaRisk || slaRisk.summary.total_active === 0) {
      return (
        <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-16 text-center">
          <div className="w-16 h-16 bg-[#138808]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#138808]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">SLA Health is Perfect</h2>
          <p className="text-slate-500 max-w-sm mx-auto">There are no active tickets currently being tracked against SLAs, or all tickets have been resolved.</p>
        </div>
      )
    }

    const sections = [
      { key: 'breached', label: 'SLA Breached', sub: 'Overdue. Requires immediate escalation.', items: slaRisk.breached, color: 'border-red-400 bg-red-50/40 shadow-red-500/5', icon: '🔴' },
      { key: 'critical', label: 'Critical Risk', sub: 'Less than 6 hours remaining.', items: slaRisk.critical, color: 'border-orange-400 bg-orange-50/40 shadow-orange-500/5', icon: '🟠' },
      { key: 'at_risk', label: 'At Risk', sub: 'Less than 24 hours remaining.', items: slaRisk.at_risk, color: 'border-amber-400 bg-amber-50/40 shadow-amber-500/5', icon: '🟡' },
      { key: 'safe', label: 'On Track', sub: 'Plenty of time remaining.', items: slaRisk.safe, color: 'border-green-300 bg-green-50/30', icon: '🟢' },
    ]

    return (
      <div className="space-y-6">
        {/* Summary pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'SLA Breached', count: slaRisk.summary.breached_count, color: 'bg-red-50/80 text-red-800 border-red-300 shadow-red-500/10' },
            { label: 'Critical (<6h)', count: slaRisk.summary.critical_count, color: 'bg-orange-50/80 text-orange-900 border-orange-300 shadow-orange-500/10' },
            { label: 'At Risk (<24h)', count: slaRisk.summary.at_risk_count, color: 'bg-amber-50/80 text-amber-900 border-amber-300 shadow-amber-500/10' },
            { label: 'On Track (Safe)', count: slaRisk.summary.safe_count, color: 'bg-green-50/80 text-green-900 border-green-300 shadow-green-500/10' },
          ].map(p => (
            <div key={p.label} className={`flex flex-col items-center justify-center p-4 rounded-2xl border backdrop-blur-xl shadow-sm ${p.color}`}>
              <span className="text-3xl font-black mb-1">{p.count}</span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest">{p.label}</span>
            </div>
          ))}
        </div>

        {sections.map(sec => sec.items.length === 0 ? null : (
          <div key={sec.key} className="space-y-3">
            <div className="flex items-end gap-2 px-1">
              <span className="text-lg">{sec.icon}</span>
              <h3 className="text-sm font-extrabold text-slate-900 tracking-wide">{sec.label} <span className="text-slate-500 ml-1">({sec.items.length})</span></h3>
              <p className="text-xs text-slate-600 ml-2 hidden sm:block">{sec.sub}</p>
            </div>
            <div className={`rounded-2xl border backdrop-blur-xl p-3 space-y-2.5 shadow-sm ${sec.color}`}>
              {sec.items.map(t => (
                <div key={t.id} className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-white/90 border border-slate-200/80 hover:border-orange-400 hover:bg-orange-50/30 transition-all shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-50 to-slate-50 flex flex-col items-center justify-center shrink-0 border border-slate-200 shadow-inner">
                    <span className="text-[9px] text-slate-500 font-black">ID</span>
                    <span className="text-sm font-mono font-bold text-slate-900">#{t.id}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-slate-900 truncate mb-1">{t.title}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {t.domain && (
                        <span className="font-mono bg-orange-100 text-orange-800 border border-orange-300 px-2 py-0.5 rounded-md shadow-sm font-semibold capitalize">
                          {t.domain.replace(/_/g, ' ')}
                        </span>
                      )}
                      <span className="text-slate-600 flex items-center gap-1 font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        {t.assigned_institution ?? 'Unassigned'}
                      </span>
                      <span className={`font-mono font-extrabold px-2 py-0.5 rounded shadow-sm border ${
                        t.sla_hours_remaining < 0
                          ? 'bg-red-100 text-red-800 border-red-300'
                          : t.sla_hours_remaining < 6
                          ? 'bg-orange-100 text-orange-900 border-orange-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}>
                        {t.sla_hours_remaining < 0 ? `⚠️ ${Math.abs(t.sla_hours_remaining).toFixed(1)}h overdue` : `⏱️ ${t.sla_hours_remaining.toFixed(1)}h remaining`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 bg-white/80 p-2 rounded-xl border border-slate-200 shadow-sm backdrop-blur-md">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${statusBadge(t.status)}`}>
                      {t.status.replace(/_/g,' ')}
                    </span>
                    <div className="w-px h-6 bg-slate-200" />
                    <button
                      onClick={() => { setAssignModalTicket(tickets.find(tick => tick.id === t.id) ?? null) }}
                      className="text-xs px-3.5 py-1.5 bg-gradient-to-r from-orange-500 to-[#FF9933] hover:from-orange-600 hover:to-orange-500 text-white font-extrabold rounded-lg shadow-sm shadow-orange-500/20 transition-all border border-orange-400/80 uppercase tracking-wider"
                    >
                      Override
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ── TAB: STALE TICKETS ───────────────────────────────────────────────────────
  const StaleTab = () => (
    <div className="space-y-5">
      <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-5 flex items-start gap-4 bg-amber-500/5 border-amber-500/20 shadow-sm">
        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <div className="text-sm text-slate-600 leading-relaxed">
          <p className="font-bold text-slate-900 mb-1 text-base">Stale / Stuck Tickets Alert</p>
          These tickets have been assigned to an institution but have shown <strong>zero progress or updates in over 24 hours</strong>. This often indicates a blocked process or unresponsive institution. Review these cases and consider re-assigning them to maintain SLAs.
        </div>
      </div>

      {staleTickets.length === 0 ? (
        <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-16 text-center">
          <div className="w-16 h-16 bg-[#138808]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🎉</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">No Stale Tickets!</h2>
          <p className="text-slate-500 max-w-sm mx-auto">All actively routed and accepted tickets have received recent updates.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {staleTickets.map(t => (
            <div key={t.id} className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-0 border-amber-500/30 overflow-hidden flex flex-col group">
              <div className="p-5 flex-1 border-b border-slate-200 group-hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">#{t.id}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadge(t.status)}`}>{t.status.replace(/_/g,' ')}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-[15px] mb-2 leading-snug">{t.title}</h3>
                
                <div className="space-y-2 mt-4 p-3 bg-slate-100 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Institution:</span>
                    <span className="text-slate-700 font-semibold text-right">{t.assigned_institution}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Time Stale:</span>
                    <span className="font-bold text-amber-400">😴 {t.hours_stale} hours</span>
                  </div>
                  {t.sla_hours_remaining != null && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">SLA Check:</span>
                      <span className={`font-mono font-semibold ${t.sla_hours_remaining < 0 ? 'text-red-400' : 'text-slate-600'}`}>
                        {t.sla_hours_remaining < 0 ? `${Math.abs(t.sla_hours_remaining).toFixed(1)}h overdue` : `${t.sla_hours_remaining.toFixed(1)}h left`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-3 bg-slate-50 flex items-center justify-between gap-2">
                <button onClick={() => { setAssignModalTicket(tickets.find(tick => tick.id === t.id) ?? null) }} className="flex-1 text-xs px-3 py-2 bg-orange-600/20 border border-orange-500/30 text-orange-700 font-bold rounded-lg hover:bg-orange-600/40 transition-colors uppercase tracking-wider">
                  Re-Assign
                </button>
                <form className="flex-1 flex" action={async () => { await closeTicket(t.id) }}>
                  <button type="submit" className="w-full text-xs px-3 py-2 bg-slate-100 border border-slate-300 text-slate-600 font-bold rounded-lg hover:bg-slate-200 transition-colors uppercase tracking-wider">
                    Close
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // ── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-10 relative z-10">
<div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center opacity-[0.03]">
  <img src="https://upload.wikimedia.org/wikipedia/commons/f/f0/Seal_of_Jharkhand.svg" alt="Jharkhand Seal" className="w-[800px] h-[800px]" />
</div>
      <ManualAssignModal />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Jharkhand State Command Center</h1>
          <p className="page-subtitle mt-1">Official Civic Issue Management & Routing Intelligence</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/government/analytics"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600/20 border border-orange-500/30 text-orange-700 text-sm font-semibold hover:bg-orange-600/30 transition-all shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            Deep Analytics
          </Link>
          <button onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100/80 border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition-all shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex flex-wrap items-center gap-2">
        <Tab label="Action Center" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
        <Tab label="Ticket Management" active={activeTab === 'tickets'} onClick={() => setActiveTab('tickets')} badge={stats.open_tickets} />
        <Tab label="Institution Routing" active={activeTab === 'routing'} onClick={() => setActiveTab('routing')} />
        <Tab label="SLA Risk" active={activeTab === 'sla'} onClick={() => setActiveTab('sla')} badge={slaAlerts} />
        <Tab label="Stale Tickets" active={activeTab === 'stale'} onClick={() => setActiveTab('stale')} badge={staleCount} />
      </div>

      {/* Tab content */}
      <div className="animate-fade-in-up">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'tickets' && <TicketsTab />}
        {activeTab === 'routing' && <RoutingTab />}
        {activeTab === 'sla' && <SlaTab />}
        {activeTab === 'stale' && <StaleTab />}
      </div>
    </div>
  )
}
