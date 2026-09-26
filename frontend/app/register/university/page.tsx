'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function UniversityRegisterRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/register?type=institution')
  }, [router])

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-white/70 backdrop-blur-xl p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
        <p className="text-sm font-semibold text-slate-700">Redirecting to Institution Registration...</p>
      </div>
    </div>
  )
}