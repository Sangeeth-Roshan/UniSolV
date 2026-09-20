import { cookies } from 'next/headers'
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
  const BASE = 'http://localhost:8000/api/analytics'

  try {
    const [domRes, funRes, leadRes, hotRes, trendRes] = await Promise.all([
      fetch(`${BASE}/domains`,     { headers, cache: 'no-store' }),
      fetch(`${BASE}/funnel`,      { headers, cache: 'no-store' }),
      fetch(`${BASE}/leaderboard`, { headers, cache: 'no-store' }),
      fetch(`${BASE}/hotspots`,    { headers, cache: 'no-store' }),
      fetch(`${BASE}/trends`,      { headers, cache: 'no-store' }),
    ])

    return {
      domains:     domRes.ok   ? await domRes.json()   : [],
      funnel:      funRes.ok   ? await funRes.json()   : [],
      leaderboard: leadRes.ok  ? await leadRes.json()  : [],
      hotspots:    hotRes.ok   ? await hotRes.json()   : [],
      trends:      trendRes.ok ? await trendRes.json() : [],
    }
  } catch {
    return null
  }
}

export default async function AnalyticsPage() {
  const data = await fetchAnalytics()

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">Platform Analytics</h1>
        <p className="page-subtitle">Monitor civic issues, institutional performance, and hotspot activity.</p>
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
        />
      )}
    </div>
  )
}
