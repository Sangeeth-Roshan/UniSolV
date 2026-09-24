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
    <div className="min-h-screen flex text-slate-800 font-sans">
      {/* Left Side - Visual / Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 items-center justify-center overflow-hidden">
        {/* Abstract Background pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black opacity-80"></div>
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1557683311-e4922240ea8b?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay"></div>
        
        <div className="relative z-10 px-12 max-w-lg text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-indigo-600 mb-8 shadow-2xl shadow-indigo-500/50 transform -rotate-6">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white transform rotate-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-5xl font-extrabold text-white tracking-tight mb-6">
            Welcome to <span className="text-indigo-400">UniSOLV</span>
          </h1>
          <p className="text-lg text-slate-300 font-light leading-relaxed">
            The intelligent platform for institutional resolution. Streamline your workflows, connect with citizens, and drive impactful decisions.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col justify-center bg-white px-6 py-12 sm:px-12 lg:px-24">
        <div className="mx-auto w-full max-w-md">
          
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Sign in</h2>
            <p className="text-sm text-slate-500 font-medium">Please enter your details to continue.</p>
          </div>

          <form action={handleSubmit} className="space-y-6">
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
                required 
                className="block w-full px-4 py-3.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-shadow shadow-sm" 
                placeholder="name@example.com" 
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-semibold text-slate-700">Password</label>
                <a href="#" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
                  Forgot password?
                </a>
              </div>
              <input 
                name="password" 
                type="password" 
                required 
                className="block w-full px-4 py-3.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-shadow shadow-sm" 
                placeholder="••••••••" 
              />
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-600/30"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Authenticating...
                </>
              ) : 'Sign in'}
            </button>
          </form>
          
          <div className="mt-8 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <a href="#" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
              Contact administrator
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
