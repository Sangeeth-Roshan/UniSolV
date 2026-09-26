'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const JHARKHAND_DISTRICTS = [
  'Ranchi', 'Dhanbad', 'East Singhbhum (Jamshedpur)', 'Bokaro',
  'Hazaribagh', 'Deoghar', 'Giridih', 'Ramgarh', 'Palamu',
  'Dumka', 'Chaibasa (West Singhbhum)', 'Latehar', 'Koderma',
  'Chatra', 'Gumla', 'Simdega', 'Khunti', 'Lohardaga', 'Godda',
  'Sahebganj', 'Pakur', 'Jamtara', 'Garhwa', 'Seraikela Kharsawan'
]

const DOMAIN_OPTIONS = [
  'water & sanitation',
  'roads & transport',
  'electricity & energy',
  'public health',
  'waste management',
  'education & schools',
  'environment & pollution',
  'drainage & flooding',
  'public safety'
]

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [regType, setRegType] = useState<'citizen' | 'institution' | null>(null)

  // Initialize from query param if available
  useEffect(() => {
    const type = searchParams.get('type')
    if (type === 'citizen' || type === 'institution') {
      setRegType(type)
    }
  }, [searchParams])

  // Citizen Form State
  const [citizenName, setCitizenName] = useState('')
  const [citizenPhone, setCitizenPhone] = useState('')
  const [citizenEmail, setCitizenEmail] = useState('')
  const [citizenPassword, setCitizenPassword] = useState('')
  const [citizenConfirmPassword, setCitizenConfirmPassword] = useState('')

  // Institution Form State
  const [instRepName, setInstRepName] = useState('')
  const [instRepEmail, setInstRepEmail] = useState('')
  const [instPassword, setInstPassword] = useState('')
  const [instName, setInstName] = useState('')
  const [instType, setInstType] = useState<'university' | 'company'>('university')
  const [instContactEmail, setInstContactEmail] = useState('')
  const [instContactPhone, setInstContactPhone] = useState('')
  const [instDistrict, setInstDistrict] = useState('Ranchi')
  const [instDomains, setInstDomains] = useState<string[]>(['roads & transport', 'water & sanitation'])
  const [instDescription, setInstDescription] = useState('')

  // Common UI State
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const toggleDomain = (domain: string) => {
    setInstDomains((prev) =>
      prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain]
    )
  }

  // Handle Citizen Registration
  const handleCitizenSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!citizenName.trim() || !citizenPhone.trim() || !citizenEmail.trim() || !citizenPassword.trim()) {
      setError('Please fill in all mandatory fields.')
      return
    }

    const cleanPhone = citizenPhone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.')
      return
    }

    if (citizenPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (citizenPassword !== citizenConfirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/proxy/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: citizenName.trim(),
          email: citizenEmail.trim(),
          password: citizenPassword,
          phone: citizenPhone.trim()
        })
      })

      if (res.ok) {
        setSuccessMessage('Citizen account successfully created! Redirecting to login...')
        setTimeout(() => router.push('/login'), 2200)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.detail || 'Registration failed. Email might already be registered.')
      }
    } catch {
      setError('Network error. Please verify the server connection.')
    } finally {
      setLoading(false)
    }
  }

  // Handle Institution Registration
  const handleInstitutionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!instRepName.trim() || !instRepEmail.trim() || !instPassword.trim() || !instName.trim() || !instContactEmail.trim()) {
      setError('Please fill in all required institution fields.')
      return
    }

    if (instDomains.length === 0) {
      setError('Please select at least one domain of expertise.')
      return
    }

    if (instPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      // Step 1: Register applicant user account
      const registerRes = await fetch('/api/proxy/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: instRepName.trim(),
          email: instRepEmail.trim(),
          password: instPassword,
          phone: instContactPhone.trim() || null
        })
      })

      if (!registerRes.ok) {
        const data = await registerRes.json().catch(() => ({}))
        setError(data.detail || 'Institution account registration failed. Email might already exist.')
        setLoading(false)
        return
      }

      // Step 2: Auto-login to obtain session bearer token
      const loginForm = new FormData()
      loginForm.append('username', instRepEmail.trim())
      loginForm.append('password', instPassword)

      const loginRes = await fetch('/api/proxy/auth/login', {
        method: 'POST',
        body: loginForm
      })

      if (!loginRes.ok) {
        setError('Account created, but authentication failed. Please sign in manually.')
        setLoading(false)
        return
      }

      const { access_token } = await loginRes.json()

      // Step 3: Submit Institution application for Govt review
      const appDescription = [
        instDistrict ? `District: ${instDistrict}` : '',
        instContactPhone ? `Phone: ${instContactPhone}` : '',
        instDescription ? `Details: ${instDescription}` : ''
      ].filter(Boolean).join(' | ')

      const applyRes = await fetch('/api/proxy/institutions/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`
        },
        body: JSON.stringify({
          institution_name: instName.trim(),
          institution_type: instType,
          domains_of_expertise: instDomains,
          contact_email: instContactEmail.trim(),
          contact_phone: instContactPhone.trim() || null,
          description: appDescription
        })
      })

      if (applyRes.ok) {
        setSuccessMessage('Institution application registered! A Government of Jharkhand officer will verify your details.')
        setTimeout(() => router.push('/login'), 3000)
      } else {
        const data = await applyRes.json().catch(() => ({}))
        setError(data.detail || 'Failed to submit institution application.')
      }
    } catch {
      setError('Network error during application. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4 relative z-10">
      {/* Background Ashoka Chakra Watermark */}
      <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center opacity-[0.03]">
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/1/17/Ashoka_Chakra.svg"
          alt="Ashoka Chakra"
          className="w-[700px] h-[700px]"
        />
      </div>

      <div className="w-full max-w-2xl bg-white/70 backdrop-blur-2xl border border-white/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-6 sm:p-10 relative z-10">
        {/* Government Portal Header */}
        <div className="text-center mb-8 pb-6 border-b border-slate-200">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white border-2 border-[#138808] mb-3 shadow-md">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/f/f0/Seal_of_Jharkhand.svg"
              alt="Jharkhand Emblem"
              className="w-12 h-12 object-contain"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Government of Jharkhand
          </h1>
          <p className="text-xs font-bold text-orange-600 uppercase tracking-widest mt-1">
            UniSOLV Civic Redressal Portal
          </p>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-300 text-green-800 text-sm flex items-center gap-3">
            <svg className="w-6 h-6 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-300 text-red-700 text-sm flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* STEP 1: SELECT CITIZEN OR INSTITUTION */}
        {!regType && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Choose Registration Type</h2>
              <p className="text-sm text-slate-500 mt-1">Select how you will participate on the portal.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Citizen Card */}
              <button
                type="button"
                onClick={() => { setRegType('citizen'); setError('') }}
                className="group flex flex-col p-6 rounded-2xl bg-orange-50/70 border-2 border-orange-200 hover:border-orange-500 hover:bg-orange-100/70 transition-all text-left shadow-sm hover:shadow-md"
              >
                <div className="w-12 h-12 rounded-xl bg-white border border-orange-300 flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform">
                  <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-orange-700 transition-colors">
                  Citizen
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  For residents of Jharkhand to report civic grievances, track ticket progress, and verify resolutions.
                </p>
                <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-orange-600">
                  <span>Register as Citizen</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </button>

              {/* Institution Card */}
              <button
                type="button"
                onClick={() => { setRegType('institution'); setError('') }}
                className="group flex flex-col p-6 rounded-2xl bg-green-50/70 border-2 border-green-200 hover:border-green-600 hover:bg-green-100/70 transition-all text-left shadow-sm hover:shadow-md"
              >
                <div className="w-12 h-12 rounded-xl bg-white border border-green-300 flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform">
                  <svg className="w-6 h-6 text-[#138808]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#138808] transition-colors">
                  Institution / Partner
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  For Universities, Colleges, and Corporate Partners in Jharkhand to resolve assigned civic challenges.
                </p>
                <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-[#138808]">
                  <span>Register as Institution</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2A: CITIZEN REGISTRATION FORM */}
        {regType === 'citizen' && (
          <form onSubmit={handleCitizenSubmit} className="space-y-4">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Citizen Registration</h2>
                <p className="text-xs text-slate-500">Enter your details to create an official resident account.</p>
              </div>
              <button
                type="button"
                onClick={() => { setRegType(null); setError('') }}
                className="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                ← Change Role
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={citizenName}
                onChange={(e) => setCitizenName(e.target.value)}
                placeholder="e.g. Ramesh Chandra Mahato"
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-600 focus:border-transparent text-sm shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="flex rounded-xl overflow-hidden border border-slate-300 focus-within:ring-2 focus-within:ring-orange-600 focus-within:border-transparent bg-white shadow-sm">
                <span className="inline-flex items-center px-3.5 bg-slate-100 text-slate-700 font-bold text-xs border-r border-slate-300">
                  🇮🇳 +91
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={citizenPhone}
                  onChange={(e) => setCitizenPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className="w-full px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none text-sm"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Used for grievance SMS updates & verification.</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={citizenEmail}
                onChange={(e) => setCitizenEmail(e.target.value)}
                placeholder="citizen@jharkhand.in"
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-600 focus:border-transparent text-sm shadow-sm"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={citizenPassword}
                  onChange={(e) => setCitizenPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-600 focus:border-transparent text-sm shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={citizenConfirmPassword}
                  onChange={(e) => setCitizenConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-600 focus:border-transparent text-sm shadow-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 rounded-xl text-white font-bold text-sm bg-orange-600 hover:bg-orange-700 transition-all shadow-md shadow-orange-600/30 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? 'Creating Citizen Account...' : 'Complete Citizen Registration'}
            </button>
          </form>
        )}

        {/* STEP 2B: INSTITUTION REGISTRATION FORM */}
        {regType === 'institution' && (
          <form onSubmit={handleInstitutionSubmit} className="space-y-4">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Institution / Partner Application</h2>
                <p className="text-xs text-slate-500">Universities & Companies partnering for civic resolution in Jharkhand.</p>
              </div>
              <button
                type="button"
                onClick={() => { setRegType(null); setError('') }}
                className="text-xs font-bold text-[#138808] hover:text-green-800 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                ← Change Role
              </button>
            </div>

            {/* Institution Category Toggle */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Institution Category <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setInstType('university')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    instType === 'university'
                      ? 'bg-orange-50 border-orange-500 text-orange-800 shadow-sm'
                      : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  🎓 University / College
                </button>
                <button
                  type="button"
                  onClick={() => setInstType('company')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    instType === 'company'
                      ? 'bg-green-50 border-[#138808] text-green-800 shadow-sm'
                      : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  🏢 Company / Corporate Partner
                </button>
              </div>
            </div>

            {/* Institution Legal Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Institution / Organization Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={instName}
                onChange={(e) => setInstName(e.target.value)}
                placeholder="e.g. BIT Mesra, Tata Steel CSR Division, IIT ISM Dhanbad"
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent text-sm shadow-sm"
              />
            </div>

            {/* Contact Person Details */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Authorized Officer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={instRepName}
                  onChange={(e) => setInstRepName(e.target.value)}
                  placeholder="e.g. Prof. Arvind Kumar"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent text-sm shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Contact Mobile / Phone
                </label>
                <input
                  type="tel"
                  value={instContactPhone}
                  onChange={(e) => setInstContactPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent text-sm shadow-sm"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Official Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={instRepEmail}
                  onChange={(e) => {
                    setInstRepEmail(e.target.value)
                    if (!instContactEmail) setInstContactEmail(e.target.value)
                  }}
                  placeholder="registrar@bitmesra.ac.in"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent text-sm shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Portal Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={instPassword}
                  onChange={(e) => setInstPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent text-sm shadow-sm"
                />
              </div>
            </div>

            {/* District in Jharkhand */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Headquarters / Operating District (Jharkhand)
              </label>
              <select
                value={instDistrict}
                onChange={(e) => setInstDistrict(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent text-sm shadow-sm"
              >
                {JHARKHAND_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Domains of Expertise */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Domains of Problem Solving <span className="text-slate-500 font-normal">(select capabilities)</span>
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {DOMAIN_OPTIONS.map((domain) => (
                  <button
                    key={domain}
                    type="button"
                    onClick={() => toggleDomain(domain)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold capitalize transition-all ${
                      instDomains.includes(domain)
                        ? 'bg-green-100 border-[#138808] text-green-900 shadow-sm'
                        : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {instDomains.includes(domain) ? '✓ ' : '+ '}
                    {domain}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Institutional Capabilities / Work Scope
              </label>
              <textarea
                value={instDescription}
                onChange={(e) => setInstDescription(e.target.value)}
                placeholder="Briefly describe your team, technical expertise, and student/workforce deployment capacity in Jharkhand..."
                rows={2}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent text-sm shadow-sm resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 rounded-xl text-white font-bold text-sm bg-[#138808] hover:bg-green-700 transition-all shadow-md shadow-green-700/30 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? 'Submitting Application to Govt...' : 'Submit Institution Application'}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-600">
          Already registered?{' '}
          <Link href="/login" className="font-bold text-orange-600 hover:text-orange-700 underline">
            Sign In to Portal →
          </Link>
        </div>
      </div>
    </div>
  )
}