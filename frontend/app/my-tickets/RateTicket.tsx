'use client'
import { useState } from 'react'

export function RateTicket({ ticketId }: { ticketId: number }) {
  const [score, setScore] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!score) { setError('Please select a rating'); return }
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
        setError(data.detail || 'Failed to submit rating')
      }
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-sm text-emerald-300">
        ⭐ Thank you for your feedback! (Rated {score}/5)
      </div>
    )
  }

  return (
    <div className="border border-indigo-500/20 rounded-xl p-4 bg-indigo-500/5 space-y-3">
      <h4 className="text-sm font-bold text-indigo-300">⭐ Rate this Resolution</h4>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setScore(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className={`text-2xl transition-transform hover:scale-110 ${
              star <= (hover || score) ? 'text-yellow-400' : 'text-slate-600'
            }`}
          >
            ★
          </button>
        ))}
        {score > 0 && <span className="ml-2 text-sm text-slate-400 self-center">{score}/5</span>}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Any comments about the resolution? (optional)"
        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none h-16"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={submitting || !score}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600/80 text-white text-sm font-semibold rounded-xl hover:bg-indigo-600 transition-all border border-indigo-500/40 disabled:opacity-50 disabled:pointer-events-none"
      >
        {submitting ? 'Submitting...' : 'Submit Rating'}
      </button>
    </div>
  )
}
