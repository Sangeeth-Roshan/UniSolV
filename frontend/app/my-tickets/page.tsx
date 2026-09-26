import { cookies } from 'next/headers'
import { RateTicket } from './RateTicket'
import { TicketCard, TicketData } from '@/components/TicketCard'

async function getTickets(): Promise<TicketData[]> {
  const token = cookies().get('token')?.value
  if (!token) return []
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
  try {
    const res = await fetch(`${backendUrl}/api/tickets`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export default async function MyTicketsPage() {
  const tickets = await getTickets()

  const total = tickets.length
  const openCount = tickets.filter((t) => !['verified', 'closed'].includes(t.status)).length
  const resolvedCount = tickets.filter((t) => ['verified', 'closed'].includes(t.status)).length

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="page-title">My Civic Tickets</h1>
          <p className="page-subtitle">
            Track and monitor the status of civic issues you have reported.
          </p>
        </div>

        {total > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-3 py-1.5 rounded-full bg-slate-800/80 border border-white/10 text-slate-300 font-medium">
              <span className="text-white font-bold">{total}</span> Total
            </span>
            <span className="text-xs px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 font-medium">
              <span className="font-bold">{openCount}</span> In Progress
            </span>
            <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-medium">
              <span className="font-bold">{resolvedCount}</span> Resolved
            </span>
          </div>
        )}
      </div>

      {/* ── Tickets List ────────────────────────────────────────────────────── */}
      <div className="space-y-5">
        {tickets.map((ticket) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            viewMode="citizen"
            actionsSlot={
              (ticket.status === 'verified' || ticket.status === 'closed') ? (
                <div className="bg-slate-900/40 rounded-xl p-3 border border-white/5">
                  <RateTicket ticketId={ticket.id} />
                </div>
              ) : null
            }
          />
        ))}

        {tickets.length === 0 && (
          <div className="glass-card rounded-2xl p-12 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl">
              📋
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">No Tickets Submitted Yet</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                Have an issue in your neighborhood like potholes, broken street lights, or water leakage?
                Report it to get the local university and municipal teams working on it.
              </p>
            </div>
            <a
              href="/submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:scale-105"
            >
              <span>Report an Issue</span>
              <span>→</span>
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
