'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

const stats = [
  { value: '10K+', label: 'Issues Resolved', sub: 'across all domains', color: 'text-orange-500', bg: 'bg-orange-50' },
  { value: '50+', label: 'Institutions', sub: 'departments & agencies', color: 'text-green-600', bg: 'bg-green-50' },
  { value: '98%', label: 'Resolution Rate', sub: 'industry-leading', color: 'text-orange-500', bg: 'bg-orange-50' },
  { value: '24/7', label: 'Availability', sub: 'always online', color: 'text-green-600', bg: 'bg-green-50' },
]

const features = [
  {
    title: 'Smart AI Routing',
    desc: 'Our NLP engine reads every submission and instantly dispatches it to the most capable institution â€” zero manual triage, zero delays.',
    icon: (
      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    colorClass: 'bg-[#FF9933]'
  },
  {
    title: 'Real-time Tracking',
    desc: 'Citizens watch their issue move from submission to resolution in real time. Full transparency, every step of the way.',
    icon: (
      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    colorClass: 'bg-[#138808]'
  },
  {
    title: 'Hotspot Detection',
    desc: 'DBSCAN clustering identifies geographic and thematic hotspots automatically, enabling proactive governance before situations escalate.',
    icon: (
      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    colorClass: 'bg-[#FF9933]'
  },
  {
    title: 'SLA Enforcement',
    desc: 'Automated SLA deadlines and escalation paths ensure no ticket falls through the cracks. Accountability built into every workflow.',
    icon: (
      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    colorClass: 'bg-[#138808]'
  },
  {
    title: 'Reputation Engine',
    desc: 'Institutions are scored on resolution quality, speed, and citizen satisfaction. Performance drives routing priority.',
    icon: (
      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    colorClass: 'bg-[#FF9933]'
  },
  {
    title: 'Gov Analytics',
    desc: 'Rich dashboards give government officers a bird\'s-eye view of platform health, domain trends, and institutional performance.',
    icon: (
      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    colorClass: 'bg-[#138808]'
  },
]

const steps = [
  {
    n: '01', title: 'Citizen Reports', colorClass: 'bg-[#FF9933]',
    desc: 'Submit a civic issue in seconds â€” text, location, media. No forms, no bureaucracy.',
    icon: <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
  },
  {
    n: '02', title: 'AI Classifies', colorClass: 'bg-slate-700',
    desc: 'NLP model categorises the issue, scores severity, and selects the best-matched institution.',
    icon: <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>,
  },
  {
    n: '03', title: 'Institution Acts', colorClass: 'bg-[#138808]',
    desc: 'Assigned officers accept, work on, and close the ticket. Citizens notified at every step.',
    icon: <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
]

function LandingPage() {
  return (
    <div className="relative -mx-8 -my-8 overflow-x-hidden min-h-screen bg-transparent text-slate-900 font-sans">
      
      {/* Header bar */}
      <div className="bg-white/40 backdrop-blur-xl border-b border-white/60 py-2 px-8 flex justify-between items-center text-sm font-semibold text-slate-600">
        <div className="flex items-center gap-2">
          <img src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" alt="Satyameva Jayate" className="h-8 w-5 object-contain" />
          <span>Government of Jharkhand</span>
        </div>
        <div>
          <span className="text-[#FF9933]">Jharkhand</span> <span className="text-[#138808]">Samadhan Portal</span>
        </div>
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â•â• HERO â•â•â•â•â•â•â•â•â•â•â•â• */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-8 pt-20 pb-16 bg-white/40 backdrop-blur-xl border-b border-white/60">
        <div className="mb-6 inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-green-200 bg-green-50 text-green-700 text-sm font-semibold tracking-wide">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Official Citizen Service Portal
        </div>

        <h1 className="max-w-4xl text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-6 text-slate-900">
          Empowering Citizens with <br />
          <span className="text-[#FF9933]">Swift</span> & <span className="text-[#138808]">Transparent</span> Resolution
        </h1>

        <p className="max-w-2xl text-lg text-slate-600 leading-relaxed mb-10">
          The Jharkhand Samadhan Portal connects citizens with government departments using AI-powered routing, real-time tracking, and reputation-driven accountability to ensure rapid issue resolution.
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-[#FF9933] text-white font-bold text-base shadow-md hover:bg-orange-600 transition-colors"
          >
            Report an Issue
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </Link>
          <a
            href="#features"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-lg border border-slate-300 bg-white/40 backdrop-blur-xl text-slate-700 font-bold text-base hover:bg-slate-50 transition-colors shadow-sm"
          >
            Learn More
          </a>
        </div>
      </section>

      {/* â•â•â•â•â•â•â•â•â•â•â•â• STATS â•â•â•â•â•â•â•â•â•â•â•â• */}
      <section className="relative z-10 px-8 py-12 bg-slate-50 border-b border-slate-200">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {stats.map((s, i) => (
            <div key={s.label} className={`p-6 rounded-xl border border-slate-200 bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.05)] flex flex-col items-center text-center`}>
              <span className={`text-4xl font-black ${s.color} mb-2`}>{s.value}</span>
              <span className="font-bold text-slate-800">{s.label}</span>
              <span className="text-xs text-slate-500 mt-1">{s.sub}</span>
            </div>
          ))}
        </div>
      </section>

      {/* â•â•â•â•â•â•â•â•â•â•â•â• FEATURES â•â•â•â•â•â•â•â•â•â•â•â• */}
      <section id="features" className="relative z-10 px-8 py-16 bg-white/40 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-4">
              Modernizing Governance
            </h2>
            <div className="h-1 w-24 bg-[#FF9933] mx-auto mb-4 rounded-full"></div>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Leveraging technology to bridge the gap between citizens and administration.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div key={f.title} className="p-6 rounded-xl bg-slate-50 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className={`mb-4 inline-flex items-center justify-center w-12 h-12 rounded-lg ${f.colorClass} shadow-sm`}>
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* â•â•â•â•â•â•â•â•â•â•â•â• HOW IT WORKS â•â•â•â•â•â•â•â•â•â•â•â• */}
      <section className="relative z-10 px-8 py-16 bg-slate-50 border-t border-slate-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-4">
              How It Works
            </h2>
            <div className="h-1 w-24 bg-[#138808] mx-auto mb-4 rounded-full"></div>
            <p className="text-slate-600 max-w-lg mx-auto">Three simple steps to transparent governance.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 relative">
            <div className="hidden sm:block absolute top-10 left-[20%] right-[20%] h-0.5 bg-slate-300 border-dashed border-t-2" />
            {steps.map((s, i) => (
              <div key={s.n} className="relative flex flex-col items-center text-center px-4 bg-white/60 backdrop-blur-xl p-6 rounded-xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.05)] z-10">
                <div className={`mb-4 flex items-center justify-center w-20 h-20 rounded-full ${s.colorClass} shadow-md border-4 border-white`}>
                  {s.icon}
                </div>
                <div className="text-sm font-black text-slate-400 mb-1">STEP {s.n}</div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-slate-600 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* â•â•â•â•â•â•â•â•â•â•â•â• CTA BANNER â•â•â•â•â•â•â•â•â•â•â•â• */}
      <section className="relative z-10 px-8 py-16 bg-white/40 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto rounded-2xl overflow-hidden shadow-lg border border-slate-200 relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#FF9933] via-white to-[#138808]"></div>
          <div className="bg-slate-50 px-10 py-12 flex flex-col sm:flex-row items-center justify-between gap-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">
                Be a Part of the Solution
              </h2>
              <p className="text-slate-600 max-w-md">
                Register on the portal today to report issues, track progress, and contribute to the development of Jharkhand.
              </p>
            </div>
            <Link
              href="/login"
              className="shrink-0 inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-[#138808] text-white font-bold text-base shadow-md hover:bg-green-700 transition-colors"
            >
              Access Portal
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-8 bg-slate-900 text-center text-slate-400 border-t-4 border-[#FF9933]">
        <div className="max-w-6xl mx-auto">
          <p className="text-sm mb-2">
            Â© {new Date().getFullYear()} <span className="text-white font-semibold">Government of Jharkhand</span> Â· Jharkhand Samadhan Portal
          </p>
          <p className="text-xs">
            Designed for transparent, efficient, and accountable governance.
          </p>
        </div>
      </footer>
    </div>
  )
}

function GovtOverview() {
  const [stats, setStats] = useState<any>(null)
  const [tickets, setTickets] = useState<any[]>([])
  const [hotspots, setHotspots] = useState<any[]>([])
  const [slaRisk, setSlaRisk] = useState<any>(null)
  
  useEffect(() => {
    const fetchGovtData = async () => {
      try {
        const [sumRes, tickRes, hotRes, slaRes] = await Promise.all([
          fetch('/api/analytics/summary'),
          fetch('/api/tickets'),
          fetch('/api/analytics/hotspots'),
          fetch('/api/analytics/sla-risk')
        ])
        if (sumRes.ok) setStats(await sumRes.json())
        if (tickRes.ok) {
          const t = await tickRes.json()
          setTickets(t.slice(0, 5))
        }
        if (hotRes.ok) setHotspots(await hotRes.json())
        if (slaRes.ok) setSlaRisk(await slaRes.json())
      } catch (e) { console.error(e) }
    }
    fetchGovtData()
  }, [])

  return (
    <div className="relative -mx-8 -my-8 overflow-x-hidden min-h-screen bg-transparent text-slate-900 font-sans">
      
      {/* Header bar */}
      <div className="bg-white/40 backdrop-blur-xl border-b border-white/60 py-3 px-8 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <img src="https://upload.wikimedia.org/wikipedia/commons/f/f0/Seal_of_Jharkhand.svg" alt="Jharkhand Seal" className="h-10 w-10 object-contain" />
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">Jharkhand State Command Center</h1>
            <p className="text-xs text-slate-500">Official Governance Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard/government" className="px-4 py-2 bg-[#FF9933] hover:bg-orange-600 text-white font-bold rounded-lg transition-colors shadow-sm text-sm">
            Open Action Center
          </Link>
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto space-y-6">
        
        {/* Priority Alerts Row */}
        {(hotspots.length > 0 || (slaRisk && slaRisk.summary.breached_count > 0)) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
            {hotspots.length > 0 && (
              <div className="rounded-xl bg-orange-50 border border-orange-200 p-4 flex gap-4 items-center shadow-sm">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center shrink-0 border border-orange-200">
                  <svg className="h-6 w-6 text-[#FF9933]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Active Hotspots Detected</h3>
                  <p className="text-xs text-slate-600 mt-0.5"><span className="text-orange-600 font-bold">{hotspots.length}</span> critical clusters require immediate attention.</p>
                </div>
              </div>
            )}
            
            {slaRisk && slaRisk.summary.breached_count > 0 && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex gap-4 items-center shadow-sm">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0 border border-red-200">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-red-700">SLA Breach Alert</h3>
                  <p className="text-xs text-slate-600 mt-0.5"><span className="text-red-600 font-bold">{slaRisk.summary.breached_count}</span> tickets have exceeded mandated resolution time.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/60 backdrop-blur-xl p-5 rounded-xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.05)] border-t-4 border-t-orange-400">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Statewide Open</div>
            <div className="text-3xl font-black text-slate-800">{stats ? stats.open_tickets : 'â€”'}</div>
          </div>
          <div className="bg-white/60 backdrop-blur-xl p-5 rounded-xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.05)] border-t-4 border-t-[#138808]">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Statewide Resolved</div>
            <div className="text-3xl font-black text-slate-800">{stats ? stats.closed_tickets : 'â€”'}</div>
          </div>
          <div className="bg-white/60 backdrop-blur-xl p-5 rounded-xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.05)] border-t-4 border-t-orange-400">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Resolution Rate</div>
            <div className="text-3xl font-black text-slate-800">{stats ? `${stats.resolution_rate}%` : 'â€”'}</div>
          </div>
          <div className="bg-white/60 backdrop-blur-xl p-5 rounded-xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.05)] border-t-4 border-t-[#138808]">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Active Institutions</div>
            <div className="text-3xl font-black text-slate-800">{stats ? stats.institution_count : 'â€”'}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map Placeholder or Key Info */}
          <div className="bg-white/60 backdrop-blur-xl rounded-xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.05)] p-6 min-h-[400px] flex flex-col relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
              <img src="https://upload.wikimedia.org/wikipedia/commons/c/cc/Jharkhand_locator_map.svg" alt="Map" />
            </div>
            <div className="relative z-10 flex-1 flex flex-col">
              <h2 className="text-lg font-bold text-slate-800 mb-2 border-b border-slate-100 pb-2">AI Routing Engine Status</h2>
              <p className="text-sm text-slate-600 mb-6">Processing new reports across Jharkhand in real-time.</p>
              
              <div className="space-y-3 mt-auto">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#138808] animate-pulse" />
                    <span className="font-semibold text-slate-700 text-sm">Natural Language Engine</span>
                  </div>
                  <span className="text-[10px] text-[#138808] font-bold bg-green-100 px-2 py-1 rounded">ONLINE</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#138808] animate-pulse" />
                    <span className="font-semibold text-slate-700 text-sm">Geospatial Hotspot Mapper</span>
                  </div>
                  <span className="text-[10px] text-[#138808] font-bold bg-green-100 px-2 py-1 rounded">ONLINE</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#138808] animate-pulse" />
                    <span className="font-semibold text-slate-700 text-sm">Automated Dispatcher</span>
                  </div>
                  <span className="text-[10px] text-[#138808] font-bold bg-green-100 px-2 py-1 rounded">ONLINE</span>
                </div>
              </div>
            </div>
          </div>

          {/* Live Feed */}
          <div className="bg-white/60 backdrop-blur-xl rounded-xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.05)] p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
              <h2 className="text-lg font-bold text-slate-800">Live Submission Feed</h2>
              <Link href="/dashboard/government" className="text-xs font-semibold text-[#FF9933] hover:underline">View All â†’</Link>
            </div>
            
            <div className="space-y-3 flex-1 overflow-y-auto pr-2">
              {tickets.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-10">Waiting for live data...</p>
              ) : (
                tickets.map(t => (
                  <div key={t.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded tracking-widest uppercase">#{t.id}</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.domain || 'Unclassified'}</span>
                    </div>
                    <h4 className="font-semibold text-slate-800 text-sm mb-1 truncate">{t.title}</h4>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-600 flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'resolved' ? 'bg-[#138808]' : 'bg-[#FF9933]'}`} />
                        <span className="font-medium capitalize">{t.status.replace(/_/g, ' ')}</span>
                      </span>
                      {t.severity_score && <span className="text-xs text-slate-500">Sev: <span className="text-red-600 font-bold">{Math.round(t.severity_score * 100)}%</span></span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OverviewPage() {
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.isAuthenticated) setRole(data.role)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return null

  if (role === 'government') {
    return <GovtOverview />
  }

  return <LandingPage />
}