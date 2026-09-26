'use client'

import Link from 'next/link'

const stats = [
  { value: '10K+', label: 'Issues Resolved',  sub: 'across all domains',   color: 'from-indigo-500 to-violet-500',  glow: 'shadow-indigo-500/20' },
  { value: '50+',  label: 'Institutions',      sub: 'universities & corps', color: 'from-cyan-500 to-emerald-500',   glow: 'shadow-cyan-500/20'   },
  { value: '98%',  label: 'Resolution Rate',   sub: 'industry-leading',     color: 'from-emerald-500 to-teal-500',   glow: 'shadow-emerald-500/20'},
  { value: '24/7', label: 'Uptime',            sub: 'always available',     color: 'from-amber-500 to-orange-500',   glow: 'shadow-amber-500/20'  },
]

const features = [
  {
    title: 'Smart AI Routing',
    desc: 'Our NLP engine reads every submission and instantly dispatches it to the most capable institution — zero manual triage, zero delays.',
    gradient: 'from-indigo-500 to-violet-600',
    glow: 'group-hover:shadow-indigo-500/25',
    border: 'group-hover:border-indigo-500/50',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 9m0 8V9m0 0L9 7" />
      </svg>
    ),
  },
  {
    title: 'Real-time Tracking',
    desc: 'Citizens watch their issue move from submission to resolution in real time. Full transparency, every step of the way.',
    gradient: 'from-cyan-500 to-emerald-500',
    glow: 'group-hover:shadow-cyan-500/25',
    border: 'group-hover:border-cyan-500/50',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    title: 'Hotspot Detection',
    desc: 'DBSCAN clustering identifies geographic and thematic hotspots automatically, enabling proactive governance before situations escalate.',
    gradient: 'from-violet-500 to-pink-600',
    glow: 'group-hover:shadow-violet-500/25',
    border: 'group-hover:border-violet-500/50',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    title: 'SLA Enforcement',
    desc: 'Automated SLA deadlines and escalation paths ensure no ticket falls through the cracks. Accountability built into every workflow.',
    gradient: 'from-amber-500 to-orange-600',
    glow: 'group-hover:shadow-amber-500/25',
    border: 'group-hover:border-amber-500/50',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Reputation Engine',
    desc: 'Institutions are scored on resolution quality, speed, and citizen satisfaction. Performance drives routing priority.',
    gradient: 'from-teal-500 to-cyan-600',
    glow: 'group-hover:shadow-teal-500/25',
    border: 'group-hover:border-teal-500/50',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    title: 'Gov Analytics',
    desc: 'Rich dashboards give government officers a bird\'s-eye view of platform health, domain trends, and institutional performance.',
    gradient: 'from-rose-500 to-pink-600',
    glow: 'group-hover:shadow-rose-500/25',
    border: 'group-hover:border-rose-500/50',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
]

const steps = [
  {
    n: '01', title: 'Citizen Reports', color: 'from-indigo-500 to-violet-600', glow: 'shadow-indigo-500/40',
    desc: 'Submit a civic issue in seconds — text, location, media. No forms, no bureaucracy.',
    icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
  },
  {
    n: '02', title: 'AI Classifies', color: 'from-violet-500 to-cyan-500', glow: 'shadow-violet-500/40',
    desc: 'NLP model categorises the issue, scores severity, and selects the best-matched institution.',
    icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  },
  {
    n: '03', title: 'Institution Acts', color: 'from-cyan-500 to-emerald-500', glow: 'shadow-cyan-500/40',
    desc: 'Assigned officers accept, work on, and close the ticket. Citizens notified at every step.',
    icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
]

import { useState, useEffect } from 'react'

function LandingPage() {
  return (
    <div className="relative -mx-8 -my-8 overflow-x-hidden min-h-screen bg-slate-950 text-white font-sans">

      {/* ── Keyframe styles ── */}
      <style>{`
        @keyframes orb { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-28px) scale(1.04)} }
        @keyframes up0 { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        .s0{animation:up0 .7s .05s both}
        .s1{animation:up0 .7s .18s both}
        .s2{animation:up0 .7s .31s both}
        .s3{animation:up0 .7s .44s both}
        .s4{animation:up0 .7s .57s both}
        .orb1{animation:orb 9s ease-in-out infinite}
        .orb2{animation:orb 12s 2s ease-in-out infinite}
        .orb3{animation:orb 10s 4.5s ease-in-out infinite}
        .orb4{animation:orb 14s 1s ease-in-out infinite}
      `}</style>

      {/* ── Ambient orbs ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="orb1 absolute -top-48 -left-48 w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[100px]" />
        <div className="orb2 absolute top-1/4 -right-56 w-[550px] h-[550px] rounded-full bg-violet-600/15 blur-[100px]" />
        <div className="orb3 absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-cyan-500/12 blur-[90px]" />
        <div className="orb4 absolute top-2/3 right-1/3 w-[300px] h-[300px] rounded-full bg-emerald-500/10 blur-[80px]" />
      </div>

      {/* ════════════ HERO ════════════ */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-8 pt-20 pb-16">

        {/* Live badge */}
        <div className="s0 mb-8 inline-flex items-center gap-2.5 px-5 py-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 backdrop-blur-sm text-indigo-300 text-sm font-semibold tracking-wide">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
          </span>
          Smart Civic Governance Platform · India
        </div>

        {/* Headline */}
        <h1 className="s1 max-w-5xl text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-7">
          <span className="text-white">Resolve Issues.</span>
          <br />
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
            Empower Communities.
          </span>
          <br />
          <span className="text-white">Drive Change.</span>
        </h1>

        {/* Tagline */}
        <p className="s2 max-w-2xl text-lg sm:text-xl text-slate-400 leading-relaxed mb-10 font-light">
          UniSOLV connects citizens with institutions using AI-powered routing,
          real-time tracking and reputation-driven accountability — turning
          civic complaints into resolved outcomes at scale.
        </p>

        {/* CTA row */}
        <div className="s3 flex flex-wrap gap-4 justify-center mb-16">
          <Link
            href="/login"
            className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-base shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-105 transition-all duration-200"
          >
            Get Started Free
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </Link>
          <a
            href="#features"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl border border-slate-700 bg-slate-900/60 backdrop-blur-sm text-slate-200 font-bold text-base hover:bg-slate-800 hover:border-slate-500 hover:scale-105 transition-all duration-200"
          >
            Explore Features
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </a>
        </div>

        {/* Gradient line separator */}
        <div className="s4 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
      </section>

      {/* ════════════ STATS ════════════ */}
      <section className="relative z-10 px-8 pb-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`group relative flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-600 transition-all duration-300 hover:-translate-y-1 shadow-lg ${s.glow}`}
              style={{ animation: `up0 .7s ${0.1 + i * 0.1}s both` }}
            >
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${s.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
              <span className={`text-4xl lg:text-5xl font-black bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.value}</span>
              <span className="mt-1.5 text-sm font-bold text-white">{s.label}</span>
              <span className="text-xs text-slate-500 mt-0.5">{s.sub}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════ FEATURES ════════════ */}
      <section id="features" className="relative z-10 px-8 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-indigo-400 font-bold text-xs uppercase tracking-[0.2em] mb-3">What UniSOLV Does</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
              Built for modern civic resolution
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-base leading-relaxed">
              Every feature is designed to reduce friction, increase accountability, and deliver real outcomes for real people.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div
                key={f.title}
                className={`group relative p-6 rounded-2xl bg-slate-900/70 border border-slate-800 ${f.border} transition-all duration-300 hover:-translate-y-1.5 shadow-lg hover:shadow-xl ${f.glow}`}
                style={{ animation: `up0 .7s ${0.1 + i * 0.08}s both` }}
              >
                <div className={`mb-5 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} shadow-lg`}>
                  {f.icon}
                </div>
                <h3 className="text-base font-bold text-white mb-2 tracking-tight">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                <div className={`mt-5 h-px bg-gradient-to-r ${f.gradient} opacity-30 group-hover:opacity-60 transition-opacity`} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ HOW IT WORKS ════════════ */}
      <section className="relative z-10 px-8 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-violet-400 font-bold text-xs uppercase tracking-[0.2em] mb-3">Workflow</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
              Three steps to resolution
            </h2>
            <p className="text-slate-400 max-w-lg mx-auto">From complaint to closure — faster than any traditional system.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 relative">
            {/* connector */}
            <div className="hidden sm:block absolute top-12 left-[20%] right-[20%] h-px bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500 opacity-25" />

            {steps.map((s, i) => (
              <div
                key={s.n}
                className="relative flex flex-col items-center text-center px-4"
                style={{ animation: `up0 .7s ${0.15 + i * 0.15}s both` }}
              >
                <div className={`relative z-10 mb-5 flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br ${s.color} shadow-2xl ${s.glow}`}>
                  {s.icon}
                </div>
                <div className="text-xs font-black text-slate-600 tracking-[0.2em] uppercase mb-2">{s.n}</div>
                <h3 className="text-lg font-extrabold text-white mb-2 tracking-tight">{s.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ CTA BANNER ════════════ */}
      <section className="relative z-10 px-8 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden">
            {/* BG */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-600" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(255,255,255,0.15)_0%,_transparent_55%)]" />
            {/* Floating shapes */}
            <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute -bottom-8 -left-8 w-48 h-48 rounded-full bg-white/5 blur-2xl" />

            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-8 px-10 py-12">
              <div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white mb-3 tracking-tight">
                  Ready to make a difference?
                </h2>
                <p className="text-indigo-100 text-base max-w-md leading-relaxed">
                  Join thousands of citizens and institutions already using UniSOLV to create measurable change in their communities.
                </p>
              </div>
              <Link
                href="/login"
                className="shrink-0 group inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-white text-indigo-700 font-extrabold text-base hover:bg-indigo-50 hover:scale-105 shadow-2xl transition-all duration-200"
              >
                Sign In Now
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-8 pb-10 text-center">
        <div className="max-w-6xl mx-auto pt-6 border-t border-slate-800">
          <p className="text-slate-600 text-sm">
            © {new Date().getFullYear()} <span className="text-slate-400 font-semibold">UniSOLV</span> · Civic Intelligence Platform · Built for Smart India Hackathon
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
    <div className="relative -mx-8 -my-8 overflow-x-hidden min-h-screen bg-slate-950 text-white px-8 py-10">
      <div className="space-y-6 animate-fade-in-up max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Jharkhand State Command Center</h1>
            <p className="text-slate-400 mt-1">Live overview of statewide civic issues, AI routing status, and resolutions.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/government" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/20 text-sm">
              Open Action Center
            </Link>
          </div>
        </div>

        {/* Priority Alerts Row */}
        {(hotspots.length > 0 || (slaRisk && slaRisk.summary.breached_count > 0)) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {hotspots.length > 0 && (
              <div className="rounded-2xl bg-violet-500/10 border border-violet-500/20 p-4 flex gap-4 items-center">
                <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-violet-300">Active Geographic Hotspots Detected</h3>
                  <p className="text-xs text-slate-400 mt-0.5"><span className="text-white font-bold">{hotspots.length}</span> critical clusters require immediate attention.</p>
                </div>
              </div>
            )}
            
            {slaRisk && slaRisk.summary.breached_count > 0 && (
              <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 flex gap-4 items-center animate-pulse">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-red-400">SLA Breach Alert</h3>
                  <p className="text-xs text-slate-400 mt-0.5"><span className="text-white font-bold">{slaRisk.summary.breached_count}</span> tickets have exceeded their mandated resolution timeframe.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-5 bg-gradient-to-br from-indigo-500/10 to-transparent border-indigo-500/20 hover:border-indigo-500/40 transition-colors">
            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5">Statewide Open</div>
            <div className="text-4xl font-black text-white">{stats ? stats.open_tickets : '—'}</div>
          </div>
          <div className="glass-card p-5 bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1.5">Statewide Resolved</div>
            <div className="text-4xl font-black text-white">{stats ? stats.closed_tickets : '—'}</div>
          </div>
          <div className="glass-card p-5 bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20 hover:border-amber-500/40 transition-colors">
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1.5">Resolution Rate</div>
            <div className="text-4xl font-black text-white">{stats ? `${stats.resolution_rate}%` : '—'}</div>
          </div>
          <div className="glass-card p-5 bg-gradient-to-br from-cyan-500/10 to-transparent border-cyan-500/20 hover:border-cyan-500/40 transition-colors">
            <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-1.5">Active Institutions</div>
            <div className="text-4xl font-black text-white">{stats ? stats.institution_count : '—'}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map Placeholder or Key Info */}
          <div className="glass-card p-6 min-h-[400px] flex flex-col relative overflow-hidden group hover:border-slate-700 transition-colors">
            <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Jharkhand_locator_map.svg/800px-Jharkhand_locator_map.svg.png')] bg-contain bg-center bg-no-repeat opacity-[0.03] group-hover:opacity-[0.08] transition-opacity" />
            <div className="relative z-10 flex-1 flex flex-col">
              <h2 className="text-lg font-bold text-white mb-2">Live AI Routing Status</h2>
              <p className="text-sm text-slate-400 mb-6">UniSOLV routing engine is currently active and processing new reports across Jharkhand in real-time.</p>
              
              <div className="space-y-4 mt-auto">
                <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-semibold text-slate-300">Natural Language Engine</span>
                  </div>
                  <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded">ONLINE</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-semibold text-slate-300">Geospatial Hotspot Mapper</span>
                  </div>
                  <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded">ONLINE</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-semibold text-slate-300">Automated Dispatcher</span>
                  </div>
                  <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded">ONLINE</span>
                </div>
              </div>
            </div>
          </div>

          {/* Live Feed */}
          <div className="glass-card p-6 flex flex-col hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Live Submission Feed</h2>
              <Link href="/dashboard/government" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">View All →</Link>
            </div>
            
            <div className="space-y-3 flex-1 overflow-y-auto pr-2">
              {tickets.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-10">Waiting for live data...</p>
              ) : (
                tickets.map(t => (
                  <div key={t.id} className="p-4 rounded-xl bg-slate-900/40 border border-white/5 hover:bg-slate-900/60 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold bg-white/10 text-slate-300 px-2 py-0.5 rounded tracking-widest uppercase">#{t.id}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.domain || 'Unclassified'}</span>
                    </div>
                    <h4 className="font-semibold text-white text-sm mb-1 truncate">{t.title}</h4>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-slate-500 flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'resolved' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        <span className="text-slate-300 font-medium capitalize">{t.status.replace(/_/g, ' ')}</span>
                      </span>
                      {t.severity_score && <span className="text-xs text-slate-500">Sev: <span className="text-red-400 font-bold">{Math.round(t.severity_score * 100)}%</span></span>}
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