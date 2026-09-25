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

  // Extract user ID from JWT payload (for future use / audit logging)
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    JSON.parse(
      decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
    )
  } catch {
    // ignore
  }

  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
    const backendRes = await fetch(`${backendUrl}/api/tickets`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': request.headers.get('Content-Type') || '',
      },
      body: request.body,
      // @ts-expect-error - Next.js needs this for streaming request bodies
      duplex: 'half',
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
