import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/proxy/tickets
 *
 * Proxies a multipart form submission to the backend POST /api/tickets.
 * This is needed because the auth token is stored as an HttpOnly cookie —
 * client-side `fetch` cannot read it, so it must be forwarded from a
 * Next.js server route.
 */
export async function POST(request: NextRequest) {
  const token = cookies().get('token')?.value

  if (!token) {
    return NextResponse.json(
      { detail: 'Not authenticated. Please log in.' },
      { status: 401 }
    )
  }

  // Forward the multipart form data as-is to the backend
  const formData = await request.formData()

  const backendRes = await fetch('http://localhost:8000/api/tickets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      // Do NOT set Content-Type here — the browser will set it automatically
      // with the correct multipart boundary when we pass a FormData body.
    },
    body: formData,
  })

  const body = await backendRes.json().catch(() => ({ detail: 'Unknown error' }))

  return NextResponse.json(body, { status: backendRes.status })
}
