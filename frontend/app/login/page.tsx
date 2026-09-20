'use client'

import { useState } from 'react'
import { loginAction } from '@/app/actions/auth'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await loginAction(formData)
    
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else if (result?.success) {
      if (result.role === 'citizen') router.push('/submit')
      else if (result.role === 'government_officer') router.push('/dashboard/government')
      else router.push('/dashboard/institution')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
      <form action={handleSubmit} className="w-full max-w-sm p-6 bg-white rounded-xl shadow-md flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Login to UniSOLV</h1>
        {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Email</label>
          <input name="email" type="email" required className="border p-2 rounded-md" placeholder="you@example.com" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Password</label>
          <input name="password" type="password" required className="border p-2 rounded-md" placeholder="••••••••" />
        </div>
        <button type="submit" disabled={loading} className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  )
}
