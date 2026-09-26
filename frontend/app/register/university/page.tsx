'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const DOMAIN_OPTIONS = [
  'water', 'roads', 'public-health', 'sanitation', 'electricity',
  'education', 'environment', 'housing', 'transportation', 'safety',
]

export default function UniversityRegisterPage() {
  const router = useRouter()

  // Step 1: Personal account
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Step 2: Institution details
  const [institutionName, setInstitutionName] = useState('')
  const [institutionType, setInstitutionType] = useState<'university' | 'company'>('university')
  const [contactEmail, setContactEmail] = useState('')
  const [description, setDescription] = useState('')
  const [selectedDomains, setSelectedDomains] = useState<string[]>([])

  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const toggleDomain = (domain: string) => {
    setSelectedDomains(prev =>
      prev.includes(domain) ? prev.filter(d => d !== domain) : [...prev, domain]
    )
  }

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('All fields are required.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!institutionName.trim() || !contactEmail.trim()) {
      setError('Institution name and contact email are required.')
      return
    }
    if (selectedDomains.length === 0) {
      setError('Please select at least one domain of expertise.')
      return
    }

    setLoading(true)
    try {
      // Step 1: Register citizen account
      const registerRes = await fetch('/api/proxy/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      if (!registerRes.ok) {
        const data = await registerRes.json().catch(() => ({}))
        setError(data.detail || 'Account registration failed.')
        return
      }

      // Step 2: Login to get token
      const loginForm = new FormData()
      loginForm.append('username', email)
      loginForm.append('password', password)
      const loginRes = await fetch('/api/proxy/auth/login', {
        method: 'POST',
        body: loginForm,
      })

      if (!loginRes.ok) {
        setError('Login after registration failed. Please log in manually and apply from your account.')
        return
      }

      const { access_token } = await loginRes.json()

      // Step 3: Submit institution application
      const applyRes = await fetch('/api/proxy/institutions/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          institution_name: institutionName,
          institution_type: institutionType,
          domains_of_expertise: selectedDomains,
          contact_email: contactEmail,
          description: description || null,
        }),
      })

      if (!applyRes.ok) {
        const data = await applyRes.json().catch(() => ({}))
        setError(data.detail || 'Failed to submit application.')
        return
      }

      setSuccess(true)
    } catch {
      setError('Network error. Please check that the server is running.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="glass-card p-10 max-w-lg w-full text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Application Submitted!</h2>
          <p className="text-slate-400 mb-2">
            Your institution registration request has been sent to the government officer for review.
          </p>
          <p className="text-slate-500 text-sm">
            Once approved, you&apos;ll be granted the <span className="text-indigo-400 font-semibold">university admin</span> role
            and your institution will appear in the routing system.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="mt-6 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-500 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-10">
      <div className="glass-card p-10 max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Register Your Institution</h1>
          <p className="text-slate-400 text-sm mt-2">
            Submit an application to join UniSOLV as a university or company partner.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8">
          <div className={`flex items-center gap-2 text-sm font-semibold ${step === 1 ? 'text-indigo-400' : 'text-emerald-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 1 ? 'bg-indigo-500/30' : 'bg-emerald-500/30'}`}>
              {step === 1 ? '1' : '✓'}
            </span>
            Your Account
          </div>
          <div className="flex-1 h-px bg-white/10" />
          <div className={`flex items-center gap-2 text-sm font-semibold ${step === 2 ? 'text-indigo-400' : 'text-slate-600'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 2 ? 'bg-indigo-500/30' : 'bg-slate-700'}`}>
              2
            </span>
            Institution Details
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-300">
            {error}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleStep1} className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-slate-300 block mb-2">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-300 block mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-300 block mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold shadow-lg shadow-indigo-500/25 hover:scale-[1.02] transition-all"
            >
              Next: Institution Details →
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-slate-300 block mb-2">Institution Name</label>
              <input
                type="text"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder="e.g. IIT Madras, Tata Consultancy Services"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-300 block mb-2">Institution Type</label>
              <div className="flex gap-3">
                {(['university', 'company'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setInstitutionType(t)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold capitalize transition-all ${
                      institutionType === t
                        ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                        : 'bg-slate-950 border-white/10 text-slate-500 hover:border-white/20'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-300 block mb-2">Contact Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="admin@institution.edu"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-300 block mb-2">
                Domains of Expertise <span className="text-slate-500 font-normal">(select all that apply)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {DOMAIN_OPTIONS.map((domain) => (
                  <button
                    key={domain}
                    type="button"
                    onClick={() => toggleDomain(domain)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold capitalize transition-all ${
                      selectedDomains.includes(domain)
                        ? 'bg-indigo-500/25 border-indigo-500/50 text-indigo-300'
                        : 'bg-slate-950 border-white/10 text-slate-500 hover:border-white/20'
                    }`}
                  >
                    {domain}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-300 block mb-2">
                Brief Description <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your institution's capabilities and how you can contribute to civic issue resolution..."
                rows={3}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setStep(1); setError('') }}
                className="px-4 py-3 rounded-xl border border-white/10 text-slate-400 text-sm font-semibold hover:border-white/20 transition-all"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold shadow-lg shadow-indigo-500/25 hover:scale-[1.02] transition-all disabled:opacity-60 disabled:pointer-events-none"
              >
                {loading ? 'Submitting application...' : 'Submit Application'}
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-sm text-slate-500 mt-6">
          Registering as a citizen instead?{' '}
          <a href="/register" className="text-indigo-400 hover:text-indigo-300 underline font-semibold">Regular signup</a>
        </p>
      </div>
    </div>
  )
}
