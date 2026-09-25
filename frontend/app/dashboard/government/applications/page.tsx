import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

interface Application {
  id: number
  institution_name: string
  institution_type: string
  domains_of_expertise: string[]
  contact_email: string
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
    pending:  'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    approved: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    rejected: 'bg-red-500/20 text-red-300 border border-red-500/30',
  }
  return styles[status] ?? 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
}

async function getApplications(): Promise<Application[]> {
  const token = cookies().get('token')?.value
  if (!token) return []
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
  try {
    const res = await fetch(`${backendUrl}/api/institutions/applications`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
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
    <div>
      <div className="mb-8">
        <h1 className="page-title">Institution Applications</h1>
        <p className="page-subtitle">
          Review university and company registration applications. Approved institutions are permanently
          added to the database and can receive routed tickets.
        </p>
      </div>

      {/* Pending applications */}
      <div className="mb-10">
        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          Pending Review
          {pending.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
              {pending.length}
            </span>
          )}
        </h2>

        {pending.length === 0 ? (
          <div className="glass-card p-8 text-center text-slate-500">
            No pending applications.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {pending.map((app) => (
              <ApplicationCard key={app.id} app={app} />
            ))}
          </div>
        )}
      </div>

      {/* Reviewed applications */}
      {reviewed.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />
            Previously Reviewed
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
  return (
    <div className="glass-card p-5">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-bold text-base text-white">{app.institution_name}</h3>
            <span className="text-xs font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded capitalize">
              {app.institution_type}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Applied by <span className="text-slate-300">{app.applicant.name}</span>{' '}
            &lt;{app.applicant.email}&gt; · {new Date(app.created_at).toLocaleDateString()}
          </p>

          {app.description && (
            <p className="text-sm text-slate-400 mt-2 line-clamp-2">{app.description}</p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {app.domains_of_expertise.map((d) => (
              <span key={d} className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-xs border border-white/5 capitalize">
                {d}
              </span>
            ))}
          </div>

          <p className="text-xs text-slate-600 mt-2">
            Contact: <span className="text-slate-400">{app.contact_email}</span>
          </p>

          {app.review_notes && (
            <div className="mt-3 p-2.5 rounded-lg bg-slate-800/50 border border-white/5">
              <p className="text-xs text-slate-500">
                <span className="font-semibold text-slate-400">Review notes: </span>{app.review_notes}
              </p>
            </div>
          )}

          {app.status === 'approved' && app.created_institution_id && (
            <p className="text-xs text-emerald-400 mt-2 font-semibold">
              ✅ Institution #{app.created_institution_id} created and active.
            </p>
          )}
        </div>

        <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusBadge(app.status)}`}>
          {app.status}
        </span>
      </div>

      {/* Actions — only for pending applications */}
      {app.status === 'pending' && (
        <div className="flex gap-3 mt-5 pt-4 border-t border-white/5 flex-wrap">
          {/* Approve */}
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
              placeholder="Approval notes (optional)"
              className="bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 w-56"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600/80 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-all border border-emerald-500/40 shadow-sm shadow-emerald-500/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Approve & Create Institution
            </button>
          </form>

          {/* Reject */}
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
              placeholder="Rejection reason (optional)"
              className="bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50 w-56"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-700/60 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-all border border-red-500/40"
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
