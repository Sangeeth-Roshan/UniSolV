'use client'

import { useState } from 'react'
import Link from 'next/link'
import { loginAction } from '@/app/actions/auth'

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<'citizen' | 'institution' | 'government' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await loginAction(formData)
    
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else if (result?.success) {
      let target = '/submit'
      if (result.role === 'citizen') target = '/submit'
      else if (result.role === 'government_officer') target = '/dashboard/government'
      else target = '/dashboard/institution'
      window.location.href = target
    }
  }

  return (
    <div className="min-h-screen flex text-slate-800 font-sans">
      {/* Left Side - Visual / Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-50 items-center justify-center overflow-hidden">
        {/* Abstract Background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-100 via-white to-green-50"></div>
        <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-orange-200/40 to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-full h-1/3 bg-gradient-to-t from-green-200/40 to-transparent"></div>

        <div className="relative z-10 px-12 max-w-lg text-center backdrop-blur-sm bg-white/40 p-10 rounded-3xl border border-white/60 shadow-xl">
          <div className="mx-auto inline-flex items-center justify-center w-20 h-20 rounded-full bg-white border-2 border-[#138808] mb-8 shadow-md">
            <img src="https://upload.wikimedia.org/wikipedia/commons/f/f0/Seal_of_Jharkhand.svg" alt="Jharkhand Emblem" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4 uppercase">
            Govt. of Jharkhand
          </h1>
          <h2 className="text-2xl font-bold text-orange-700 mb-6">
            UniSOLV Portal
          </h2>
          <p className="text-lg text-slate-700 font-medium leading-relaxed">
            Official platform for civic issue redressal. Report, track, and resolve community issues seamlessly.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col justify-center bg-white px-6 py-12 sm:px-12 lg:px-24">
        <div className="mx-auto w-full max-w-md">
          
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Sign in</h2>
            <p className="text-sm text-slate-500 font-medium">Please select your role to continue.</p>
          </div>

          {!selectedRole ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setSelectedRole('citizen')}
                className="w-full group flex items-center justify-between p-5 border border-orange-200 rounded-xl bg-orange-50 hover:bg-orange-100 transition-colors shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white border border-orange-200 flex items-center justify-center shadow-sm">
                    <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <div className="text-left">
                    <h3 className="text-base font-bold text-slate-900">Citizen</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Report issues & track status</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-orange-400 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('institution')}
                className="w-full group flex items-center justify-between p-5 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                    <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                  <div className="text-left">
                    <h3 className="text-base font-bold text-slate-900">Institution</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Resolve assigned tickets</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('government')}
                className="w-full group flex items-center justify-between p-5 border border-green-200 rounded-xl bg-green-50 hover:bg-green-100 transition-colors shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white border border-green-200 flex items-center justify-center shadow-sm">
                    <svg className="w-6 h-6 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  </div>
                  <div className="text-left">
                    <h3 className="text-base font-bold text-slate-900">Gov Admin</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Command center analytics</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-green-600 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          ) : (
            <form action={handleSubmit} className="space-y-6">
              <button 
                type="button"
                onClick={() => { setSelectedRole(null); setError(null); }}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Change Role
              </button>

              {error && (
                <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded shadow-sm">
                  <div className="flex">
                    <svg className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-sm font-semibold text-slate-700">Email Address</label>
                <input 
                  name="email" 
                  type="email" 
                  defaultValue={selectedRole === 'citizen' ? 'citizen@test.com' : selectedRole === 'institution' ? 'uni@centraltech.edu' : 'admin@gov.in'}
                  required 
                  className="block w-full px-4 py-3.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-600 focus:border-transparent transition-shadow shadow-sm" 
                  placeholder="name@example.com" 
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-semibold text-slate-700">Password</label>
                </div>
                <input 
                  name="password" 
                  type="password" 
                  defaultValue="demo123"
                  required 
                  className="block w-full px-4 py-3.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-600 focus:border-transparent transition-shadow shadow-sm" 
                  placeholder="Password" 
                />
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-orange-600/30"
              >
                {loading ? 'Authenticating...' : 'Sign in'}
              </button>
            </form>
          )}

          <div className="mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-600">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-bold text-orange-600 hover:text-orange-700 underline">
              Register as Citizen or Institution →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}