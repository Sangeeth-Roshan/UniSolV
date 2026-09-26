'use client'

import React from 'react'

export interface TicketEvent {
  type: string
  notes: string | null
  time: string
  actor_id?: number | null
}

export interface WorkerCredit {
  name: string
  role: string
}

export interface TicketData {
  id: number
  title: string
  description: string
  domain: string | null
  status: string
  severity_score: number | null
  contact_phone?: string | null
  media_urls?: string[]
  proof_media_urls?: string[]
  completion_notes: string | null
  assigned_institution_id?: number | null
  assigned_institution_name?: string | null
  sla_deadline?: string | null
  created_at: string
  worker_credits?: WorkerCredit[]
  events?: TicketEvent[]
}

interface TicketCardProps {
  ticket: TicketData
  viewMode?: 'citizen' | 'government' | 'institution'
  _viewMode?: 'citizen' | 'government' | 'institution'
  actionsSlot?: React.ReactNode
}

// Status configurations with Indian Flag (Saffron, White, Green) + Slate accents
const STATUS_MAP: Record<string, {
  label: string
  step: number
  pillClass: string
  accentGradient: string
  userMessage: string
}> = {
  pending_validation: {
    label: 'Pending Review',
    step: 1,
    pillClass: 'bg-amber-50 text-amber-900 border-amber-300',
    accentGradient: 'from-amber-400 to-amber-500',
    userMessage: 'Grievance received and queued for review by Government of Jharkhand officers.',
  },
  routed: {
    label: 'Assigned to Institution',
    step: 3,
    pillClass: 'bg-blue-50 text-blue-900 border-blue-300',
    accentGradient: 'from-blue-500 to-indigo-600',
    userMessage: 'Assigned to an accredited institution or municipal agency for remediation.',
  },
  accepted: {
    label: 'Accepted by Team',
    step: 3,
    pillClass: 'bg-orange-50 text-orange-900 border-orange-300',
    accentGradient: 'from-orange-400 to-orange-500',
    userMessage: 'The assigned institution accepted the ticket. On-ground assessment initiated.',
  },
  in_progress: {
    label: 'Work in Progress',
    step: 4,
    pillClass: 'bg-orange-50 text-orange-950 border-orange-400',
    accentGradient: 'from-orange-500 to-amber-600',
    userMessage: 'Remediation and field work are actively being executed on site.',
  },
  piloting: {
    label: 'Awaiting Verification',
    step: 5,
    pillClass: 'bg-teal-50 text-teal-900 border-teal-300',
    accentGradient: 'from-teal-500 to-emerald-600',
    userMessage: 'Field work completed with proof submitted. Awaiting government verification.',
  },
  verified: {
    label: 'Verified Resolution',
    step: 6,
    pillClass: 'bg-green-50 text-green-900 border-green-300',
    accentGradient: 'from-[#138808] to-emerald-600',
    userMessage: 'Resolution officially verified by government officers. Issue resolved.',
  },
  closed: {
    label: 'Closed & Resolved',
    step: 6,
    pillClass: 'bg-slate-100 text-slate-800 border-slate-300',
    accentGradient: 'from-slate-400 to-slate-600',
    userMessage: 'Issue successfully resolved and archived. Thank you for improving Jharkhand!',
  },
  escalated: {
    label: 'Escalated (Priority Attention)',
    step: 2,
    pillClass: 'bg-red-50 text-red-900 border-red-300',
    accentGradient: 'from-red-500 to-rose-600',
    userMessage: 'Resolution timeline exceeded. Escalated to senior departmental officers.',
  },
}

const STEPS = ['Reported', 'Reviewed', 'Assigned', 'In Progress', 'Verified', 'Closed']

function normalizeSeverity(score: number | null): number {
  if (score == null) return 0.5
  if (score > 1.0) {
    return Math.min(Math.max(score / 5.0, 0), 1)
  }
  return Math.min(Math.max(score, 0), 1)
}

function getPriorityDetails(score: number | null) {
  if (score == null) return null
  const norm = normalizeSeverity(score)
  const pct = Math.round(norm * 100)

  if (norm >= 0.75) {
    return {
      label: 'High Priority',
      badge: 'bg-red-50 text-red-800 border-red-200',
      bar: 'bg-red-500',
      pct,
    }
  }
  if (norm >= 0.4) {
    return {
      label: 'Moderate Priority',
      badge: 'bg-orange-50 text-orange-800 border-orange-200',
      bar: 'bg-orange-500',
      pct,
    }
  }
  return {
    label: 'Standard Priority',
    badge: 'bg-green-50 text-green-800 border-green-200',
    bar: 'bg-[#138808]',
    pct,
  }
}

function formatRelativeTime(dateStr: string) {
  try {
    const diff = Date.now() - new Date(dateStr).getTime()
    const d = Math.floor(diff / 86400000)
    const h = Math.floor(diff / 3600000)
    const m = Math.floor(diff / 60000)
    if (d > 0) return `${d}d ago`
    if (h > 0) return `${h}h ago`
    if (m > 0) return `${m}m ago`
    return 'Just now'
  } catch {
    return ''
  }
}

function renderDescription(desc: string) {
  if (!desc) return null
  const hasVoiceNote = desc.includes('[Voice Note')
  if (hasVoiceNote) {
    const parts = desc.split(/\[Voice Note - ([^\]]+)\]:\s*/).filter(Boolean)
    const notes: { lang: string; text: string }[] = []
    for (let i = 0; i < parts.length; i += 2) {
      if (i + 1 < parts.length) {
        notes.push({ lang: parts[i], text: parts[i + 1].trim() })
      } else {
        notes.push({ lang: 'Note', text: parts[i].trim() })
      }
    }

    const seen = new Set<string>()
    const uniqueNotes = notes.filter((n) => {
      const key = `${n.lang}:${n.text.slice(0, 30)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return (
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-orange-700">
          <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <span>Transcribed Voice Report</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {uniqueNotes.slice(0, 2).map((n, idx) => (
            <div key={idx} className="bg-orange-50/60 border border-orange-200/80 rounded-xl p-3 text-xs shadow-sm">
              <span className="text-[10px] font-bold text-orange-800 uppercase tracking-wider block mb-1">
                {n.lang}
              </span>
              <p className="text-slate-800 leading-relaxed line-clamp-3 font-medium">{n.text}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <p className="text-xs sm:text-sm text-slate-700 mt-2 line-clamp-3 leading-relaxed font-normal">
      {desc}
    </p>
  )
}

export function TicketCard({ ticket, actionsSlot }: TicketCardProps) {
  const statusCfg = STATUS_MAP[ticket.status] ?? STATUS_MAP.pending_validation
  const priority = getPriorityDetails(ticket.severity_score)
  const isCompleted = ['verified', 'closed'].includes(ticket.status)
  const isPiloting = ticket.status === 'piloting'
  const hasWorkers = (ticket.worker_credits?.length ?? 0) > 0
  const showWorkersSection = (isCompleted || isPiloting) && (hasWorkers || Boolean(ticket.completion_notes))

  // SLA calculation
  let slaRemainingText: string | null = null
  let isSlaBreached = false
  if (ticket.sla_deadline && !isCompleted) {
    const diff = new Date(ticket.sla_deadline).getTime() - Date.now()
    const hours = diff / 3600000
    if (hours < 0) {
      isSlaBreached = true
      slaRemainingText = 'SLA Breached'
    } else if (hours < 48) {
      slaRemainingText = `${Math.floor(hours)}h ${Math.floor((hours % 1) * 60)}m remaining`
    }
  }

  return (
    <div className="bg-white/75 backdrop-blur-2xl rounded-2xl overflow-hidden border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-lg transition-all duration-200">
      {/* Top Accent Strip with Indian Flag gradient */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${statusCfg.accentGradient}`} />

      <div className="p-5 sm:p-6 space-y-4">
        {/* Top Header Row: Title, ID & Status Badge */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug tracking-tight">
                {ticket.title}
              </h3>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-300">
                #{ticket.id}
              </span>
            </div>
            {renderDescription(ticket.description)}
          </div>

          {/* Status Badge */}
          <div className="flex sm:flex-col items-center sm:items-end gap-1.5 shrink-0">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${statusCfg.pillClass}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              <span>{statusCfg.label}</span>
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Reported {formatRelativeTime(ticket.created_at)}
            </span>
          </div>
        </div>

        {/* User Status Explanatory Note */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center gap-2">
          <span className="text-orange-600 font-bold">ℹ</span>
          <span>{statusCfg.userMessage}</span>
        </div>

        {/* Meta Pills Row */}
        <div className="flex items-center gap-2 flex-wrap pt-0.5">
          {/* Domain tag */}
          {ticket.domain && (
            <span className="text-xs font-semibold bg-orange-50 text-orange-800 border border-orange-200 px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-sm capitalize">
              <span>🏷️</span>
              <span>{ticket.domain.replace(/_/g, ' ')}</span>
            </span>
          )}

          {/* Assigned Institution */}
          {ticket.assigned_institution_name && (
            <span className="text-xs font-semibold bg-blue-50 text-blue-900 border border-blue-200 px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
              <span>🏛️</span>
              <span>{ticket.assigned_institution_name}</span>
            </span>
          )}

          {/* Priority indicator */}
          {priority && (
            <span className={`text-xs font-semibold px-3 py-1 rounded-lg border flex items-center gap-2 shadow-sm ${priority.badge}`}>
              <span>{priority.label}</span>
              <span className="inline-block w-12 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <span
                  className={`block h-full rounded-full ${priority.bar}`}
                  style={{ width: `${priority.pct}%` }}
                />
              </span>
            </span>
          )}

          {/* SLA Badge */}
          {slaRemainingText && (
            <span className={`text-xs font-semibold px-3 py-1 rounded-lg border flex items-center gap-1.5 shadow-sm ${
              isSlaBreached
                ? 'bg-red-50 text-red-800 border-red-300'
                : 'bg-amber-50 text-amber-900 border-amber-300'
            }`}>
              <span>⏱</span>
              <span>{slaRemainingText}</span>
            </span>
          )}

          {/* Contact Phone */}
          {ticket.contact_phone && (
            <a
              href={`tel:${ticket.contact_phone}`}
              className="text-xs font-semibold bg-green-50 text-green-800 border border-green-300 px-3 py-1 rounded-lg flex items-center gap-1.5 hover:bg-green-100 transition-colors shadow-sm"
            >
              <span>📞</span>
              <span>{ticket.contact_phone}</span>
            </a>
          )}
        </div>

        {/* Visual Progress Stepper with Saffron / Green Accents */}
        <div className="pt-2 pb-1">
          <div className="relative flex items-center justify-between">
            {STEPS.map((stepName, i) => {
              const stepIndex = i + 1
              const isPast = stepIndex < statusCfg.step
              const isCurrent = stepIndex === statusCfg.step
              return (
                <div key={stepName} className="flex-1 flex flex-col items-center relative">
                  {/* Connecting line */}
                  {i < STEPS.length - 1 && (
                    <div
                      className={`absolute top-3 left-1/2 w-full h-[2px] -z-0 transition-colors ${
                        isPast ? 'bg-[#138808]' : 'bg-slate-200'
                      }`}
                    />
                  )}
                  {/* Step node */}
                  <div
                    className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                      isCurrent
                        ? 'bg-orange-600 border-orange-500 text-white shadow-md shadow-orange-600/30 scale-110'
                        : isPast
                        ? 'bg-[#138808] border-green-600 text-white'
                        : 'bg-white border-slate-300 text-slate-400'
                    }`}
                  >
                    {isPast ? '✓' : stepIndex}
                  </div>
                  <span
                    className={`text-[10px] sm:text-xs font-bold mt-1.5 text-center transition-colors ${
                      isCurrent
                        ? 'text-orange-700'
                        : isPast
                        ? 'text-green-800 font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    {stepName}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Photos Attached by Citizen */}
        {ticket.media_urls && ticket.media_urls.length > 0 && (
          <div className="pt-1">
            <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <span>📷</span>
              <span>Citizen Evidence Photos ({ticket.media_urls.length})</span>
            </p>
            <div className="flex flex-wrap gap-2.5">
              {ticket.media_urls.map((url, idx) => {
                const fullUrl = `http://localhost:8000/${url.replace(/^\//, '')}`
                return (
                  <a
                    key={idx}
                    href={fullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-800 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-xl hover:bg-orange-100 transition-colors shadow-sm"
                  >
                    <span>Photo {idx + 1}</span>
                    <span>↗</span>
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {/* WORKERS & COMPLETION SHOWCASE (Post-completion) */}
        {showWorkersSection && (
          <div className="rounded-2xl border border-green-300 bg-green-50/70 p-4 space-y-3.5 shadow-sm">
            {/* Header banner */}
            <div className="flex items-center justify-between pb-2 border-b border-green-200">
              <div className="flex items-center gap-2">
                <span className="text-base">🛠️</span>
                <div>
                  <h4 className="text-xs font-bold text-green-900 uppercase tracking-wider">
                    {isPiloting ? 'Submitted Resolution & Credited Team' : 'Resolution Team & Attribution'}
                  </h4>
                  <p className="text-xs text-slate-600">
                    {ticket.assigned_institution_name
                      ? `Staff and specialists deployed from ${ticket.assigned_institution_name}`
                      : 'Institution specialists credited for resolving this issue'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white text-green-800 border border-green-300 shadow-sm">
                {isPiloting ? 'Pending Verification' : 'Verified Resolution'}
              </span>
            </div>

            {/* Completion Notes */}
            {ticket.completion_notes && (
              <div className="bg-white rounded-xl p-3.5 border border-green-200 shadow-sm">
                <p className="text-xs font-bold text-green-900 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <span>📋</span>
                  <span>Work Completion Summary</span>
                </p>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal">
                  {ticket.completion_notes}
                </p>
              </div>
            )}

            {/* Workers Cards */}
            {hasWorkers && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>👷</span>
                  <span>Assigned Personnel ({ticket.worker_credits?.length})</span>
                </p>
                <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                  {ticket.worker_credits?.map((worker, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 bg-white border border-green-200 rounded-xl p-2.5 shadow-sm hover:border-green-400 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#138808] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                        {worker.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {worker.name}
                        </p>
                        <p className="text-[11px] font-semibold text-green-800 truncate">
                          {worker.role}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Proof Photos & Documents */}
            {ticket.proof_media_urls && ticket.proof_media_urls.length > 0 && (
              <div className="pt-2 border-t border-green-200 space-y-2">
                <p className="text-xs font-bold text-green-900 flex items-center gap-1.5">
                  <span>📎</span>
                  <span>Proof of Completion ({ticket.proof_media_urls.length} file{ticket.proof_media_urls.length !== 1 ? 's' : ''})</span>
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {ticket.proof_media_urls.map((url, i) => {
                    const isImage = url.endsWith('.jpeg') || url.endsWith('.jpg') || url.endsWith('.png') || url.endsWith('.webp')
                    const fullUrl = `http://localhost:8000/${url.replace(/^\//, '')}`
                    return (
                      <a
                        key={i}
                        href={fullUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-bold text-green-800 bg-white border border-green-300 px-3.5 py-1.5 rounded-xl hover:bg-green-50 transition-all shadow-sm"
                      >
                        <span>{isImage ? '🖼️' : '📄'}</span>
                        <span>View Proof {i + 1}</span>
                        <span className="text-[10px] text-green-600">↗</span>
                      </a>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Page-specific Actions Slot (e.g. RateTicket) */}
        {actionsSlot && (
          <div className="pt-2">
            {actionsSlot}
          </div>
        )}

        {/* Collapsible Activity Timeline */}
        {ticket.events && ticket.events.length > 0 && (
          <details className="group pt-2 border-t border-slate-200">
            <summary className="cursor-pointer text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center justify-between list-none py-1 select-none">
              <span className="flex items-center gap-1.5">
                <span>⏱️</span>
                <span>Audit Timeline ({ticket.events.length} event{ticket.events.length !== 1 ? 's' : ''})</span>
              </span>
              <span className="text-slate-500 transition-transform duration-200 group-open:rotate-180">
                ▼
              </span>
            </summary>
            <div className="mt-3 pl-2 pr-1 pb-1">
              <ol className="relative border-l border-slate-300 ml-1.5 space-y-3">
                {[...ticket.events].reverse().map((event, i) => (
                  <li key={i} className="pl-4 relative">
                    <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full border border-orange-500 bg-orange-600" />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 capitalize">
                        {String(event.type).replace(/_/g, ' ')}
                      </span>
                      <span className="text-slate-500 text-[11px] ml-2">
                        {new Date(event.time).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {event.notes && (
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed font-normal">
                        {event.notes}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </details>
        )}
      </div>
    </div>
  )
}