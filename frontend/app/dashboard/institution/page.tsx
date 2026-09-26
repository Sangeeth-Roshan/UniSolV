import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { TicketData } from '@/components/TicketCard'
import InstitutionDashboardClient from './InstitutionDashboardClient'

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

  // ── Server Actions for Ticket State Transitions ──
  async function acceptTicketAction(ticketId: number) {
    'use server'
    const t = cookies().get('token')?.value
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
    try {
      const res = await fetch(`${backendUrl}/api/tickets/${ticketId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}` },
      })
      if (res.ok) revalidatePath('/dashboard/institution')
    } catch {}
  }

  async function startTicketAction(ticketId: number) {
    'use server'
    const t = cookies().get('token')?.value
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
    try {
      const res = await fetch(`${backendUrl}/api/tickets/${ticketId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}` },
      })
      if (res.ok) revalidatePath('/dashboard/institution')
    } catch {}
  }

  async function completeTicketAction(ticketId: number, formData: FormData) {
    'use server'
    const t = cookies().get('token')?.value
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
    try {
      const res = await fetch(`${backendUrl}/api/tickets/${ticketId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}` },
        body: formData,
      })
      if (res.ok) revalidatePath('/dashboard/institution')
    } catch {}
  }

  return (
    <InstitutionDashboardClient
      initialTickets={tickets}
      acceptTicket={acceptTicketAction}
      startTicket={startTicketAction}
      completeTicket={completeTicketAction}
    />
  )
}
