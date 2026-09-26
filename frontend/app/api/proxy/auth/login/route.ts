import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:8000').trim()

/** Proxy: forward form-data login request to the backend and set session cookie */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      body: formData,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status })
    }

    if (data.access_token) {
      cookies().set('token', data.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 1 week
      })
    }

    // Decode role from token payload
    let role = 'citizen'
    try {
      const base64Url = data.access_token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      const payload = JSON.parse(jsonPayload)
      role = payload.role || 'citizen'
    } catch {
      // fallback
    }

    return NextResponse.json({ success: true, role, ...data }, { status: 200 })
  } catch (err) {
    return NextResponse.json({ detail: String(err) }, { status: 502 })
  }
}
