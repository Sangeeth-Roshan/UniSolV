import { cookies } from 'next/headers'
import Link from 'next/link'
import AnalyticsDashboard from './AnalyticsDashboard'

/**
 * Fetches all analytics data server-side so the HttpOnly auth cookie is
 * automatically included. The data is passed as props to the client
 * AnalyticsDashboard component, which handles rendering.
 */
async function fetchAnalytics() {
  const token = cookies().get('token')?.value
  if (!token) return null

  const headers = { Authorization: `Bearer ${token}` }
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
  const BASE = `${backendUrl}/api/analytics`

  try {
    const [domRes, funRes, leadRes, hotRes, trendRes, sumRes, locRes] = await Promise.all([
      fetch(`${BASE}/domains`,     { headers, cache: 'no-store' }),
      fetch(`${BASE}/funnel`,      { headers, cache: 'no-store' }),
      fetch(`${BASE}/leaderboard`, { headers, cache: 'no-store' }),
      fetch(`${BASE}/hotspots`,    { headers, cache: 'no-store' }),
      fetch(`${BASE}/trends`,      { headers, cache: 'no-store' }),
      fetch(`${BASE}/summary`,     { headers, cache: 'no-store' }),
      fetch(`${BASE}/ticket-locations`, { headers, cache: 'no-store' }),
    ])

    return {
      domains:     domRes.ok   ? await domRes.json()   : [],
      funnel:      funRes.ok   ? await funRes.json()   : [],
      leaderboard: leadRes.ok  ? await leadRes.json()  : [],
      hotspots:    hotRes.ok   ? await hotRes.json()   : [],
      trends:      trendRes.ok ? await trendRes.json() : [],
      summary:     sumRes.ok   ? await sumRes.json()   : null,
      ticketLocations: locRes.ok ? await locRes.json() : [],
    }
  } catch {
    return null
  }
}

export default async function AnalyticsPage() {
  const data = await fetchAnalytics()

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
        <div>
          <h1 className="page-title">Platform Analytics</h1>
          <p className="page-subtitle mt-1">Monitor civic issues, institutional performance, and hotspot activity.</p>
        </div>
        <Link
          href="/dashboard/government"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-slate-300 text-sm font-semibold hover:bg-slate-700 transition-all self-start sm:self-auto"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Overview
        </Link>
      </div>

      {!data ? (
        <div className="glass-card p-8 text-center text-slate-500">
          Could not load analytics. Please ensure you are logged in as a Government Officer.
        </div>
      ) : (
        <AnalyticsDashboard
          domains={data.domains}
          funnel={data.funnel}
          leaderboard={data.leaderboard}
          hotspots={data.hotspots}
          trends={data.trends}
          summary={data.summary}
          ticketLocations={data.ticketLocations}
        />
      )}
    </div>
  )
}
