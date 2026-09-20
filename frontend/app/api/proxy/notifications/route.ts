import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

interface BackendTicketEvent {
  type: string
  notes: string | null
  time: string
}

interface BackendTicket {
  id: number
  title: string
  description: string
  domain: string | null
  status: string
  severity_score: number | null
  events: BackendTicketEvent[]
}

export interface FormattedNotification {
  id: string
  ticketId: number
  ticketTitle: string
  eventType: string
  title: string
  notes: string
  time: string
  domain: string | null
  status: string
  href: string
}

function getEventTitle(type: string, ticketId: number): string {
  switch (type) {
    case 'escalated':
      return `⚠️ Ticket #${ticketId} Escalated (SLA Breach)`
    case 'routed':
      return `🚀 Ticket #${ticketId} Dispatched`
    case 'accepted':
      return `🤝 Ticket #${ticketId} Accepted by Institution`
    case 'proposal_submitted':
      return `📄 Proposal Submitted for Ticket #${ticketId}`
    case 'closed':
      return `✅ Ticket #${ticketId} Resolved & Closed`
    case 'hotspot_detected':
      return `🔥 Hotspot Cluster Detected (Ticket #${ticketId})`
    case 'cluster_merged':
      return `🔗 Ticket #${ticketId} Grouped into Cluster`
    case 'piloted':
      return `🧪 Pilot Initiated for Ticket #${ticketId}`
    case 'verified':
      return `🔍 Resolution Verified for Ticket #${ticketId}`
    default:
      return `📢 Ticket #${ticketId} Status: ${type.replace(/_/g, ' ')}`
  }
}

export async function GET() {
  const token = cookies().get('token')?.value

  if (!token) {
    return NextResponse.json({
      isAuthenticated: false,
      notifications: [],
      count: 0,
    })
  }

  // Decode role for proper target links
  let userRole = 'citizen'
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(
      decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
    )
    userRole = payload.role || 'citizen'
  } catch {
    // default
  }

  const targetHref =
    userRole === 'government_officer'
      ? '/dashboard/government'
      : ['university_admin', 'student', 'company'].includes(userRole)
      ? '/dashboard/institution'
      : '/my-tickets'

  try {
    const res = await fetch('http://localhost:8000/api/tickets', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({
        isAuthenticated: true,
        notifications: [],
        count: 0,
      })
    }

    const tickets: BackendTicket[] = await res.json()
    const notifications: FormattedNotification[] = []

    for (const ticket of tickets) {
      if (!ticket.events || !Array.isArray(ticket.events)) continue

      for (let i = 0; i < ticket.events.length; i++) {
        const ev = ticket.events[i]
        notifications.push({
          id: `${ticket.id}-${i}-${ev.time}-${ev.type}`,
          ticketId: ticket.id,
          ticketTitle: ticket.title,
          eventType: ev.type,
          title: getEventTitle(ev.type, ticket.id),
          notes: ev.notes || `Status transition: ${ev.type.replace(/_/g, ' ')}`,
          time: ev.time,
          domain: ticket.domain,
          status: ticket.status,
          href: targetHref,
        })
      }
    }

    // Sort descending by time (most recent first)
    notifications.sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
    )

    return NextResponse.json({
      isAuthenticated: true,
      notifications: notifications.slice(0, 30),
      count: notifications.length,
    })
  } catch (error) {
    return NextResponse.json({
      isAuthenticated: true,
      notifications: [],
      count: 0,
      error: String(error),
    })
  }
}
