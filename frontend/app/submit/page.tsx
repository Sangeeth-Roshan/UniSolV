'use client'

import React, { useState, useRef } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import the map to avoid SSR issues with Leaflet
const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] w-full rounded-xl bg-slate-900/50 border border-white/10 flex flex-col items-center justify-center text-slate-500 animate-pulse">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 9m0 8V9m0 0L9 7" /></svg>
      Loading map interface...
    </div>
  )
})

interface SubmitResult {
  ticket_id: number
  domain: string
  cluster_id: number | null
  needs_human_review: boolean
  transcription: string
}

function parseErrorMessage(detail: unknown): string {
  if (!detail) return "Server error occurred during submission."
  if (typeof detail === "string") return detail
  if (Array.isArray(detail)) {
    return detail.map((item) => {
      if (typeof item === "string") return item
      if (item && typeof item === "object") {
        const loc = Array.isArray(item.loc) ? `${item.loc.slice(-1)[0]}: ` : ""
        return `${loc}${item.msg || JSON.stringify(item)}`
      }
      return String(item)
    }).join("; ")
  }
  if (typeof detail === "object" && detail !== null) {
    const obj = detail as Record<string, unknown>
    return String(obj.message || obj.msg || obj.detail || JSON.stringify(detail))
  }
  return String(detail)
}

export default function SubmitPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [consent, setConsent] = useState(false)
  const [lat, setLat] = useState<string>('')
  const [lng, setLng] = useState<string>('')

  // Validation state
  const [errors, setErrors] = useState<{title?: string, consent?: string, description?: string}>({})

  // Audio state
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)

  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  const handleGetLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude.toString())
          setLng(position.coords.longitude.toString())
        },
        () => setServerError("Could not detect location. Please click on the map instead.")
      )
    } else {
      setServerError("Geolocation is not supported by your browser.")
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      timerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000)
    } catch {
      setServerError("Microphone access denied.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)
    setErrors({})
    
    // Validation
    const newErrors: {title?: string, description?: string, consent?: string} = {}
    if (!title.trim()) newErrors.title = "Title is required. Please briefly describe the issue."
    if (!description.trim()) newErrors.description = "Detailed description is required for AI classification."
    if (!consent) newErrors.consent = "You must acknowledge the public-good licensing terms."
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setSubmitting(true)
    const formData = new FormData()
    formData.append('title', title)
    formData.append('description', description)
    formData.append('public_good_consent', 'true')

    if (lat && lng) {
      formData.append('lat', lat)
      formData.append('lng', lng)
    }
    if (audioBlob) formData.append('audio', audioBlob, 'recording.webm')
    if (mediaFile) formData.append('media', mediaFile)

    try {
      const res = await fetch('/api/proxy/tickets', { method: 'POST', body: formData })
      if (res.ok) {
        setSubmitResult(await res.json())
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        const body = await res.json().catch(() => ({}))
        const errorMsg = parseErrorMessage(body.detail || body.message)
        setServerError(errorMsg)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch {
      setServerError('Network error. Please ensure the backend is running.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setConsent(false)
    setLat('')
    setLng('')
    setAudioBlob(null)
    setAudioUrl(null)
    setMediaFile(null)
    setSubmitResult(null)
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-500/20 mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-3">Report a Civic Issue</h1>
        <p className="text-slate-400 max-w-xl mx-auto text-base">
          Help improve your community. Describe the problem, mark the location, and our AI will route it to the exact department responsible.
        </p>
      </div>

      {/* ── Server Error ── */}
      {serverError && (
        <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h4 className="text-sm font-bold text-red-400 mb-1">Submission Failed</h4>
            <p className="text-sm text-red-300/80">{serverError}</p>
          </div>
        </div>
      )}

      {/* ── Success State ── */}
      {submitResult ? (
        <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-10 text-center animate-fade-in-up">
          <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-2xl shadow-emerald-500/30 mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-3">Ticket #{submitResult.ticket_id} Submitted!</h2>
          <p className="text-slate-400 max-w-md mx-auto mb-8">
            Your issue has been successfully logged. Our AI has already begun processing it.
          </p>
          
          <div className="grid sm:grid-cols-2 gap-4 text-left max-w-lg mx-auto mb-10">
            <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/5">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Assigned Domain</div>
              <div className="font-semibold text-emerald-400">{submitResult.domain || 'Processing...'}</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/5">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Cluster / Impact</div>
              <div className="font-semibold text-white">{submitResult.cluster_id ? `#${submitResult.cluster_id} (Hotspot)` : 'Isolated Issue'}</div>
            </div>
            {submitResult.transcription && (
              <div className="col-span-2 p-4 rounded-2xl bg-slate-950/50 border border-white/5">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Voice Transcription</div>
                <div className="text-sm text-slate-300 font-mono">&quot;{submitResult.transcription}&quot;</div>
              </div>
            )}
          </div>

          <div className="flex justify-center gap-4">
            <a href="/my-tickets" className="px-6 py-3 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700 transition-colors">
              Track Status
            </a>
            <button onClick={resetForm} className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold shadow-lg shadow-indigo-500/25 hover:scale-105 transition-all">
              Submit Another
            </button>
          </div>
        </div>
      ) : (
        /* ── Submission Form ── */
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl">
            
            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="flex text-sm font-bold text-white mb-2">
                  Issue Title <span className="text-red-400 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Broken water pipe on MG Road causing flooding"
                  className={`w-full bg-slate-950 border ${errors.title ? 'border-red-500 focus:ring-red-500/50' : 'border-white/10 focus:border-indigo-500/50 focus:ring-indigo-500/50'} rounded-xl px-5 py-3.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 transition-all`}
                />
                {errors.title && <p className="mt-2 text-sm text-red-400">{errors.title}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="flex text-sm font-bold text-white mb-2">
                  Detailed Description <span className="text-red-400 ml-1">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue in detail (location landmarks, severity, what happened)..."
                  className={`w-full bg-slate-950 border ${errors.description ? 'border-red-500 focus:ring-red-500/50' : 'border-white/10 focus:border-indigo-500/50 focus:ring-indigo-500/50'} rounded-xl px-5 py-3.5 h-32 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 transition-all resize-none`}
                />
                {errors.description && <p className="mt-2 text-sm text-red-400">{errors.description}</p>}
              </div>

              {/* Media & Voice Row */}
              <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                
                {/* Voice */}
                <div>
                  <label className="flex text-sm font-bold text-white mb-2">
                    Voice Note <span className="text-slate-500 ml-2 font-medium">(Optional)</span>
                  </label>
                  <p className="text-xs text-slate-400 mb-3">Speak in any language. Our AI will transcribe and translate it automatically.</p>
                  
                  {!isRecording ? (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={startRecording}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors font-semibold text-sm"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        Tap to Record
                      </button>
                      {audioUrl && <audio src={audioUrl} controls className="h-10 max-w-[180px]" />}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors font-semibold text-sm w-full sm:w-auto justify-center"
                    >
                      <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                      Stop Recording ({formatTime(recordingTime)})
                    </button>
                  )}
                </div>

                {/* Photo */}
                <div>
                  <label className="flex text-sm font-bold text-white mb-2">
                    Photo / Evidence <span className="text-slate-500 ml-2 font-medium">(Optional)</span>
                  </label>
                  <p className="text-xs text-slate-400 mb-3">Upload a picture of the issue to help teams assess severity.</p>
                  
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex items-center gap-3 px-5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-sm hover:bg-slate-700 transition-colors cursor-pointer">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      {mediaFile ? mediaFile.name : 'Upload Photo'}
                    </div>
                  </div>
                </div>

              </div>

              {/* Map Location */}
              <div className="pt-4 border-t border-white/5">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <label className="flex text-sm font-bold text-white mb-1">
                      Pinpoint Location
                    </label>
                    <p className="text-xs text-slate-400">Click on the map to set the exact coordinates of the issue.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-semibold transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Use my location
                  </button>
                </div>
                
                <LocationPicker 
                  lat={lat} 
                  lng={lng} 
                  onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng) }} 
                />
                
                {lat && lng && (
                  <div className="mt-3 flex gap-4 text-xs font-mono text-slate-400 bg-slate-950/50 p-2.5 rounded-lg border border-white/5 inline-block">
                    <span>Lat: <span className="text-white">{parseFloat(lat).toFixed(6)}</span></span>
                    <span>Lng: <span className="text-white">{parseFloat(lng).toFixed(6)}</span></span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Consent & Submit */}
          <div className="space-y-6">
            <div className={`flex items-start gap-3 p-5 rounded-2xl border ${errors.consent ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-900/60 border-slate-800'}`}>
              <div className="pt-0.5">
                <input
                  type="checkbox"
                  id="consent"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-900 accent-indigo-500 cursor-pointer"
                />
              </div>
              <div>
                <label htmlFor="consent" className="text-sm text-slate-300 leading-relaxed font-medium cursor-pointer block">
                  I acknowledge that solutions arising from this report default to open / public-good licensing unless a participating industry partner negotiates otherwise. <span className="text-red-400">*</span>
                </label>
                {errors.consent && <p className="mt-1 text-sm text-red-400 font-medium">{errors.consent}</p>}
              </div>
            </div>

            {serverError && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-300 text-sm">
                <span className="text-base">⚠️</span>
                <span>{serverError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full relative flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-extrabold text-lg shadow-xl shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:scale-[1.02] transition-all disabled:opacity-70 disabled:pointer-events-none disabled:scale-100 overflow-hidden group"
            >
              {/* Shine effect */}
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
              
              {submitting ? (
                <>
                  <span className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing via AI Engine...
                </>
              ) : (
                <>
                  Submit Ticket
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
