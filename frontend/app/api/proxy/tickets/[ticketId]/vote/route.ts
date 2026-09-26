import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000'

interface Params {
  params: { ticketId: string }
}

/** POST /api/proxy/tickets/[ticketId]/vote  — vote up or down */
export async function POST(request: Request, { params }: Params) {
  const token = cookies().get('token')?.value
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json()
  const res = await fetch(`${BACKEND}/api/tickets/${params.ticketId}/vote`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

/** DELETE /api/proxy/tickets/[ticketId]/vote  — remove vote */
export async function DELETE(_request: Request, { params }: Params) {
  const token = cookies().get('token')?.value
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const res = await fetch(`${BACKEND}/api/tickets/${params.ticketId}/vote`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
