import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

/** Proxy: forward form-data login request to the backend */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      body: formData,
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    return NextResponse.json({ detail: String(err) }, { status: 502 })
  }
}
