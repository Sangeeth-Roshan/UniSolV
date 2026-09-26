import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

interface TicketEvent { type: string; notes: string | null; time: string }
interface Ticket {
  id: number; title: string; description: string; domain: string | null;
  status: string; severity_score: number | null; events: TicketEvent[]; contact_phone?: string | null;
  assigned_institution_id: number | null;
  proof_media_urls: string[]; completion_notes: string | null;
}

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
  } catch { return [] }
}

export default async function InstitutionDashboardPage() {
  const tickets = await getTickets()

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">Institution Dashboard</h1>
        <p className="page-subtitle">Tickets assigned to your institution — accept, work on, upload proof, and credit your team.</p>
      </div>

      <div className="flex flex-col gap-4">
        {(tickets as Ticket[]).map((ticket) => (
          <div key={ticket.id} className="glass-card p-5">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-base text-white truncate">{ticket.title}</h3>
                  <span className="text-xs text-slate-600">#{ticket.id}</span>
                </div>
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

            {/* Show uploaded proof */}
            {ticket.proof_media_urls && ticket.proof_media_urls.length > 0 && (
              <div className="mt-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <p className="text-xs font-bold text-emerald-400 mb-1">✅ Proof Uploaded ({ticket.proof_media_urls.length} file{ticket.proof_media_urls.length !== 1 ? 's' : ''})</p>
                {ticket.completion_notes && <p className="text-xs text-slate-400 mt-1">{ticket.completion_notes}</p>}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 mt-4">
              <div className="flex gap-2 flex-wrap">
                {/* Accept — only when routed */}
                {ticket.status === 'routed' && (
                  <form action={async () => {
                    'use server'
                    const t = cookies().get('token')?.value
                    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
                    try {
                      const res = await fetch(`${backendUrl}/api/tickets/${ticket.id}/accept`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${t}` }
                      })
                      if (res.ok) revalidatePath('/dashboard/institution')
                    } catch {}
                  }}>
                    <button className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600/80 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-all border border-emerald-500/40 shadow-sm shadow-emerald-500/20">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      Accept Ticket
                    </button>
                  </form>
                )}

                {/* Start Work — when accepted */}
                {ticket.status === 'accepted' && (
                  <form action={async () => {
                    'use server'
                    const t = cookies().get('token')?.value
                    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
                    try {
                      const res = await fetch(`${backendUrl}/api/tickets/${ticket.id}/start`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${t}` }
                      })
                      if (res.ok) revalidatePath('/dashboard/institution')
                    } catch {}
                  }}>
                    <button className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-600/80 text-white text-sm font-semibold rounded-xl hover:bg-cyan-600 transition-all border border-cyan-500/40 shadow-sm shadow-cyan-500/20">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Start Work
                    </button>
                  </form>
                )}
              </div>

              {/* Upload Proof Form — shown when in_progress or accepted */}
              {(ticket.status === 'in_progress' || ticket.status === 'accepted') && (
                <form action={async (formData: FormData) => {
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
                }} className="border border-teal-500/20 rounded-xl p-4 bg-teal-500/5 space-y-3">
                  <h4 className="text-sm font-bold text-teal-300">📋 Submit Completion Report</h4>
                  <textarea
                    name="completion_notes"
                    placeholder="Describe what was done to resolve this issue..."
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500/50 resize-none h-24"
                  />
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Worker Names (comma-separated)</label>
                      <input
                        name="worker_names"
                        placeholder="e.g. Rahul Kumar, Priya Singh"
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-slate-300 placeholder-slate-600 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Roles (comma-separated)</label>
                      <input
                        name="worker_roles"
                        placeholder="e.g. Engineer, Field Technician"
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-slate-300 placeholder-slate-600 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Proof Photo / Document (optional)</label>
                    <input
                      type="file"
                      name="proof"
                      accept="image/*,application/pdf"
                      className="w-full text-sm text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-teal-500/10 file:text-teal-300 file:font-semibold hover:file:bg-teal-500/20 cursor-pointer"
                    />
                  </div>
                  <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600/80 text-white text-sm font-semibold rounded-xl hover:bg-teal-600 transition-all border border-teal-500/40">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Submit Completion Report
                  </button>
                </form>
              )}

              {ticket.status === 'piloting' && (
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-sm text-amber-300">
                  ⏳ Completion report submitted — awaiting government verification.
                </div>
              )}

              {ticket.status === 'verified' && (
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-sm text-emerald-300">
                  ✅ Work verified by government. Ticket will be closed shortly.
                </div>
              )}
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
            No tickets assigned to your institution yet.
          </div>
        )}
      </div>
    </div>
  )
}
