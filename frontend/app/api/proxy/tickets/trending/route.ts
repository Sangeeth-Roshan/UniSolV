import { NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000'

/** GET /api/proxy/tickets/trending — public, no auth needed */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = searchParams.get('limit') ?? '10'

  try {
    const res = await fetch(`${BACKEND}/api/tickets/trending?limit=${limit}`, {
      cache: 'no-store',
    })
    if (!res.ok) return NextResponse.json([], { status: res.status })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}
