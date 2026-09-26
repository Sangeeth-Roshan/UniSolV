import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
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

export default async function InstitutionDashboardPage() {
  const tickets = await getTickets()

  const actionQueue = tickets.filter((t) => ['routed', 'accepted', 'in_progress'].includes(t.status))
  const underVerification = tickets.filter((t) => t.status === 'piloting')
  const completed = tickets.filter((t) => ['verified', 'closed'].includes(t.status))

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Institution Workspace</h1>
          <p className="page-subtitle">
            Manage assigned civic challenges, organize field personnel, and submit verified completion reports.
          </p>
        </div>

        {tickets.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-300 font-medium">
              <span className="font-bold">{actionQueue.length}</span> Active Tasks
            </span>
            <span className="text-xs px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/25 text-teal-300 font-medium">
              <span className="font-bold">{underVerification.length}</span> Under Review
            </span>
            <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-medium">
              <span className="font-bold">{completed.length}</span> Completed
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
            viewMode="institution"
            actionsSlot={
              <div className="space-y-3">
                {/* Accept Button — when routed */}
                {ticket.status === 'routed' && (
                  <form
                    action={async () => {
                      'use server'
                      const t = cookies().get('token')?.value
                      const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
                      try {
                        const res = await fetch(`${backendUrl}/api/tickets/${ticket.id}/accept`, {
                          method: 'POST',
                          headers: { Authorization: `Bearer ${t}` },
                        })
                        if (res.ok) revalidatePath('/dashboard/institution')
                      } catch {}
                    }}
                  >
                    <button className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-600/20 transition-all border border-emerald-500/30">
                      <span>🤝</span>
                      <span>Accept Ticket Assignment</span>
                    </button>
                  </form>
                )}

                {/* Start Work — when accepted */}
                {ticket.status === 'accepted' && (
                  <form
                    action={async () => {
                      'use server'
                      const t = cookies().get('token')?.value
                      const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
                      try {
                        const res = await fetch(`${backendUrl}/api/tickets/${ticket.id}/start`, {
                          method: 'POST',
                          headers: { Authorization: `Bearer ${t}` },
                        })
                        if (res.ok) revalidatePath('/dashboard/institution')
                      } catch {}
                    }}
                  >
                    <button className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600/90 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-cyan-600/20 transition-all border border-cyan-500/30">
                      <span>🚀</span>
                      <span>Begin Field Work</span>
                    </button>
                  </form>
                )}

                {/* Completion Report Form — in progress or accepted */}
                {(ticket.status === 'in_progress' || ticket.status === 'accepted') && (
                  <form
                    action={async (formData: FormData) => {
                      'use server'
                      const t = cookies().get('token')?.value
                      const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
                      try {
                        const res = await fetch(`${backendUrl}/api/tickets/${ticket.id}/complete`, {
                          method: 'POST',
                          headers: { Authorization: `Bearer ${t}` },
                          body: formData,
                        })
                        if (res.ok) revalidatePath('/dashboard/institution')
                      } catch {}
                    }}
                    className="border border-teal-500/20 rounded-xl p-4 bg-teal-500/5 space-y-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-teal-300 flex items-center gap-2">
                        <span>📋</span>
                        <span>Submit Work Completion & Team Credits</span>
                      </h4>
                      <span className="text-[10px] text-teal-400 font-medium">Awaiting Submission</span>
                    </div>

                    <textarea
                      name="completion_notes"
                      required
                      placeholder="Describe what specific remediation or solution was implemented (e.g. pipe replaced, drainage cleared, light fixture repaired)..."
                      className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500/50 resize-none h-20 leading-relaxed"
                    />

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                          👷 Team Personnel Names <span className="text-slate-500">(comma-separated)</span>
                        </label>
                        <input
                          name="worker_names"
                          placeholder="e.g. Dr. Ananya Sharma, Rohit Verma"
                          className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500/50"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                          🏷️ Professional Roles <span className="text-slate-500">(comma-separated)</span>
                        </label>
                        <input
                          name="worker_roles"
                          placeholder="e.g. Lead Engineer, Student Researcher"
                          className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500/50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        📸 Proof Photo or Inspection Certificate <span className="text-slate-500">(optional)</span>
                      </label>
                      <input
                        type="file"
                        name="proof"
                        accept="image/*,application/pdf"
                        className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-teal-500/10 file:text-teal-300 file:font-semibold hover:file:bg-teal-500/20 cursor-pointer"
                      />
                    </div>

                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600/90 hover:bg-teal-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-teal-600/20 transition-all border border-teal-500/30"
                    >
                      <span>📤</span>
                      <span>Submit Completion Report</span>
                    </button>
                  </form>
                )}
              </div>
            }
          />
        ))}

        {tickets.length === 0 && (
          <div className="glass-card rounded-2xl p-12 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-2xl">
              🏛️
            </div>
            <h3 className="text-base font-semibold text-white">No Tickets Assigned Yet</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              When the municipal administration routes civic challenges to your institution based on domain expertise,
              they will appear here for your team to accept.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
