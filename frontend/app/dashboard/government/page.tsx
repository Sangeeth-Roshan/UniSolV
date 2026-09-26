import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import GovernmentDashboardClient from './GovernmentDashboardClient'

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface TicketEvent { type: string; notes: string | null; time: string | null }
export interface AssignedInstitution {
  id: number; name: string; type: string
  reputation_score: number; current_load: number; domains_of_expertise: string[]
}
export interface Ticket {
  id: number; title: string; description: string; domain: string | null
  status: string; severity_score: number | null; contact_phone?: string | null
  classification_confidence?: number | null; media_urls?: string[]
  created_at?: string; updated_at?: string
  sla_deadline?: string | null; sla_status?: string; sla_hours_remaining?: number | null
  routing_shortlist?: number[]
  assigned_institution?: AssignedInstitution | null
  events: TicketEvent[]
}

export interface Summary {
  total_tickets: number; open_tickets: number; closed_tickets: number
  escalated_tickets: number; resolution_rate: number; avg_severity: number
  institution_count: number; avg_institution_load: number; avg_institution_reputation: number
  top_domain: string; top_domain_count: number; tickets_with_contact: number
  status_breakdown: Record<string, number>
}

export interface InstitutionWorkload {
  id: number; name: string; type: string; reputation_score: number
  current_load: number; capacity_status: string
  domains_of_expertise: string[]; reputation_by_domain: Record<string, number>
  total_tickets: number; status_counts: Record<string, number>
  resolution_rate: number; sla_breached: number; sla_critical: number; sla_at_risk: number
}

export interface SlaTicket {
  id: number; title: string; domain: string | null; status: string
  severity_score: number | null; sla_deadline: string; sla_hours_remaining: number
  sla_level: string; assigned_institution: string | null; institution_type: string | null
  created_at: string | null
}

export interface SlaRisk {
  breached: SlaTicket[]; critical: SlaTicket[]; at_risk: SlaTicket[]
  safe: SlaTicket[]; summary: Record<string, number>
}

export interface StaleTicket {
  id: number; title: string; domain: string | null; status: string
  severity_score: number | null; hours_stale: number; created_at: string | null
  updated_at: string | null; assigned_institution: string; sla_deadline: string | null
  sla_hours_remaining: number | null
}

// â”€â”€ Data fetchers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const B = () => process.env.BACKEND_URL || 'http://localhost:8000'

async function getToken() { return cookies().get('token')?.value }

async function getTickets(): Promise<Ticket[]> {
  const token = await getToken(); if (!token) return []
  try {
    const res = await fetch(`${B()}/api/tickets`, { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 5 } })
    return res.ok ? res.json() : []
  } catch { return [] }
}

async function getSummary(): Promise<Summary | null> {
  const token = await getToken(); if (!token) return null
  try {
    const res = await fetch(`${B()}/api/analytics/summary`, { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 5 } })
    return res.ok ? res.json() : null
  } catch { return null }
}

async function getInstitutionWorkload(): Promise<InstitutionWorkload[]> {
  const token = await getToken(); if (!token) return []
  try {
    const res = await fetch(`${B()}/api/analytics/institution-workload`, { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 5 } })
    return res.ok ? res.json() : []
  } catch { return [] }
}

async function getSlaRisk(): Promise<SlaRisk | null> {
  const token = await getToken(); if (!token) return null
  try {
    const res = await fetch(`${B()}/api/analytics/sla-risk`, { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 5 } })
    return res.ok ? res.json() : null
  } catch { return null }
}

async function getStaleTickets(): Promise<StaleTicket[]> {
  const token = await getToken(); if (!token) return []
  try {
    const res = await fetch(`${B()}/api/analytics/stale-tickets`, { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 5 } })
    return res.ok ? res.json() : []
  } catch { return [] }
}

// â”€â”€ Server actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function dispatchTicket(ticketId: number) {
  'use server'
  const token = cookies().get('token')?.value
  try {
    const res = await fetch(`${B()}/api/tickets/${ticketId}/dispatch`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }
    })
    if (res.ok) revalidatePath('/dashboard/government')
  } catch {}
}

async function assignTicket(ticketId: number, institutionId: number) {
  'use server'
  const token = cookies().get('token')?.value
  try {
    const res = await fetch(`${B()}/api/tickets/${ticketId}/assign`, {
      method: 'POST', 
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ institution_id: institutionId })
    })
    if (res.ok) revalidatePath('/dashboard/government')
  } catch {}
}

async function closeTicket(ticketId: number) {
  'use server'
  const token = cookies().get('token')?.value
  try {
    const res = await fetch(`${B()}/api/tickets/${ticketId}/close`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }
    })
    if (res.ok) revalidatePath('/dashboard/government')
  } catch {}
}

// â”€â”€ Fallback summary from ticket list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function computeSummaryFallback(tickets: Ticket[]): Summary {
  const total = tickets.length
  const openStatuses = new Set(['pending_validation', 'routed', 'accepted', 'in_progress', 'piloting'])
  const open = tickets.filter(t => openStatuses.has(t.status)).length
  const closed = tickets.filter(t => t.status === 'closed').length
  const escalated = tickets.filter(t => t.status === 'escalated').length
  const withSev = tickets.filter(t => t.severity_score != null)
  const avgSev = withSev.length ? withSev.reduce((a, b) => a + (b.severity_score ?? 0), 0) / withSev.length : 0
  const domainCounts: Record<string, number> = {}
  tickets.forEach(t => { if (t.domain) domainCounts[t.domain] = (domainCounts[t.domain] ?? 0) + 1 })
  const topDomain = Object.entries(domainCounts).sort((a, b) => b[1] - a[1])[0]
  const statusBreakdown: Record<string, number> = {}
  tickets.forEach(t => { statusBreakdown[t.status] = (statusBreakdown[t.status] ?? 0) + 1 })
  return {
    total_tickets: total, open_tickets: open, closed_tickets: closed, escalated_tickets: escalated,
    resolution_rate: total > 0 ? Math.round((closed / total) * 1000) / 10 : 0,
    avg_severity: Math.round(avgSev * 100) / 100,
    institution_count: 0, avg_institution_load: 0, avg_institution_reputation: 0,
    top_domain: topDomain?.[0] ?? 'N/A', top_domain_count: topDomain?.[1] ?? 0,
    tickets_with_contact: tickets.filter(t => t.contact_phone).length,
    status_breakdown: statusBreakdown,
  }
}

// â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default async function GovernmentDashboardPage() {
  const [tickets, summary, workload, slaRisk, stale] = await Promise.all([
    getTickets(), getSummary(), getInstitutionWorkload(), getSlaRisk(), getStaleTickets()
  ])
  const stats = summary ?? computeSummaryFallback(tickets)

  return (
    <GovernmentDashboardClient
      tickets={tickets}
      stats={stats}
      workload={workload}
      slaRisk={slaRisk}
      staleTickets={stale}
      dispatchTicket={dispatchTicket}
      assignTicket={assignTicket}
      closeTicket={closeTicket}
    />
  )
}
