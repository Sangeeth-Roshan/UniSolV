import { cookies } from 'next/headers'
import Link from 'next/link'
import { RateTicket } from './RateTicket'
import { TicketCard, TicketData } from '@/components/TicketCard'

async function getTickets(): Promise<TicketData[]> {
  const token = cookies().get('token')?.value
  if (!token) return []
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
  try {
    const res = await fetch(`${backendUrl}/api/tickets`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 5 }
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
    <div className="max-w-5xl mx-auto space-y-6 relative z-10 pb-12">
      {/* Background Ashoka Chakra Watermark */}
      <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center opacity-[0.03]">
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/1/17/Ashoka_Chakra.svg"
          alt="Ashoka Chakra"
          className="w-[700px] h-[700px]"
        />
      </div>

      {/* Page Header with Indian Flag Theme & Liquid Glass */}
      <div className="bg-white/70 backdrop-blur-2xl border border-white/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-orange-600">
              Citizen Redressal Tracker
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Civic Tickets
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Monitor real-time progress, assigned institutions, and verified resolutions across Jharkhand.
          </p>
        </div>

        {total > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 font-semibold shadow-sm">
              <span className="font-bold text-orange-950">{total}</span>
              <span>Total Reported</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 font-semibold shadow-sm">
              <span className="font-bold text-blue-950">{openCount}</span>
              <span>In Progress</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-xl bg-green-50 border border-green-300 text-green-800 font-semibold shadow-sm">
              <span className="font-bold text-green-950">{resolvedCount}</span>
              <span>Resolved</span>
            </span>
          </div>
        )}
      </div>

      {/* Tickets List */}
      <div className="space-y-5 relative z-10">
        {tickets.map((ticket) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            viewMode="citizen"
            actionsSlot={
              (ticket.status === 'verified' || ticket.status === 'closed') ? (
                <div className="bg-white/60 backdrop-blur-xl rounded-xl p-3 border border-orange-200/60 mt-2">
                  <RateTicket ticketId={ticket.id} />
                </div>
              ) : null
            }
          />
        ))}

        {/* Empty State */}
        {tickets.length === 0 && (
          <div className="bg-white/70 backdrop-blur-2xl border border-white/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 shadow-sm">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">No Civic Issues Reported Yet</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md mx-auto leading-relaxed">
                Notice an issue in your locality like broken roads, drinking water shortage, or power failure?
                Submit a report to notify the Government of Jharkhand and nearby technical institutions.
              </p>
            </div>
            <Link
              href="/submit"
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-orange-600/30 transition-all hover:scale-105"
            >
              <span>Report an Issue</span>
              <span>→</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}