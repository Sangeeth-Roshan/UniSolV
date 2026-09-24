import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const { pathname } = request.nextUrl
  
  if (!token && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (token) {
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      }).join(''))
      const payload = JSON.parse(jsonPayload)
      const role = payload.role

      // Protect routes by role
      if ((pathname.startsWith('/submit') || pathname.startsWith('/my-tickets')) && role !== 'citizen') {
        const dest = ['university_admin', 'student', 'company'].includes(role)
          ? '/dashboard/institution'
          : role === 'government_officer'
          ? '/dashboard/government'
          : '/'
        return NextResponse.redirect(new URL(dest, request.url))
      }

      if (pathname.startsWith('/dashboard/institution') && !['university_admin', 'student', 'company'].includes(role)) {
         return NextResponse.redirect(new URL('/', request.url))
      }

      if (pathname.startsWith('/dashboard/government') && role !== 'government_officer') {
         return NextResponse.redirect(new URL('/', request.url))
      }
      
      // Redirect logged-in users away from /login
      if (pathname === '/login') {
         if (role === 'citizen') return NextResponse.redirect(new URL('/submit', request.url))
         if (['university_admin', 'student', 'company'].includes(role)) return NextResponse.redirect(new URL('/dashboard/institution', request.url))
         if (role === 'government_officer') return NextResponse.redirect(new URL('/dashboard/government', request.url))
      }

    } catch (e) {
      // Invalid token
      request.cookies.delete('token')
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/submit',
    '/my-tickets',
    '/dashboard/:path*',
    '/login'
  ]
}
