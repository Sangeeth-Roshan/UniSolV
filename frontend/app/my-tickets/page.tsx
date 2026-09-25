import { cookies } from 'next/headers'

// ── Types ────────────────────────────────────────────────────────────────────
interface TicketEvent { type: string; notes: string | null; time: string }
interface Ticket {
  id: number; title: string; description: string; domain: string | null;
  status: string; severity_score: number | null; events: TicketEvent[]
}

// ── Status badge helper ───────────────────────────────────────────────────────
function statusBadge(status: string) {
  const styles: Record<string, string> = {
    pending_validation: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    routed:             'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    accepted:           'bg-violet-500/20 text-violet-300 border border-violet-500/30',
    in_progress:        'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
    piloting:           'bg-teal-500/20 text-teal-300 border border-teal-500/30',
    verified:           'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    closed:             'bg-slate-500/20 text-slate-400 border border-slate-500/30',
    escalated:          'bg-red-500/20 text-red-300 border border-red-500/30',
  }
  return styles[status] ?? 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
}

async function getTickets() {
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">My Tickets</h1>
        <p className="page-subtitle">Track the status of civic issues you&apos;ve reported.</p>
      </div>

      <div className="flex flex-col gap-4">
        {(tickets as Ticket[]).map((ticket) => (
          <div key={ticket.id} className="glass-card p-5">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base text-white truncate">{ticket.title}</h3>
                <p className="text-sm text-slate-400 mt-0.5 line-clamp-2">{ticket.description}</p>
                <div className="mt-2 flex items-center gap-3 flex-wrap">
                  {ticket.domain && (
                    <span className="text-xs font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded">
                      {ticket.domain}
                    </span>
                  )}
                  {ticket.severity_score != null && (
                    <span className="text-xs text-slate-500">
                      Severity: <span className="text-slate-300">{Number(ticket.severity_score).toFixed(2)}</span>
                    </span>
                  )}
                </div>
              </div>
              <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge(ticket.status)}`}>
                {ticket.status.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Timeline */}
            {ticket.events?.length > 0 && (
              <div className="mt-5 border-t border-white/5 pt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">History</h4>
                <ul className="text-xs text-slate-500 flex flex-col gap-1.5">
                  {ticket.events.map((event: TicketEvent, i: number) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600 mt-1.5 shrink-0" />
                      <span>
                        <span className="font-semibold text-slate-400">{String(event.type).replace(/_/g, ' ')}</span>
                        {' — '}{new Date(event.time).toLocaleString()}
                        {event.notes && <span className="text-slate-600">: {event.notes}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
        {tickets.length === 0 && (
          <div className="glass-card p-8 text-center text-slate-500">
            You haven&apos;t submitted any tickets yet.{' '}
            <a href="/submit" className="text-indigo-400 hover:text-indigo-300 underline">
              Report your first issue →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
