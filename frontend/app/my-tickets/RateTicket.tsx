'use client'

import { useState } from 'react'

export function RateTicket({ ticketId }: { ticketId: number }) {
  const [score, setScore] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const RATING_LABELS = ['', 'Poor', 'Fair', 'Satisfactory', 'Very Good', 'Outstanding Resolution']

  const handleSubmit = async () => {
    if (!score) {
      setError('Please select a star rating.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/proxy/rate/${ticketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, comment }),
      })
      if (res.ok) {
        setSubmitted(true)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.detail || 'Failed to submit rating.')
      }
    } catch {
      setError('Network error while submitting rating.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="p-4 rounded-xl bg-green-50 border border-green-300 text-xs sm:text-sm text-green-800 flex items-center gap-2.5">
        <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          <strong>Thank you for verifying!</strong> Your rating ({score}/5) has updated the institution&apos;s state reputation score.
        </span>
      </div>
    )
  }

  return (
    <div className="border border-orange-200/80 rounded-xl p-4 bg-orange-50/40 backdrop-blur-md space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <span className="text-amber-500">★</span>
          <span>Rate Resolution Quality & Citizen Satisfaction</span>
        </h4>
        {(hover > 0 || score > 0) && (
          <span className="text-xs font-semibold text-orange-700 bg-orange-100/80 px-2 py-0.5 rounded-md">
            {RATING_LABELS[hover || score]} ({hover || score}/5)
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const active = star <= (hover || score)
          return (
            <button
              key={star}
              type="button"
              onClick={() => setScore(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              className="p-1 focus:outline-none transition-transform hover:scale-125"
              aria-label={`Rate ${star} star`}
            >
              <svg
                className={`w-6 h-6 transition-colors ${
                  active ? 'text-amber-400 fill-amber-400' : 'text-slate-300 fill-transparent'
                }`}
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                />
              </svg>
            </button>
          )
        })}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Provide public feedback on work quality, completion speed, or notes for the department..."
        rows={2}
        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-600 focus:border-transparent resize-none shadow-sm"
      />

      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || !score}
        className="inline-flex items-center gap-2 px-4 py-2 bg-[#138808] hover:bg-green-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Submitting...' : 'Submit Citizen Verification Rating'}
      </button>
    </div>
  )
}