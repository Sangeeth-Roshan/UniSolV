import { cookies } from 'next/headers'
import { RateTicket } from './RateTicket'

interface TicketEvent { type: string; notes: string | null; time: string }
interface Ticket {
  id: number; title: string; description: string; domain: string | null;
  status: string; severity_score: number | null; events: TicketEvent[]; contact_phone?: string | null;
  proof_media_urls: string[]; completion_notes: string | null;
  assigned_institution_id: number | null;
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    pending_validation: 'bg-amber-100 text-amber-800 border border-amber-300',
    routed:             'bg-blue-100 text-blue-800 border border-blue-300',
    accepted:           'bg-violet-100 text-violet-800 border border-violet-300',
    in_progress:        'bg-cyan-100 text-cyan-800 border border-cyan-300',
    piloting:           'bg-teal-100 text-teal-800 border border-teal-300',
    verified:           'bg-green-100 text-green-800 border border-green-300',
    closed:             'bg-slate-100 text-slate-800 border border-slate-300',
    escalated:          'bg-red-100 text-red-800 border border-red-300',
  }
  return styles[status] ?? 'bg-slate-100 text-slate-800 border border-slate-300'
}

function statusMessage(status: string): string {
  const messages: Record<string, string> = {
    pending_validation: '? Your ticket is pending review by the government.',
    routed: '?? Your ticket has been assigned to an institution.',
    accepted: '?? The institution has accepted your ticket and will begin work soon.',
    in_progress: '?? Work is currently in progress on your issue.',
    piloting: '?? The institution has submitted their solution — awaiting government verification.',
    verified: '? The resolution has been verified! Please rate your experience.',
    closed: '?? Your issue has been resolved and closed.',
    escalated: '?? This ticket was escalated due to an SLA breach.',
  }
  return messages[status] ?? ''
}

async function getTickets() {
  const token = cookies().get('token')?.value
  if (!token) return []
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
  try {
    const res = await fetch(`${backendUrl}/api/tickets`, {
      headers: { Authorization: "Bearer " + token },
      cache: 'no-store'
    })
    if (!res.ok) return []
    return res.json()
  } catch { return [] }
}

export default async function MyTicketsPage() {
  const tickets = await getTickets()

  return (
    <div className="max-w-4xl mx-auto pb-12 px-4 relative z-10">
<div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center opacity-[0.03]">
  <img src="https://upload.wikimedia.org/wikipedia/commons/1/17/Ashoka_Chakra.svg" alt="Ashoka Chakra" className="w-[800px] h-[800px]" />
</div>
      <div className="mb-8 border-b border-orange-200 pb-6 pt-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">My Tickets</h1>
        <p className="text-slate-600">Track the status of civic issues you've reported to the Government of Jharkhand.</p>
      </div>

      <div className="flex flex-col gap-6">
        {(tickets as Ticket[]).map((ticket) => (
          <div key={ticket.id} className="bg-white/60 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/80 p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-slate-900 truncate">{ticket.title}</h3>
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">#{ticket.id}</span>
                </div>
                <p className="text-sm text-slate-700 mt-2 line-clamp-2">{ticket.description}</p>
                <div className="mt-4 flex items-center gap-3 flex-wrap">
                  {ticket.domain && (
                    <span className="text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-md">
                      {ticket.domain}
                    </span>
                  )}
                  {ticket.severity_score != null && (
                    <span className="text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
                      Severity: <span className="text-slate-900">{Number(ticket.severity_score).toFixed(2)}</span>
                    </span>
                  )}
                </div>
              </div>
              <span className={"shrink-0 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider " + statusBadge(ticket.status)}>
                {ticket.status.replace(/_/g, ' ')}
              </span>
            </div>

            {statusMessage(ticket.status) && (
              <div className="mt-4 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                {statusMessage(ticket.status)}
              </div>
            )}

            {ticket.completion_notes && (
              <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200">
                <p className="text-xs font-bold uppercase tracking-wider text-green-800 mb-2">?? Resolution Summary</p>
                <p className="text-sm text-slate-800">{ticket.completion_notes}</p>
              </div>
            )}
            {ticket.proof_media_urls && ticket.proof_media_urls.length > 0 && (
              <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">?? Proof of Completion</p>
                <div className="flex flex-wrap gap-3">
                  {ticket.proof_media_urls.map((url, i) => (
                    <a key={i} href={"http://localhost:8000/" + url} target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-md hover:bg-blue-100 transition-colors">
                      ?? View Proof {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {(ticket.status === 'verified' || ticket.status === 'closed') && (
              <div className="mt-6 border-t border-slate-100 pt-4">
                <RateTicket ticketId={ticket.id} />
              </div>
            )}

            {ticket.events?.length > 0 && (
              <div className="mt-6 bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">Timeline</h4>
                <ul className="text-xs text-slate-600 flex flex-col gap-3">
                  {ticket.events.map((event: TicketEvent, i: number) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-orange-500 mt-1 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-900">{String(event.type).replace(/_/g, ' ')}</div>
                        <div className="text-slate-500 mt-0.5">{new Date(event.time).toLocaleString()}</div>
                        {event.notes && <div className="text-slate-700 mt-1 italic">{event.notes}</div>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
        {tickets.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-600">
            <div className="text-4xl mb-4">??</div>
            <p className="text-lg font-medium text-slate-900 mb-2">No tickets found</p>
            <p className="mb-6">You haven't submitted any civic issues yet.</p>
            <a href="/submit" className="inline-block bg-orange-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-orange-700 transition-colors">
              Report your first issue
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
