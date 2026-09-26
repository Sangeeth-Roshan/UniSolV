'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface TrendingTicket {
  id: number
  title: string
  description: string
  domain: string | null
  status: string
  severity_score: number | null
  upvotes: number
  downvotes: number
  net_votes: number
  created_at: string | null
  your_vote?: 'up' | 'down' | null
}

const DOMAIN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  roads: { bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-200' },
  water: { bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200' },
  electricity: { bg: 'bg-yellow-50', text: 'text-yellow-900', border: 'border-yellow-200' },
  sanitation: { bg: 'bg-green-50', text: 'text-green-900', border: 'border-green-200' },
  healthcare: { bg: 'bg-red-50', text: 'text-red-900', border: 'border-red-200' },
  education: { bg: 'bg-indigo-50', text: 'text-indigo-900', border: 'border-indigo-200' },
  environment: { bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-200' },
  infrastructure: { bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200' },
}

function domainStyle(domain: string | null) {
  const key = (domain || '').toLowerCase().split(/[^a-z]/)[0]
  return DOMAIN_COLORS[key] ?? { bg: 'bg-slate-50', text: 'text-slate-800', border: 'border-slate-200' }
}

function severityBar(score: number | null) {
  if (score == null) return { pct: 50, color: 'bg-[#FF9933]' }
  const norm = score > 1 ? Math.min(score / 5, 1) : Math.min(score, 1)
  const pct = Math.round(norm * 100)
  if (norm >= 0.75) return { pct, color: 'bg-red-500' }
  if (norm >= 0.4) return { pct, color: 'bg-[#FF9933]' }
  return { pct, color: 'bg-[#138808]' }
}

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const delta = Date.now() - new Date(iso).getTime()
  const h = Math.floor(delta / 3600000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return `${Math.floor(d / 7)}w ago`
}

export function TrendingIssues({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [issues, setIssues] = useState<TrendingTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [votingId, setVotingId] = useState<number | null>(null)
  const [showLoginHint, setShowLoginHint] = useState(false)
  const [sortBy, setSortBy] = useState<'votes' | 'severity'>('votes')

  const fetchTrending = useCallback(async () => {
    try {
      const [trendingRes, votesRes] = await Promise.all([
        fetch('/api/proxy/tickets/trending?limit=8'),
        isLoggedIn ? fetch('/api/proxy/tickets/my-votes') : Promise.resolve(null),
      ])
      let myVotes: Record<string, 'up' | 'down'> = {}
      if (votesRes && votesRes.ok) {
        myVotes = await votesRes.json()
      }
      if (trendingRes.ok) {
        const data: TrendingTicket[] = await trendingRes.json()
        const merged = data.map((t) => ({
          ...t,
          your_vote: myVotes[String(t.id)] ?? null,
        }))
        setIssues(merged)
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false)
    }
  }, [isLoggedIn])

  useEffect(() => {
    fetchTrending()
  }, [fetchTrending])

  // Handle upvote / downvote strictly on target ticketId
  const handleVote = async (targetTicketId: number, direction: 'up' | 'down') => {
    if (!isLoggedIn) {
      setShowLoginHint(true)
      setTimeout(() => setShowLoginHint(false), 3500)
      return
    }
    if (votingId === targetTicketId) return

    setVotingId(targetTicketId)
    const currentTicket = issues.find((i) => i.id === targetTicketId)
    if (!currentTicket) {
      setVotingId(null)
      return
    }

    // Toggle off if clicking the already active vote
    if (currentTicket.your_vote === direction) {
      try {
        const res = await fetch(`/api/proxy/tickets/${targetTicketId}/vote`, { method: 'DELETE' })
        if (res.ok) {
          const data = await res.json()
          setIssues((prev) =>
            prev.map((item) =>
              item.id === targetTicketId
                ? {
                    ...item,
                    upvotes: data.upvotes,
                    downvotes: data.downvotes,
                    net_votes: data.upvotes - data.downvotes,
                    your_vote: null,
                  }
                : item
            )
          )
        }
      } catch {
        // silent fail
      } finally {
        setVotingId(null)
      }
      return
    }

    // Otherwise cast or flip vote
    try {
      const res = await fetch(`/api/proxy/tickets/${targetTicketId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote: direction }),
      })
      if (res.ok) {
        const data = await res.json()
        setIssues((prev) =>
          prev.map((item) =>
            item.id === targetTicketId
              ? {
                  ...item,
                  upvotes: data.upvotes,
                  downvotes: data.downvotes,
                  net_votes: data.upvotes - data.downvotes,
                  your_vote: direction,
                }
              : item
          )
        )
      }
    } catch {
      // silent fail
    } finally {
      setVotingId(null)
    }
  }

  // Explicit re-sort on user command to prevent cards from jumping unexpectedly during click
  const handleSortChange = (newSort: 'votes' | 'severity') => {
    setSortBy(newSort)
    setIssues((prev) => {
      const copy = [...prev]
      if (newSort === 'votes') {
        copy.sort(
          (a, b) =>
            b.net_votes - a.net_votes ||
            (b.severity_score ?? 0) - (a.severity_score ?? 0) ||
            a.id - b.id
        )
      } else {
        copy.sort(
          (a, b) =>
            (b.severity_score ?? 0) - (a.severity_score ?? 0) ||
            b.net_votes - a.net_votes ||
            a.id - b.id
        )
      }
      return copy
    })
  }

  return (
    <section
      id="trending"
      className="relative z-10 px-4 sm:px-8 py-16 bg-white/40 backdrop-blur-xl border-t border-slate-200"
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Section Header with Indian Flag Accents & Liquid Glass */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-800 text-xs font-bold uppercase tracking-wider mb-3 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#FF9933] animate-pulse" />
            <span>Citizen Community Priorities</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            High-Impact Citizen Grievances
          </h2>
          <div className="h-1.5 w-28 bg-gradient-to-r from-[#FF9933] via-amber-400 to-[#138808] mx-auto mt-4 mb-3 rounded-full" />
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Civic challenges reported across Jharkhand. Upvote pressing community issues to accelerate administrative triage and remediation.
          </p>
        </div>

        {/* Floating Liquid Glass Login Hint Toast */}
        {showLoginHint && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900/95 backdrop-blur-2xl text-white px-6 py-3.5 rounded-2xl shadow-2xl border border-orange-500/50 animate-bounce">
            <span className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500 flex items-center justify-center text-sm shrink-0">
              🔒
            </span>
            <div className="text-left">
              <p className="text-xs sm:text-sm font-bold text-white">Sign In Required</p>
              <p className="text-[11px] sm:text-xs text-slate-300">
                You must be logged in to upvote or downvote issues.{' '}
                <Link href="/login" className="text-[#FF9933] font-bold underline hover:text-orange-300">
                  Sign in here →
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* Sort Controls & Feed Status */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-xl rounded-2xl p-1.5 border border-white/90 shadow-xs">
            <button
              onClick={() => handleSortChange('votes')}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                sortBy === 'votes'
                  ? 'bg-gradient-to-r from-[#FF9933] to-amber-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              🔥 Most Voted First
            </button>
            <button
              onClick={() => handleSortChange('severity')}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                sortBy === 'severity'
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md shadow-red-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              ⚡ Highest Severity First
            </button>
            <button
              onClick={fetchTrending}
              title="Refresh live vote counts"
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 transition-all text-xs font-bold"
            >
              🔄
            </button>
          </div>

          {!isLoggedIn ? (
            <span className="text-xs text-slate-600 bg-white/80 backdrop-blur-md border border-slate-200/90 rounded-full px-4 py-1.5 font-medium flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#FF9933]" />
              <span>Browsing as Guest — </span>
              <Link href="/login" className="text-orange-600 font-bold hover:underline">
                Sign in to vote
              </Link>
            </span>
          ) : (
            <span className="text-xs text-emerald-800 bg-emerald-50/90 backdrop-blur-md border border-emerald-200 rounded-full px-4 py-1.5 font-bold flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#138808] animate-pulse" />
              <span>Voting Enabled for Your Account</span>
            </span>
          )}
        </div>

        {/* Issues Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 gap-5">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-48 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/80 animate-pulse"
              />
            ))}
          </div>
        ) : issues.length === 0 ? (
          <div className="bg-white/75 backdrop-blur-2xl border border-white/80 rounded-2xl p-12 text-center shadow-xs">
            <div className="w-16 h-16 mx-auto rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center mb-4 text-2xl">
              📢
            </div>
            <p className="text-slate-700 font-bold text-base">No active issues in the community feed.</p>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Be the first citizen to report a grievance in your locality.
            </p>
            <Link
              href="/submit"
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#138808] text-white font-bold text-xs sm:text-sm shadow-md shadow-green-700/20 hover:bg-green-700 transition-all border border-green-600"
            >
              <span>✍️</span>
              <span>Report an Issue</span>
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-5">
            {issues.map((issue, idx) => {
              const { pct, color } = severityBar(issue.severity_score)
              const ds = domainStyle(issue.domain)
              const netPositive = issue.net_votes > 0
              const netNegative = issue.net_votes < 0
              const isVotingThis = votingId === issue.id

              return (
                <div
                  key={`ticket-${issue.id}`}
                  className="group relative bg-white/80 backdrop-blur-2xl border border-white/90 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-xl hover:border-orange-200 transition-all duration-200 flex flex-col justify-between"
                >
                  {/* Top Indian Tricolor Accent Strip */}
                  <div
                    className={`h-1.5 w-full ${
                      idx === 0
                        ? 'bg-gradient-to-r from-[#FF9933] via-white to-[#138808]'
                        : idx === 1
                        ? 'bg-gradient-to-r from-[#FF9933] via-amber-400 to-[#FF9933]'
                        : 'bg-gradient-to-r from-[#138808] via-emerald-400 to-[#138808]'
                    }`}
                  />

                  <div className="p-5 space-y-3.5">
                    {/* Top Row: Priority Badge + Ticket ID + Domain + Time */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Priority Rank Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border shadow-xs ${
                            idx === 0
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : idx === 1
                              ? 'bg-slate-100 text-slate-800 border-slate-300'
                              : idx === 2
                              ? 'bg-orange-100 text-orange-900 border-orange-300'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          <span>{idx === 0 ? '🏆 1st' : idx === 1 ? '🥈 2nd' : idx === 2 ? '🥉 3rd' : `#${idx + 1}`}</span>
                        </span>

                        {/* Distinct Ticket ID Pill */}
                        <span className="font-mono text-xs font-extrabold text-slate-700 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-full">
                          #{issue.id}
                        </span>

                        {/* Domain Tag */}
                        {issue.domain && (
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full border capitalize ${ds.bg} ${ds.text} ${ds.border}`}
                          >
                            🏷️ {issue.domain.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] text-slate-400 font-semibold shrink-0">
                        {timeAgo(issue.created_at)}
                      </span>
                    </div>

                    {/* Issue Title */}
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug line-clamp-2">
                      {issue.title}
                    </h3>

                    {/* Description Snippet */}
                    <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed font-normal">
                      {issue.description || 'No detailed description filed.'}
                    </p>

                    {/* Severity Progress Indicator */}
                    {issue.severity_score != null && (
                      <div className="space-y-1 pt-0.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-600">Assessed Severity:</span>
                          <span
                            className={`font-black ${
                              pct >= 75 ? 'text-red-600' : pct >= 40 ? 'text-[#FF9933]' : 'text-[#138808]'
                            }`}
                          >
                            {pct}% ({pct >= 75 ? 'Critical' : pct >= 40 ? 'Moderate' : 'Normal'})
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${color} transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Footer with Clean Button Layout */}
                  <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100/90 flex items-center justify-between gap-3">
                    {/* Net Votes Summary Indicator */}
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs sm:text-sm font-black flex items-center gap-1 ${
                          netPositive
                            ? 'text-[#138808]'
                            : netNegative
                            ? 'text-red-600'
                            : 'text-slate-500'
                        }`}
                      >
                        <span>{netPositive ? '🔥 +' : netNegative ? '🔻 ' : '— '}</span>
                        <span>{issue.net_votes} Net Impact</span>
                      </span>
                    </div>

                    {/* Upvote & Downvote Buttons (Upvote LEFT, Downvote RIGHT) */}
                    <div className="flex items-center gap-2">
                      {/* UPVOTE BUTTON */}
                      <button
                        type="button"
                        onClick={() => handleVote(issue.id, 'up')}
                        disabled={isVotingThis}
                        title={
                          !isLoggedIn
                            ? 'Sign in to vote'
                            : issue.your_vote === 'up'
                            ? 'Click to remove your upvote'
                            : 'Upvote this issue'
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 ${
                          issue.your_vote === 'up'
                            ? 'bg-[#138808] text-white border-green-700 shadow-md shadow-green-700/30 ring-2 ring-green-500/20'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-green-500 hover:bg-green-50 hover:text-[#138808] shadow-xs'
                        } ${isVotingThis ? 'opacity-50 cursor-wait' : 'cursor-pointer active:scale-95'}`}
                      >
                        <span className="text-sm">▲</span>
                        <span className="font-extrabold">{issue.upvotes}</span>
                        <span className="text-[10px] uppercase tracking-wider opacity-80">Up</span>
                      </button>

                      {/* DOWNVOTE BUTTON */}
                      <button
                        type="button"
                        onClick={() => handleVote(issue.id, 'down')}
                        disabled={isVotingThis}
                        title={
                          !isLoggedIn
                            ? 'Sign in to vote'
                            : issue.your_vote === 'down'
                            ? 'Click to remove your downvote'
                            : 'Downvote this issue'
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 ${
                          issue.your_vote === 'down'
                            ? 'bg-red-600 text-white border-red-700 shadow-md shadow-red-600/30 ring-2 ring-red-500/20'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-red-400 hover:bg-red-50 hover:text-red-700 shadow-xs'
                        } ${isVotingThis ? 'opacity-50 cursor-wait' : 'cursor-pointer active:scale-95'}`}
                      >
                        <span className="text-sm">▼</span>
                        <span className="font-extrabold">{issue.downvotes}</span>
                        <span className="text-[10px] uppercase tracking-wider opacity-80">Down</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Citizen Call-to-Action Footer */}
        <div className="text-center pt-2">
          <p className="text-xs sm:text-sm text-slate-600 mb-3 font-medium">
            Are you facing an unaddressed civic issue in your neighborhood?
          </p>
          <Link
            href="/submit"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-[#FF9933] to-amber-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-500/20 hover:from-orange-600 hover:to-amber-600 transition-all border border-orange-400"
          >
            <span>✍️</span>
            <span>Report a New Civic Issue</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
