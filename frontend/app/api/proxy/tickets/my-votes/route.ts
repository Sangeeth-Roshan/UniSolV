import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000'

/** GET /api/proxy/tickets/my-votes — returns { [ticketId]: 'up' | 'down' } for logged-in user */
export async function GET() {
  const token = cookies().get('token')?.value
  if (!token) {
    return NextResponse.json({})
  }

  try {
    const res = await fetch(`${BACKEND}/api/tickets/my-votes`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return NextResponse.json({})
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({})
  }
}
