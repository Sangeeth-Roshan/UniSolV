'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const res = await fetch(`${process.env.BACKEND_URL || 'http://localhost:8000'}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      username: email,
      password: password,
    }),
  })

  if (!res.ok) {
    try {
      const error = await res.json()
      return { error: error.detail || 'Login failed' }
    } catch {
      return { error: `Server error (${res.status}). Is the backend running?` }
    }
  }

  const data = await res.json()
  
  // Set HttpOnly cookie
  cookies().set('token', data.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 1 week
  })

  revalidatePath('/', 'layout')

  // Decode JWT payload without a library (it's safe here since we just trust the backend)
  try {
    const base64Url = data.access_token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    }).join(''))
    const payload = JSON.parse(jsonPayload)
    return { success: true, role: payload.role }
  } catch {
    return { success: true, role: 'citizen' } // default fallback if decoding fails
  }
}

export async function logoutAction() {
  cookies().delete('token')
  revalidatePath('/', 'layout')
  redirect('/login')
}
