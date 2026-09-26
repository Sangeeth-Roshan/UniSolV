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
  viewMode: 'citizen' | 'government' | 'institution'
  actionsSlot?: React.ReactNode
}

// ── Status configurations ──────────────────────────────────────────────────
const STATUS_MAP: Record<string, {
  label: string
  icon: string
  step: number
  pillClass: string
  accentGradient: string
  userMessage: string
}> = {
  pending_validation: {
    label: 'Pending Review',
    icon: '⏳',
    step: 1,
    pillClass: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
    accentGradient: 'from-amber-500/60 to-amber-600/30',
    userMessage: 'Your report has been received and is queued for government review.',
  },
  routed: {
    label: 'Assigned to Institution',
    icon: '🚀',
    step: 3,
    pillClass: 'bg-blue-500/10 text-blue-300 border-blue-500/25',
    accentGradient: 'from-blue-500/60 to-indigo-600/30',
    userMessage: 'Assigned to an institution for inspection and scheduling.',
  },
  accepted: {
    label: 'Accepted by Team',
    icon: '🤝',
    step: 3,
    pillClass: 'bg-violet-500/10 text-violet-300 border-violet-500/25',
    accentGradient: 'from-violet-500/60 to-purple-600/30',
    userMessage: 'The institution accepted the assignment. Planning and field work underway.',
  },
  in_progress: {
    label: 'Work in Progress',
    icon: '🔧',
    step: 4,
    pillClass: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25',
    accentGradient: 'from-cyan-500/60 to-teal-600/30',
    userMessage: 'On-site repair and remediation work is actively being performed.',
  },
  piloting: {
    label: 'Awaiting Verification',
    icon: '🔍',
    step: 5,
    pillClass: 'bg-teal-500/10 text-teal-300 border-teal-500/25',
    accentGradient: 'from-teal-500/60 to-emerald-600/30',
    userMessage: 'The team has finished work and submitted proof. Government verification in progress.',
  },
  verified: {
    label: 'Verified Resolution',
    icon: '✅',
    step: 6,
    pillClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
    accentGradient: 'from-emerald-500/70 to-teal-500/40',
    userMessage: 'Resolution verified! The civic issue has been successfully resolved.',
  },
  closed: {
    label: 'Closed & Resolved',
    icon: '🎉',
    step: 6,
    pillClass: 'bg-slate-500/10 text-slate-300 border-slate-500/25',
    accentGradient: 'from-slate-500/50 to-slate-700/30',
    userMessage: 'Issue successfully resolved and archived. Thank you for making our city better!',
  },
  escalated: {
    label: 'Escalated (Priority Attention)',
    icon: '⚠️',
    step: 2,
    pillClass: 'bg-rose-500/10 text-rose-300 border-rose-500/25',
    accentGradient: 'from-rose-500/70 to-red-600/30',
    userMessage: 'Standard turnaround window elapsed. Escalated for priority supervisory handling.',
  },
}

const STEPS = ['Reported', 'Reviewed', 'Assigned', 'In Progress', 'Verified', 'Closed']

// ── Helpers ────────────────────────────────────────────────────────────────
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
      badge: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
      bar: 'bg-rose-500',
      pct,
    }
  }
  if (norm >= 0.4) {
    return {
      label: 'Moderate Priority',
      badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
      bar: 'bg-amber-500',
      pct,
    }
  }
  return {
    label: 'Standard Priority',
    badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    bar: 'bg-emerald-500',
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
        // Remove trailing duplicate notes if any
        notes.push({ lang: parts[i], text: parts[i + 1].trim() })
      } else {
        notes.push({ lang: 'Note', text: parts[i].trim() })
      }
    }

    // Keep unique languages
    const seen = new Set<string>()
    const uniqueNotes = notes.filter((n) => {
      const key = `${n.lang}:${n.text.slice(0, 30)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return (
      <div className="mt-2.5 space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-cyan-400">
          <span>🎙️</span>
          <span>Transcribed Voice Report</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {uniqueNotes.slice(0, 2).map((n, idx) => (
            <div key={idx} className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                {n.lang}
              </span>
              <p className="text-slate-300 leading-relaxed line-clamp-3">{n.text}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <p className="text-sm text-slate-300 mt-1.5 line-clamp-3 leading-relaxed">
      {desc}
    </p>
  )
}

export function TicketCard({ ticket, viewMode, actionsSlot }: TicketCardProps) {
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
      slaRemainingText = `${Math.floor(hours)}h ${Math.floor((hours % 1) * 60)}m left`
    }
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden border border-white/[0.08] hover:border-white/[0.14] transition-all duration-200">
      {/* ── Top accent gradient strip ────────────────────────────────────────── */}
      <div className={`h-1 w-full bg-gradient-to-r ${statusCfg.accentGradient}`} />

      <div className="p-5 sm:p-6 space-y-4">
        {/* ── Top Bar: Title, ID & Status Badge ───────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-white leading-snug tracking-tight">
                {ticket.title}
              </h3>
              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-400 border border-slate-700/50">
                #{ticket.id}
              </span>
            </div>
            {renderDescription(ticket.description)}
          </div>

          {/* Status Badge */}
          <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusCfg.pillClass}`}>
              <span>{statusCfg.icon}</span>
              <span>{statusCfg.label}</span>
            </span>
            <span className="text-[11px] text-slate-500">
              {formatRelativeTime(ticket.created_at)}
            </span>
          </div>
        </div>

        {/* ── Meta Pills Row ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {/* Domain tag */}
          {ticket.domain && (
            <span className="text-xs font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
              <span>🏷️</span>
              <span>{ticket.domain}</span>
            </span>
          )}

          {/* Assigned Institution */}
          {ticket.assigned_institution_name && (
            <span className="text-xs font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5">
              <span>🏛️</span>
              <span>{ticket.assigned_institution_name}</span>
            </span>
          )}

          {/* Priority indicator */}
          {priority && (
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-lg border flex items-center gap-2 ${priority.badge}`}>
              <span>Priority: {priority.label}</span>
              <span className="inline-block w-10 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <span
                  className={`block h-full rounded-full ${priority.bar}`}
                  style={{ width: `${priority.pct}%` }}
                />
              </span>
            </span>
          )}

          {/* SLA Badge */}
          {slaRemainingText && (
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-lg border flex items-center gap-1 ${
              isSlaBreached
                ? 'bg-rose-500/10 text-rose-300 border-rose-500/25'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/25'
            }`}>
              <span>⏱️</span>
              <span>{slaRemainingText}</span>
            </span>
          )}
        </div>

        {/* ── Visual Progress Stepper ─────────────────────────────────────────── */}
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
                      className={`absolute top-2.5 left-1/2 w-full h-[2px] -z-0 transition-colors ${
                        isPast ? 'bg-indigo-500/50' : 'bg-slate-800/80'
                      }`}
                    />
                  )}
                  {/* Step node */}
                  <div
                    className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                      isCurrent
                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-500/30 scale-110'
                        : isPast
                        ? 'bg-indigo-950 border-indigo-500/50 text-indigo-300'
                        : 'bg-slate-900 border-slate-800 text-slate-600'
                    }`}
                  >
                    {isPast ? '✓' : stepIndex}
                  </div>
                  <span
                    className={`mt-1.5 text-[10px] text-center font-medium leading-tight max-w-[56px] transition-colors ${
                      isCurrent
                        ? 'text-indigo-300 font-semibold'
                        : isPast
                        ? 'text-slate-400'
                        : 'text-slate-600'
                    }`}
                  >
                    {stepName}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Status Message / Helper Note ────────────────────────────────────── */}
        <div className="rounded-xl bg-slate-900/40 border border-white/5 px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-slate-300">
          <span className="text-sm shrink-0">{statusCfg.icon}</span>
          <span className="leading-relaxed">{statusCfg.userMessage}</span>
        </div>

        {/* ── Citizen Media (Photos or Voice Clips reported) ──────────────────── */}
        {ticket.media_urls && ticket.media_urls.length > 0 && (
          <div className="rounded-xl bg-slate-900/30 border border-white/5 p-3 space-y-2">
            <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <span>📎</span>
              <span>Citizen Attachments ({ticket.media_urls.length})</span>
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              {ticket.media_urls.map((url, i) => {
                const isAudio = url.endsWith('.webm') || url.endsWith('.mp3') || url.endsWith('.wav')
                const isImage = url.endsWith('.jpeg') || url.endsWith('.jpg') || url.endsWith('.png') || url.endsWith('.webp')
                if (isAudio) {
                  return (
                    <div key={i} className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5">
                      <span className="text-xs">🎙️ Audio Note</span>
                      <audio controls className="h-6 w-44" src={`http://localhost:8000/${url.replace(/^\//, '')}`} />
                    </div>
                  )
                }
                return (
                  <a
                    key={i}
                    href={`http://localhost:8000/${url.replace(/^\//, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg hover:bg-indigo-500/20 transition-colors"
                  >
                    <span>{isImage ? '🖼️' : '📄'}</span>
                    <span>Evidence {i + 1}</span>
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {/* ── WORKERS & COMPLETION SHOWCASE (Post-completion / Piloting) ──────── */}
        {showWorkersSection && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4 space-y-3.5">
            {/* Header banner */}
            <div className="flex items-center justify-between pb-2 border-b border-emerald-500/15">
              <div className="flex items-center gap-2">
                <span className="text-base">👷</span>
                <div>
                  <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                    {isPiloting ? 'Submitted Resolution & Credited Team' : 'Resolution Team & Attribution'}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {ticket.assigned_institution_name
                      ? `Staff and specialists from ${ticket.assigned_institution_name}`
                      : 'Institution specialists credited for resolving this issue'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                {isPiloting ? 'Pending Verification' : 'Verified Resolution'}
              </span>
            </div>

            {/* Completion Notes */}
            {ticket.completion_notes && (
              <div className="bg-slate-950/60 rounded-xl p-3 border border-emerald-500/10">
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
                  📋 Resolution Summary
                </p>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {ticket.completion_notes}
                </p>
              </div>
            )}

            {/* Workers Cards */}
            {hasWorkers && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <span>👥</span>
                  <span>Assigned Personnel ({ticket.worker_credits?.length})</span>
                </p>
                <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                  {ticket.worker_credits?.map((worker, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 bg-slate-900/80 border border-emerald-500/20 rounded-xl p-2.5 hover:border-emerald-500/40 transition-colors"
                    >
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/30">
                        {worker.name.charAt(0).toUpperCase()}
                      </div>
                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate">
                          {worker.name}
                        </p>
                        <p className="text-[10px] font-medium text-emerald-400 truncate">
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
              <div className="pt-2 border-t border-emerald-500/15 space-y-2">
                <p className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1.5">
                  <span>📸</span>
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
                        className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-xl hover:bg-emerald-500/20 transition-all hover:scale-[1.02]"
                      >
                        <span>{isImage ? '🖼️' : '📄'}</span>
                        <span>View Proof {i + 1}</span>
                        <span className="text-[10px] text-emerald-400">↗</span>
                      </a>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Page-specific Actions Slot ──────────────────────────────────────── */}
        {actionsSlot && (
          <div className="pt-2 border-t border-white/5">
            {actionsSlot}
          </div>
        )}

        {/* ── Collapsible Activity Timeline ───────────────────────────────────── */}
        {ticket.events && ticket.events.length > 0 && (
          <details className="group pt-2 border-t border-white/5">
            <summary className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-400 flex items-center justify-between list-none py-1 select-none">
              <span className="flex items-center gap-1.5">
                <span>🕒</span>
                <span>Activity Timeline ({ticket.events.length} event{ticket.events.length !== 1 ? 's' : ''})</span>
              </span>
              <span className="text-slate-600 transition-transform duration-200 group-open:rotate-180">
                ▾
              </span>
            </summary>
            <div className="mt-3 pl-2 pr-1 pb-1">
              <ol className="relative border-l border-slate-800 ml-1.5 space-y-2.5">
                {[...ticket.events].reverse().map((event, i) => (
                  <li key={i} className="pl-4 relative">
                    <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full border border-slate-700 bg-slate-900" />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-300">
                        {String(event.type).replace(/_/g, ' ')}
                      </span>
                      <span className="text-slate-500 text-[11px] ml-1.5">
                        {new Date(event.time).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {event.notes && (
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
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
