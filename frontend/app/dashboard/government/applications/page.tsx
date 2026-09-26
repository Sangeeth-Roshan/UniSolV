import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'

interface Application {
  id: number
  institution_name: string
  institution_type: string
  domains_of_expertise: string[]
  contact_email: string
  contact_phone?: string | null
  description: string | null
  status: 'pending' | 'approved' | 'rejected'
  review_notes: string | null
  created_institution_id: number | null
  created_at: string
  reviewed_at: string | null
  applicant: {
    id: number
    name: string
    email: string
    role: string
  }
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    pending:  'bg-orange-50 text-orange-800 border border-orange-300 shadow-sm',
    approved: 'bg-emerald-50 text-[#138808] border border-emerald-300 shadow-sm',
    rejected: 'bg-red-50 text-red-700 border border-red-300 shadow-sm',
  }
  return styles[status] ?? 'bg-slate-50 text-slate-700 border border-slate-200'
}

function formatDomainTitle(domain: string): string {
  if (!domain) return 'General';
  return domain
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

async function getApplications(): Promise<Application[]> {
  const token = cookies().get('token')?.value
  if (!token) return []
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
  try {
    const res = await fetch(`${backendUrl}/api/institutions/applications`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 5 },
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export default async function InstitutionApplicationsPage() {
  const applications = await getApplications()
  const pending = applications.filter(a => a.status === 'pending')
  const reviewed = applications.filter(a => a.status !== 'pending')

  return (
    <div className="space-y-8 pb-10">
      {/* Header with Liquid Glass and Tricolor Accents */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF9933]" />
            <h1 className="page-title">Institution Registration Applications</h1>
          </div>
          <p className="page-subtitle mt-1">
            Official government evaluation portal for university research centers, colleges, and civic enterprise partners.
          </p>
        </div>

        <Link
          href="/dashboard/government"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/80 hover:bg-orange-50/80 border border-slate-200/90 text-slate-700 hover:text-orange-700 text-sm font-semibold transition-all shadow-sm backdrop-blur-md self-start sm:self-auto"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Command Center
        </Link>
      </div>

      {/* Pending Applications Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-[#FF9933] animate-pulse" />
            Pending Officer Verification
            {pending.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-900 text-xs font-black border border-orange-300 shadow-sm">
                {pending.length} Action Needed
              </span>
            )}
          </h2>
          <span className="text-xs text-slate-500 font-medium">Standard 48-hour Review SLA</span>
        </div>

        {pending.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-xl border border-white/80 rounded-2xl p-8 text-center text-slate-500 shadow-sm">
            <svg className="w-10 h-10 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-semibold text-slate-700">No pending institution registration requests.</p>
            <p className="text-xs text-slate-400 mt-1">All applicant submissions have been evaluated.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {pending.map((app) => (
              <ApplicationCard key={app.id} app={app} />
            ))}
          </div>
        )}
      </div>

      {/* Reviewed Applications Section */}
      {reviewed.length > 0 && (
        <div className="pt-4">
          <h2 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-[#138808]" />
            Audited & Completed Applications
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
              {reviewed.length}
            </span>
          </h2>
          <div className="flex flex-col gap-4">
            {reviewed.map((app) => (
              <ApplicationCard key={app.id} app={app} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ApplicationCard({ app }: { app: Application }) {
  const isApproved = app.status === 'approved'
  const isRejected = app.status === 'rejected'
  const isPending = app.status === 'pending'

  const formattedCreated = new Date(app.created_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const formattedReviewed = app.reviewed_at
    ? new Date(app.reviewed_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null

  return (
    <div className="relative bg-white/90 backdrop-blur-xl border border-white/90 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all hover:shadow-md">
      {/* Indian Flag Tricolor Accent Strip */}
      <div className={`h-1 w-full absolute top-0 left-0 bg-gradient-to-r ${
        isApproved 
          ? 'from-emerald-500 via-[#138808] to-teal-500' 
          : isRejected 
          ? 'from-red-500 via-rose-500 to-red-600' 
          : 'from-[#FF9933] via-orange-400 to-[#138808]'
      }`} />

      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          {/* Title & Type */}
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h3 className="font-extrabold text-lg text-slate-900">{app.institution_name}</h3>
            <span className="text-xs font-bold bg-orange-50 text-orange-800 border border-orange-200/90 px-2.5 py-0.5 rounded-full capitalize">
              {app.institution_type}
            </span>
            <span className="text-xs font-mono text-slate-400">Ref #{app.id}</span>
          </div>

          {/* Applicant Info */}
          <p className="text-xs text-slate-500 mb-2">
            Submitted by <span className="font-bold text-slate-800">{app.applicant.name}</span>{' '}
            <span className="text-slate-400">({app.applicant.email})</span> • Role: <span className="capitalize font-semibold text-slate-700">{app.applicant.role.replace(/_/g, ' ')}</span>
          </p>

          {/* Description */}
          {app.description && (
            <p className="text-sm text-slate-600 bg-slate-50/70 border border-slate-100 rounded-xl p-3 mb-3 leading-relaxed">
              {app.description}
            </p>
          )}

          {/* Domain Specializations */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Expertise:</span>
            {app.domains_of_expertise.map((d) => (
              <span key={d} className="px-2.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-xs font-semibold shadow-xs">
                {formatDomainTitle(d)}
              </span>
            ))}
          </div>

          {/* Contact Details */}
          <div className="flex items-center gap-5 text-xs text-slate-600 flex-wrap">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email: <span className="font-bold text-slate-800">{app.contact_email}</span>
            </span>
            {app.contact_phone && (
              <span className="inline-flex items-center gap-1.5 font-medium">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Phone: <span className="font-bold text-slate-800">{app.contact_phone}</span>
              </span>
            )}
            <span className="text-slate-400">|</span>
            <span className="text-slate-500">
              Filed: <span className="font-semibold text-slate-700">{formattedCreated}</span>
            </span>
          </div>

          {/* Reviewer Notes if present */}
          {app.review_notes && (
            <div className="mt-3 p-3 rounded-xl bg-orange-50/50 border border-orange-200/80">
              <p className="text-xs text-orange-950 font-medium">
                <span className="font-bold text-orange-800 uppercase tracking-wider text-[10px]">Officer Review Notes: </span>
                {app.review_notes}
              </p>
            </div>
          )}

          {/* ── LAST LINE FIX: Always display complete status, audit timestamps & institution record info ── */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
            {isApproved && (
              <div className="flex items-center gap-2 text-emerald-800 font-bold bg-emerald-50/90 border border-emerald-200 px-3 py-1.5 rounded-xl shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#138808] animate-pulse" />
                <span>
                  ✓ Accreditation Approved • Institution Record #{app.created_institution_id ?? app.id} Active in Routing Pool
                </span>
              </div>
            )}

            {isRejected && (
              <div className="flex items-center gap-2 text-red-800 font-bold bg-red-50/90 border border-red-200 px-3 py-1.5 rounded-xl shadow-xs">
                <span className="w-2 h-2 rounded-full bg-red-600" />
                <span>
                  ✕ Registration Declined • Application Archived
                </span>
              </div>
            )}

            {isPending && (
              <div className="flex items-center gap-2 text-orange-900 font-bold bg-orange-50/90 border border-orange-200 px-3 py-1.5 rounded-xl shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#FF9933] animate-ping" />
                <span>
                  ⏳ Awaiting Officer Determination • Under review by Department of Higher & Technical Education
                </span>
              </div>
            )}

            <div className="text-slate-500 font-medium text-[11px]">
              {formattedReviewed ? (
                <span>Audited on <strong className="text-slate-700">{formattedReviewed}</strong></span>
              ) : (
                <span>Submitted <strong className="text-slate-700">{formattedCreated}</strong></span>
              )}
            </div>
          </div>
        </div>

        {/* Status Badge Top Right */}
        <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${statusBadge(app.status)}`}>
          {app.status}
        </span>
      </div>

      {/* Actions — Only for Pending Applications */}
      {isPending && (
        <div className="flex gap-4 mt-5 pt-4 border-t border-slate-200/90 flex-wrap items-center bg-slate-50/60 -mx-6 -mb-6 p-4 rounded-b-2xl">
          {/* Approve Form */}
          <form action={async (formData: FormData) => {
            'use server'
            const t = cookies().get('token')?.value
            const notes = formData.get('review_notes') as string
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
            try {
              const res = await fetch(
                `${backendUrl}/api/institutions/applications/${app.id}/approve`,
                {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ review_notes: notes || null }),
                }
              )
              if (res.ok) revalidatePath('/dashboard/government/applications')
            } catch {}
          }} className="flex items-center gap-2 flex-wrap">
            <input
              name="review_notes"
              placeholder="Approval notes / credentials..."
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40 w-60 shadow-xs"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#138808] text-white text-xs font-bold rounded-xl hover:bg-green-700 transition-all shadow-md shadow-green-700/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Approve & Create Institution
            </button>
          </form>

          {/* Reject Form */}
          <form action={async (formData: FormData) => {
            'use server'
            const t = cookies().get('token')?.value
            const notes = formData.get('review_notes') as string
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
            try {
              const res = await fetch(
                `${backendUrl}/api/institutions/applications/${app.id}/reject`,
                {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ review_notes: notes || null }),
                }
              )
              if (res.ok) revalidatePath('/dashboard/government/applications')
            } catch {}
          }} className="flex items-center gap-2 flex-wrap">
            <input
              name="review_notes"
              placeholder="Rejection justification..."
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/40 w-56 shadow-xs"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-all shadow-md shadow-red-600/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reject
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
