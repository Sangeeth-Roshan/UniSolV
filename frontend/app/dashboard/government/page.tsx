import { cookies } from 'next/headers'

async function getTickets() {
  const token = cookies().get('token')?.value
  if (!token) return []
  const res = await fetch('http://localhost:8000/api/tickets', {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  })
  if (!res.ok) return []
  return res.json()
}

export default async function GovernmentDashboardPage() {
  const tickets = await getTickets()

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title text-2xl font-bold">Government Dashboard</h1>
      </div>
      
      <div className="flex flex-col gap-4">
        {tickets.map((ticket: any) => (
          <div key={ticket.id} className="p-4 bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{ticket.title}</h3>
                <p className="text-sm text-slate-600">{ticket.description}</p>
                <div className="mt-2 text-xs font-mono text-slate-400">Domain: {ticket.domain}</div>
              </div>
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">{ticket.status}</span>
            </div>

            {/* Actions for Government */}
            <div className="flex gap-2 mt-4">
               <form action={async () => {
                  'use server'
                  const t = cookies().get('token')?.value
                  await fetch(`http://localhost:8000/api/tickets/${ticket.id}/dispatch`, { method: 'POST', headers: { Authorization: `Bearer ${t}` }})
               }}>
                 <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Dispatch / Route</button>
               </form>
               <form action={async () => {
                  'use server'
                  const t = cookies().get('token')?.value
                  await fetch(`http://localhost:8000/api/tickets/${ticket.id}/close`, { method: 'POST', headers: { Authorization: `Bearer ${t}` }})
               }}>
                 <button className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700">Close Ticket</button>
               </form>
            </div>

            {/* Timeline */}
            <div className="mt-6 border-t pt-4">
              <h4 className="text-sm font-semibold mb-2">History</h4>
              <ul className="text-xs text-slate-500 flex flex-col gap-1">
                {ticket.events.map((event: any, i: number) => (
                  <li key={i}>
                    <span className="font-bold">{event.type}</span> at {new Date(event.time).toLocaleString()}: {event.notes}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
        {tickets.length === 0 && <div className="text-slate-500">No tickets found.</div>}
      </div>
    </div>
  )
}
