import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest, { params }: { params: { ticketId: string } }) {
  const token = cookies().get('token')?.value
  if (!token) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'

  try {
    const res = await fetch(`${backendUrl}/api/tickets/${params.ticketId}/rate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    return NextResponse.json({ detail: `Backend error: ${String(err)}` }, { status: 502 })
  }
}
