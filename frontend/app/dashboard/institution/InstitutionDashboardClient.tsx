'use client'

import React, { useState, useMemo } from 'react'
import { TicketCard, TicketData } from '@/components/TicketCard'

interface Props {
  initialTickets: TicketData[]
  acceptTicket: (id: number) => Promise<void>
  startTicket: (id: number) => Promise<void>
  completeTicket: (id: number, formData: FormData) => Promise<void>
}

// ── Dynamic Work Progress Status Component ─────────────────────────────────────
function DynamicWorkProgressStatus({ status }: { status: string }) {
  let stageNumber = 1
  let stageTitle = 'Awaiting Institution Acceptance'
  let stagePercent = 25
  let nextAction = 'Review ticket details and accept assignment to begin work'
  let badgeColor = 'bg-orange-50 text-orange-800 border-orange-300'
  let progressGradient = 'from-[#FF9933] to-amber-500'

  switch (status) {
    case 'routed':
      stageNumber = 1
      stageTitle = 'Assigned · Awaiting Acceptance'
      stagePercent = 25
      nextAction = 'Action Required: Click "Accept Ticket Assignment" below to mobilize field personnel'
      badgeColor = 'bg-orange-50 text-orange-800 border-orange-300'
      progressGradient = 'from-[#FF9933] to-amber-500'
      break
    case 'accepted':
      stageNumber = 2
      stageTitle = 'Accepted · Team Mobilizing'
      stagePercent = 50
      nextAction = 'Team mobilized. Click "Begin Field Remediation" when on-ground execution starts'
      badgeColor = 'bg-amber-50 text-amber-800 border-amber-300'
      progressGradient = 'from-amber-500 to-orange-500'
      break
    case 'in_progress':
      stageNumber = 3
      stageTitle = 'Active Field Remediation In Progress'
      stagePercent = 75
      nextAction = 'Remediation ongoing. Submit completion notes, team credits, and proof photo below'
      badgeColor = 'bg-blue-50 text-blue-800 border-blue-300'
      progressGradient = 'from-[#FF9933] via-amber-400 to-[#138808]'
      break
    case 'piloting':
      stageNumber = 4
      stageTitle = 'Remediation Submitted · Under State Audit'
      stagePercent = 90
      nextAction = 'Solution and personnel credits submitted. Awaiting Government Officer verification'
      badgeColor = 'bg-teal-50 text-teal-800 border-teal-300'
      progressGradient = 'from-emerald-500 to-[#138808]'
      break
    case 'verified':
    case 'closed':
      stageNumber = 5
      stageTitle = 'Verified Resolution & Redressed'
      stagePercent = 100
      nextAction = 'Remediation officially verified by state authorities. Challenge closed and credited'
      badgeColor = 'bg-emerald-50 text-[#138808] border-emerald-300'
      progressGradient = 'from-[#138808] to-green-600'
      break
    default:
      stageNumber = 1
      stageTitle = 'Queued for Action'
      stagePercent = 20
      nextAction = 'Ticket is in civic processing queue'
      badgeColor = 'bg-slate-100 text-slate-700 border-slate-200'
      progressGradient = 'from-slate-400 to-slate-500'
  }

  const milestones = [
    { label: 'Routed', step: 1 },
    { label: 'Accepted', step: 2 },
    { label: 'In Progress', step: 3 },
    { label: 'Audited', step: 4 },
    { label: 'Completed', step: 5 },
  ]

  return (
    <div className="mb-4 p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/90 shadow-xs space-y-3">
      {/* Top row: Stage Title & Percent pill */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF9933] animate-pulse" />
          <span className="text-sm sm:text-base font-bold text-slate-800">
            Work Progress Stage {stageNumber} of 5: <span className="text-slate-900 font-extrabold">{stageTitle}</span>
          </span>
        </div>
        <span className={`text-xs font-black px-3 py-1 rounded-full border shadow-xs ${badgeColor}`}>
          {stagePercent}% Progress
        </span>
      </div>

      {/* Progress Bar with Liquid Tricolor Gradient */}
      <div className="w-full bg-slate-100 rounded-full h-2.5 p-0.5 border border-slate-200/70 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${progressGradient} shadow-sm`}
          style={{ width: `${stagePercent}%` }}
        />
      </div>

      {/* Milestone checkpoints */}
      <div className="grid grid-cols-5 text-center text-xs font-semibold text-slate-500 pt-1">
        {milestones.map((m) => {
          const isDone = stageNumber >= m.step
          const isCurrent = stageNumber === m.step
          return (
            <div key={m.label} className="flex flex-col items-center">
              <span
                className={`w-2.5 h-2.5 rounded-full mb-1 transition-all ${
                  isDone
                    ? 'bg-[#138808] ring-2 ring-emerald-200'
                    : 'bg-slate-300'
                } ${isCurrent ? 'animate-ping' : ''}`}
              />
              <span className={isCurrent ? 'text-orange-700 font-bold' : isDone ? 'text-slate-700' : 'text-slate-400'}>
                {m.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Action Guidance Text */}
      <div className="text-xs sm:text-sm text-slate-700 bg-slate-50/80 rounded-xl px-3.5 py-2 border border-slate-100 flex items-center gap-2 font-medium">
        <span className="text-orange-600 font-bold">ℹ️</span>
        <span>{nextAction}</span>
      </div>
    </div>
  )
}

export default function InstitutionDashboardClient({
  initialTickets,
  acceptTicket,
  startTicket,
  completeTicket,
}: Props) {
  // Tabs: 'pending' (to be accepted) | 'workflow' (accepted + in_progress) | 'completed' (verified, closed, piloting) | 'all'
  const [activeTab, setActiveTab] = useState<'pending' | 'workflow' | 'completed' | 'all'>('workflow')
  const [search, setSearch] = useState('')
  const [domainFilter, setDomainFilter] = useState('all')
  const [isSubmitting, setIsSubmitting] = useState<number | null>(null)

  // Sort function: Always Latest to Oldest by created_at
  const sortByLatest = (list: TicketData[]) => {
    return [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  // Segment tickets into user-requested tabs
  const pendingAcceptance = useMemo(() => {
    return sortByLatest(initialTickets.filter((t) => t.status === 'routed'))
  }, [initialTickets])

  const activeWorkflow = useMemo(() => {
    return sortByLatest(initialTickets.filter((t) => ['accepted', 'in_progress'].includes(t.status)))
  }, [initialTickets])

  const completedSolutions = useMemo(() => {
    return sortByLatest(initialTickets.filter((t) => ['piloting', 'verified', 'closed'].includes(t.status)))
  }, [initialTickets])

  const allSorted = useMemo(() => {
    return sortByLatest(initialTickets)
  }, [initialTickets])

  // Get current active tab tickets
  const currentTabTickets = useMemo(() => {
    let list: TicketData[] = []
    if (activeTab === 'pending') list = pendingAcceptance
    else if (activeTab === 'workflow') list = activeWorkflow
    else if (activeTab === 'completed') list = completedSolutions
    else list = allSorted

    // Apply optional search & domain filter
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || String(t.id).includes(q))
    }
    if (domainFilter !== 'all') {
      list = list.filter((t) => t.domain === domainFilter)
    }

    return list
  }, [activeTab, pendingAcceptance, activeWorkflow, completedSolutions, allSorted, search, domainFilter])

  // Unique domains for filtering
  const domains = useMemo(() => {
    const s = new Set(initialTickets.map((t) => t.domain).filter(Boolean) as string[])
    return Array.from(s).sort()
  }, [initialTickets])

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* ── Page Header with Indian Tricolor Theme ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF9933]" />
            <h1 className="page-title">Institution Execution Workspace</h1>
          </div>
          <p className="page-subtitle">
            Remediation management portal for state-accredited universities, colleges, and civic enterprise partners.
          </p>
        </div>

        {/* Quick KPI Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3.5 py-1.5 rounded-xl bg-white/80 backdrop-blur-md border border-orange-200/90 shadow-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF9933] animate-ping" />
            <span className="text-xs font-bold text-slate-600">Awaiting:</span>
            <span className="text-xs font-extrabold text-orange-600">{pendingAcceptance.length}</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-white/80 backdrop-blur-md border border-amber-200/90 shadow-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-xs font-bold text-slate-600">Active Workflow:</span>
            <span className="text-xs font-extrabold text-amber-700">{activeWorkflow.length}</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-white/80 backdrop-blur-md border border-emerald-200/90 shadow-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#138808]" />
            <span className="text-xs font-bold text-slate-600">Completed:</span>
            <span className="text-xs font-extrabold text-[#138808]">{completedSolutions.length}</span>
          </div>
        </div>
      </div>

      {/* ── Tabs Navigation Bar with Liquid Glass & Indian Flag Theme ── */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/90 rounded-2xl p-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-1.5 items-center">
          {/* Tab 1: To Be Accepted */}
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-gradient-to-r from-orange-500 via-[#FF9933] to-amber-500 text-white shadow-md shadow-orange-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <span>📥 To Be Accepted</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'pending'
                  ? 'bg-white text-orange-700'
                  : 'bg-orange-100 text-orange-800 border border-orange-300'
              }`}
            >
              {pendingAcceptance.length}
            </span>
          </button>

          {/* Tab 2: Active Workflow */}
          <button
            onClick={() => setActiveTab('workflow')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'workflow'
                ? 'bg-gradient-to-r from-orange-500 via-[#FF9933] to-amber-500 text-white shadow-md shadow-orange-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <span>⚡ Active Workflow</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'workflow'
                  ? 'bg-white text-orange-700'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              {activeWorkflow.length}
            </span>
          </button>

          {/* Tab 3: Completed */}
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'completed'
                ? 'bg-gradient-to-r from-orange-500 via-[#FF9933] to-amber-500 text-white shadow-md shadow-orange-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <span>✅ Completed Redressals</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'completed'
                  ? 'bg-white text-orange-700'
                  : 'bg-emerald-100 text-[#138808] border border-emerald-300'
              }`}
            >
              {completedSolutions.length}
            </span>
          </button>

          {/* Tab 4: All Issues */}
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-gradient-to-r from-orange-500 via-[#FF9933] to-amber-500 text-white shadow-md shadow-orange-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <span>📋 All Assignments</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'all'
                  ? 'bg-white text-orange-700'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {allSorted.length}
            </span>
          </button>
        </div>

        {/* Search & Domain Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 w-44"
          />
          {domains.length > 0 && (
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/40 capitalize"
            >
              <option value="all">All Domains</option>
              {domains.map((d) => (
                <option key={d} value={d}>
                  {d.replace(/[-_]/g, ' ')}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ── Subtitle / Explanatory Bar for Active Tab ── */}
      <div className="flex items-center justify-between text-xs text-slate-600 px-1">
        <span className="font-semibold">
          {activeTab === 'pending' && '📥 Newly routed civic challenges awaiting official acceptance from your institution'}
          {activeTab === 'workflow' && '⚡ Accepted tickets undergoing field mobilization, execution, and proof submission'}
          {activeTab === 'completed' && '✅ Remediation reports submitted, under audit, and verified resolutions'}
          {activeTab === 'all' && '📋 Comprehensive log of all tickets assigned to your institution'}
        </span>
        <span className="text-slate-400 font-medium">Sorted: Latest to Oldest</span>
      </div>

      {/* ── Tickets List ── */}
      <div className="space-y-6">
        {currentTabTickets.map((ticket) => (
          <div key={ticket.id} className="space-y-2">
            <TicketCard
              ticket={ticket}
              viewMode="institution"
              actionsSlot={
                <div className="space-y-4">
                  {/* Dynamic Work Progress Status Bar */}
                  <DynamicWorkProgressStatus status={ticket.status} />

                  {/* ── ACTION 1: Accept Ticket Assignment (When Routed) ── */}
                  {ticket.status === 'routed' && (
                    <div className="p-4 rounded-xl bg-orange-50/70 border border-orange-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm sm:text-base font-extrabold text-orange-900">Assignment Ready for Acceptance</h4>
                        <p className="text-xs sm:text-sm text-orange-800 mt-0.5">
                          Confirm your institution's capacity to remediate this grievance within SLA guidelines.
                        </p>
                      </div>
                      <form
                        action={async () => {
                          setIsSubmitting(ticket.id)
                          await acceptTicket(ticket.id)
                          setIsSubmitting(null)
                        }}
                      >
                        <button
                          type="submit"
                          disabled={isSubmitting === ticket.id}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#138808] hover:bg-green-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-green-700/20 transition-all border border-green-600 shrink-0 disabled:opacity-50"
                        >
                          <span>🤝</span>
                          <span>{isSubmitting === ticket.id ? 'Accepting...' : 'Accept Ticket Assignment'}</span>
                        </button>
                      </form>
                    </div>
                  )}

                  {/* ── ACTION 2: Begin Field Work (When Accepted) ── */}
                  {ticket.status === 'accepted' && (
                    <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm sm:text-base font-extrabold text-amber-950">Team Mobilization</h4>
                        <p className="text-xs sm:text-sm text-amber-800 mt-0.5">
                          Advance ticket to "In Progress" once engineering or inspection personnel arrive on site.
                        </p>
                      </div>
                      <form
                        action={async () => {
                          setIsSubmitting(ticket.id)
                          await startTicket(ticket.id)
                          setIsSubmitting(null)
                        }}
                      >
                        <button
                          type="submit"
                          disabled={isSubmitting === ticket.id}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all border border-orange-500 shrink-0 disabled:opacity-50"
                        >
                          <span>🚀</span>
                          <span>{isSubmitting === ticket.id ? 'Advancing...' : 'Begin Field Remediation'}</span>
                        </button>
                      </form>
                    </div>
                  )}

                  {/* ── ACTION 3: Completion Report Submission Form (In Progress or Accepted) ── */}
                  {(ticket.status === 'in_progress' || ticket.status === 'accepted') && (
                    <form
                      action={async (formData: FormData) => {
                        setIsSubmitting(ticket.id)
                        await completeTicket(ticket.id, formData)
                        setIsSubmitting(null)
                      }}
                      className="border border-emerald-200/80 rounded-2xl p-5 bg-white/95 backdrop-blur-xl shadow-sm space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#138808]" />
                          <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
                            Submit Work Completion Report & Team Credits
                          </h4>
                        </div>
                        <span className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full">
                          Workflow Step 4
                        </span>
                      </div>

                      {/* Remediation description */}
                      <div>
                        <label className="text-xs sm:text-sm font-bold text-slate-700 block mb-1.5">
                          Remediation Details & Remedial Action Taken <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          name="completion_notes"
                          required
                          placeholder="Provide a comprehensive description of the solution implemented (e.g., pipeline replaced, street fixture re-wired, drainage desilted, water sample lab certified)..."
                          className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none h-24 leading-relaxed"
                        />
                      </div>

                      {/* Team personnel & roles */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs sm:text-sm font-bold text-slate-700 block mb-1.5">
                            👷 Team Personnel Names <span className="text-slate-400 font-normal text-xs">(comma-separated)</span>
                          </label>
                          <input
                            name="worker_names"
                            placeholder="e.g. Dr. Ramesh Kumar, Sunita Soren"
                            className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                          />
                        </div>
                        <div>
                          <label className="text-xs sm:text-sm font-bold text-slate-700 block mb-1.5">
                            🏷️ Professional Roles <span className="text-slate-400 font-normal text-xs">(comma-separated)</span>
                          </label>
                          <input
                            name="worker_roles"
                            placeholder="e.g. Lead Environmental Engineer, Field Researcher"
                            className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                          />
                        </div>
                      </div>

                      {/* Proof File Attachment */}
                      <div>
                        <label className="text-xs sm:text-sm font-bold text-slate-700 block mb-1.5">
                          📸 Remediation Evidence / Inspection Certificate <span className="text-slate-400 font-normal text-xs">(optional)</span>
                        </label>
                        <input
                          type="file"
                          name="proof"
                          accept="image/*,application/pdf"
                          className="w-full text-xs sm:text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-orange-50 file:text-orange-800 file:font-bold hover:file:bg-orange-100 cursor-pointer"
                        />
                      </div>

                      {/* Submit Button */}
                      <div className="flex items-center justify-between pt-2">
                        <p className="text-xs sm:text-sm text-slate-500">
                          Submitting transitions ticket to <strong className="text-teal-700">Under Government Audit</strong>.
                        </p>
                        <button
                          type="submit"
                          disabled={isSubmitting === ticket.id}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#138808] hover:bg-green-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-green-700/20 transition-all border border-green-600 disabled:opacity-50"
                        >
                          <span>📤</span>
                          <span>{isSubmitting === ticket.id ? 'Submitting Report...' : 'Submit Completion Report'}</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* ── STATUS DISPLAY: When under review or completed ── */}
                  {ticket.status === 'piloting' && (
                    <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-between gap-3 text-xs sm:text-sm">
                      <div className="flex items-center gap-2 text-teal-900 font-bold">
                        <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse" />
                        <span>Completion Report Filed · Awaiting State Administrative Verification</span>
                      </div>
                      <span className="text-teal-800 font-bold text-xs bg-teal-100/70 border border-teal-200 px-2.5 py-1 rounded-md">Audit Pending</span>
                    </div>
                  )}

                  {(ticket.status === 'verified' || ticket.status === 'closed') && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-xs sm:text-sm">
                      <div className="flex items-center gap-2 text-emerald-950 font-extrabold">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#138808]" />
                        <span>✓ Remediation Officially Verified and Credited to Institution</span>
                      </div>
                      <span className="text-[#138808] font-bold text-xs bg-emerald-100/70 border border-emerald-200 px-2.5 py-1 rounded-md">Redressed</span>
                    </div>
                  )}
                </div>
              }
            />
          </div>
        ))}

        {/* ── Empty State ── */}
        {currentTabTickets.length === 0 && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-12 text-center space-y-3 border border-slate-200/80 shadow-xs">
            <div className="w-14 h-14 mx-auto rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center text-2xl shadow-xs">
              {activeTab === 'pending' ? '📥' : activeTab === 'workflow' ? '⚡' : activeTab === 'completed' ? '✅' : '🏛️'}
            </div>
            <h3 className="text-base font-extrabold text-slate-900">
              {activeTab === 'pending' && 'No Tickets Awaiting Acceptance'}
              {activeTab === 'workflow' && 'No Active Work In Progress'}
              {activeTab === 'completed' && 'No Completed Tickets Yet'}
              {activeTab === 'all' && 'No Tickets Assigned'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              {activeTab === 'pending' && 'All routed assignments have been processed. New civic assignments from the state command center will appear here.'}
              {activeTab === 'workflow' && 'There are currently no tickets actively being worked on. Accept new tickets from the "To Be Accepted" tab to begin field work.'}
              {activeTab === 'completed' && 'Remediation reports and verified solutions will appear here once audited by state authorities.'}
              {activeTab === 'all' && 'No tickets have been assigned to your institution yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
