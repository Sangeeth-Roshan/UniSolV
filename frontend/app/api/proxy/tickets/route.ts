import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/proxy/tickets
 *
 * Proxies a multipart form submission to the backend POST /api/tickets.
 * Forwards the HttpOnly authentication cookie as an Authorization header
 * and ensures reporter_id is populated from the user's JWT payload.
 */
export async function POST(request: NextRequest) {
  const token = cookies().get('token')?.value

  if (!token) {
    return NextResponse.json(
      { detail: 'You must be signed in to submit a ticket. Please log in.' },
      { status: 401 }
    )
  }

  // Extract user ID from JWT payload
  let userId: number | undefined
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
    userId = payload.id
  } catch {
    // ignore
  }

  // Forward the multipart form data to the backend
  const formData = await request.formData()

  if (!formData.has('reporter_id') && userId) {
    formData.set('reporter_id', String(userId))
  }

  try {
    const backendRes = await fetch('http://localhost:8000/api/tickets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })

    const body = await backendRes.json().catch(() => ({
      detail: backendRes.statusText || 'Unexpected error from backend',
    }))

    return NextResponse.json(body, { status: backendRes.status })
  } catch (err) {
    return NextResponse.json(
      { detail: `Failed to connect to backend service: ${String(err)}` },
      { status: 502 }
    )
  }
}
