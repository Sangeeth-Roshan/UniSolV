import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const token = cookies().get('token')?.value

  if (!token) {
    return NextResponse.json({
      isAuthenticated: false,
      role: 'citizen',
      userEmail: null,
      userInitial: 'U',
    })
  }

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

    let role = 'citizen'
    const backendRole: string = payload.role ?? 'citizen'
    if (['university_admin', 'student', 'company'].includes(backendRole)) {
      role = 'institution'
    } else if (backendRole === 'government_officer') {
      role = 'government'
    } else {
      role = 'citizen'
    }

    const userEmail = payload.sub || ''
    const userInitial = userEmail ? userEmail[0].toUpperCase() : 'U'

    return NextResponse.json({
      isAuthenticated: true,
      role,
      userEmail,
      userInitial,
    })
  } catch {
    return NextResponse.json({
      isAuthenticated: false,
      role: 'citizen',
      userEmail: null,
      userInitial: 'U',
    })
  }
}
