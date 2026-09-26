import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { TicketCard, TicketData } from '@/components/TicketCard'

interface Institution {
  id: number
  name: string
  type: string
  domains_of_expertise: string[]
  reputation_score: number
  current_load: number
}

async function getData(): Promise<{ tickets: TicketData[]; institutions: Institution[] }> {
  const token = cookies().get('token')?.value
  if (!token) return { tickets: [], institutions: [] }
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
  try {
    const [ticketsRes, institutionsRes] = await Promise.all([
      fetch(`${backendUrl}/api/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      }),
      fetch(`${backendUrl}/api/institutions`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      }),
    ])
    const tickets = ticketsRes.ok ? await ticketsRes.json() : []
    const institutions = institutionsRes.ok ? await institutionsRes.json() : []
    return { tickets, institutions }
  } catch {
    return { tickets: [], institutions: [] }
  }
}

export default async function GovernmentDashboardPage() {
  const { tickets, institutions } = await getData()

  const pendingDispatch = tickets.filter((t) => t.status === 'pending_validation').length
  const awaitingVerification = tickets.filter((t) => t.status === 'piloting').length
  const activeFieldWork = tickets.filter((t) => ['routed', 'accepted', 'in_progress'].includes(t.status)).length
  const resolvedCount = tickets.filter((t) => ['verified', 'closed'].includes(t.status)).length

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Government Civic Operations</h1>
          <p className="page-subtitle">
            City-wide issue monitoring, academic/corporate partner dispatching, and resolution verification.
          </p>
        </div>

        {tickets.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-3 py-1.5 rounded-full bg-slate-800/80 border border-white/10 text-slate-300 font-medium">
              <span className="text-white font-bold">{tickets.length}</span> Total
            </span>
            {pendingDispatch > 0 && (
              <span className="text-xs px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 font-medium">
                <span className="font-bold">{pendingDispatch}</span> Needs Dispatch
              </span>
            )}
            {awaitingVerification > 0 && (
              <span className="text-xs px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/25 text-teal-300 font-medium">
                <span className="font-bold">{awaitingVerification}</span> Ready for Verification
              </span>
            )}
            <span className="text-xs px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 font-medium">
              <span className="font-bold">{activeFieldWork}</span> Active
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
            viewMode="government"
            actionsSlot={
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Dispatch Form (Auto or Manual) */}
                {(ticket.status === 'pending_validation' || ticket.status === 'escalated') && (
                  <form
                    action={async (formData: FormData) => {
                      'use server'
                      const t = cookies().get('token')?.value
                      const instId = formData.get('institution_id') as string
                      const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
                      try {
                        const body: Record<string, unknown> = {}
                        if (instId) body.institution_id = parseInt(instId, 10)
                        const res = await fetch(`${backendUrl}/api/tickets/${ticket.id}/dispatch`, {
                          method: 'POST',
                          headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
                          body: JSON.stringify(body),
                        })
                        if (res.ok) revalidatePath('/dashboard/government')
                      } catch {}
                    }}
                    className="flex items-center gap-2 flex-wrap"
                  >
                    <select
                      name="institution_id"
                      className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 max-w-[240px]"
                    >
                      <option value="">🤖 AI Auto-Assign (Recommended)</option>
                      {institutions.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.name} ({inst.type}) · Load: {inst.current_load}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/20 transition-all border border-blue-500/30"
                    >
                      <span>🚀</span>
                      <span>Dispatch</span>
                    </button>
                  </form>
                )}

                {/* Reassign Form */}
                {ticket.status === 'routed' && (
                  <form
                    action={async (formData: FormData) => {
                      'use server'
                      const t = cookies().get('token')?.value
                      const instId = formData.get('institution_id') as string
                      const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
                      try {
                        const body: Record<string, unknown> = {}
                        if (instId) body.institution_id = parseInt(instId, 10)
                        const res = await fetch(`${backendUrl}/api/tickets/${ticket.id}/dispatch`, {
                          method: 'POST',
                          headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
                          body: JSON.stringify(body),
                        })
                        if (res.ok) revalidatePath('/dashboard/government')
                      } catch {}
                    }}
                    className="flex items-center gap-2 flex-wrap"
                  >
                    <select
                      name="institution_id"
                      className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 max-w-[240px]"
                    >
                      <option value="">Reassign to Partner...</option>
                      {institutions.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.name} ({inst.type})
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all border border-indigo-500/30"
                    >
                      <span>Reassign</span>
                    </button>
                  </form>
                )}

                {/* Verify Completion Button — shown when piloting */}
                {ticket.status === 'piloting' && (
                  <form
                    action={async () => {
                      'use server'
                      const t = cookies().get('token')?.value
                      const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
                      try {
                        const res = await fetch(`${backendUrl}/api/tickets/${ticket.id}/verify`, {
                          method: 'POST',
                          headers: { Authorization: `Bearer ${t}` },
                        })
                        if (res.ok) revalidatePath('/dashboard/government')
                      } catch {}
                    }}
                  >
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-600/20 transition-all border border-emerald-500/30"
                    >
                      <span>✅</span>
                      <span>Verify & Approve Completion</span>
                    </button>
                  </form>
                )}

                {/* Close Ticket */}
                {(ticket.status === 'verified' || ticket.status === 'accepted' || ticket.status === 'in_progress') && (
                  <form
                    action={async () => {
                      'use server'
                      const t = cookies().get('token')?.value
                      const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
                      try {
                        const res = await fetch(`${backendUrl}/api/tickets/${ticket.id}/close`, {
                          method: 'POST',
                          headers: { Authorization: `Bearer ${t}` },
                        })
                        if (res.ok) revalidatePath('/dashboard/government')
                      } catch {}
                    }}
                  >
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-all border border-white/10"
                    >
                      <span>Archive / Close</span>
                    </button>
                  </form>
                )}
              </div>
            }
          />
        ))}

        {tickets.length === 0 && (
          <div className="glass-card rounded-2xl p-12 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-2xl">
              🏙️
            </div>
            <h3 className="text-base font-semibold text-white">No Tickets Found</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              There are currently no civic reports in the queue. New reports submitted by citizens will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
