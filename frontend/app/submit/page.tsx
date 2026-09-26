'use client'

import React, { useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import the map to avoid SSR issues with Leaflet
const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] w-full rounded-xl bg-slate-100/50 border border-slate-300 flex flex-col items-center justify-center text-slate-500 animate-pulse">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 9m0 8V9m0 0L9 7" />
      </svg>
      Loading Jharkhand map interface...
    </div>
  ),
})

interface SubmitResult {
  ticket_id: number
  domain: string
  cluster_id: number | null
  needs_human_review: boolean
  transcription?: string
  transcription_english?: string
  transcription_hindi?: string
  contact_phone?: string
}

function parseErrorMessage(detail: unknown): string {
  if (!detail) return 'Server error occurred during submission.'
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') {
          const loc = Array.isArray(item.loc) ? `${item.loc.slice(-1)[0]}: ` : ''
          return `${loc}${item.msg || JSON.stringify(item)}`
        }
        return String(item)
      })
      .join('; ')
  }
  if (typeof detail === 'object' && detail !== null) {
    const obj = detail as Record<string, unknown>
    return String(obj.message || obj.msg || obj.detail || JSON.stringify(detail))
  }
  return String(detail)
}

// Client-side translation helper with multiple fallback options
async function translateTextOnline(text: string, targetLang: 'hi' | 'en'): Promise<string> {
  const trimmed = text.trim()
  if (!trimmed) return ''

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(trimmed)}`
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      const translated = (data[0] || []).map((part: any) => part[0]).join('')
      if (translated) return translated
    }
  } catch (err) {
    // Fallback to secondary endpoint
  }

  try {
    const pair = targetLang === 'hi' ? 'auto|hi' : 'auto|en'
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${pair}`)
    if (res.ok) {
      const data = await res.json()
      if (data?.responseData?.translatedText) {
        return data.responseData.translatedText
      }
    }
  } catch (err) {
    // Ignore fallback error
  }

  return trimmed
}

export default function SubmitPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [consent, setConsent] = useState(false)
  const [lat, setLat] = useState<string>('')
  const [lng, setLng] = useState<string>('')

  // Validation state
  const [errors, setErrors] = useState<{ title?: string; description?: string; consent?: string; location?: string; phone?: string }>({})

  // Audio & Speech Recognition state
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [speechLanguage, setSpeechLanguage] = useState<'hi-IN' | 'en-IN'>('hi-IN')
  const [liveTranscript, setLiveTranscript] = useState('')
  const [spokenRawText, setSpokenRawText] = useState('')
  const [englishTranslation, setEnglishTranslation] = useState('')
  const [hindiTranslation, setHindiTranslation] = useState('')
  const [isTranslating, setIsTranslating] = useState(false)

  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const recognitionRef = useRef<any>(null)

  const handleGetLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude
          const userLng = position.coords.longitude
          if (userLat >= 21.90 && userLat <= 25.40 && userLng >= 83.20 && userLng <= 87.90) {
            setLat(userLat.toFixed(6))
            setLng(userLng.toFixed(6))
            setServerError(null)
          } else {
            setServerError('Your detected location is outside Jharkhand. UniSolV is currently active in Jharkhand. Please choose a location within Jharkhand using the search bar or map.')
          }
        },
        () => setServerError('Could not detect location. Please search or click on the map instead.')
      )
    } else {
      setServerError('Geolocation is not supported by your browser.')
    }
  }

  // Dual translation handler
  const processBilingualTranslation = async (rawText: string) => {
    if (!rawText.trim()) return
    setIsTranslating(true)
    try {
      const [hi, en] = await Promise.all([
        translateTextOnline(rawText, 'hi'),
        translateTextOnline(rawText, 'en'),
      ])
      setHindiTranslation(hi || rawText)
      setEnglishTranslation(en || rawText)

      // If description is empty, automatically append bilingual summary
      setDescription((prev) => {
        if (!prev.trim()) {
          return `[Voice Note - English]: ${en || rawText}\n[Voice Note - हिन्दी]: ${hi || rawText}`
        }
        return prev
      })
    } catch (err) {
      console.error('Translation error:', err)
    } finally {
      setIsTranslating(false)
    }
  }

  const startRecording = async () => {
    setLiveTranscript('')
    setSpokenRawText('')
    setEnglishTranslation('')
    setHindiTranslation('')

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
      timerRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000)

      // Start Web Speech Recognition if supported
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition()
          recognition.continuous = true
          recognition.interimResults = true
          recognition.lang = speechLanguage

          let fullTranscript = ''

          recognition.onresult = (event: any) => {
            let interim = ''
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                fullTranscript += event.results[i][0].transcript + ' '
              } else {
                interim += event.results[i][0].transcript
              }
            }
            const currentCombined = (fullTranscript + interim).trim()
            setLiveTranscript(currentCombined)
          }

          recognition.onerror = (e: any) => {
            console.warn('Speech recognition error/warning:', e.error)
          }

          recognition.start()
          recognitionRef.current = recognition
        } catch (recErr) {
          console.warn('Could not start speech recognition:', recErr)
        }
      }
    } catch {
      setServerError('Microphone access denied or unavailable.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {
        // Ignore
      }
      recognitionRef.current = null
    }

    // Capture final spoken text and trigger translation
    const finalSpoken = liveTranscript.trim()
    if (finalSpoken) {
      setSpokenRawText(finalSpoken)
      processBilingualTranslation(finalSpoken)
    }
  }

  const insertBilingualToDescription = () => {
    const textToInsert = `[Voice Note - English]: ${englishTranslation || spokenRawText}\n[Voice Note - हिन्दी]: ${hindiTranslation || spokenRawText}`
    setDescription((prev) => {
      if (prev.includes(englishTranslation) || prev.includes(hindiTranslation)) {
        return prev
      }
      return prev ? `${prev}\n\n${textToInsert}` : textToInsert
    })
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)
    setErrors({})

    // Validation
    const effectiveDesc = description.trim() || englishTranslation.trim() || hindiTranslation.trim()
    const newErrors: { title?: string; description?: string; consent?: string; phone?: string } = {}
    if (!title.trim()) newErrors.title = 'Title is required. Please briefly describe the issue.'
    if (!effectiveDesc) newErrors.description = 'Detailed description or voice note is required for AI classification.'
    
    // Mobile number validation
    const digitsOnly = contactPhone.replace(/\D/g, '')
    if (!contactPhone.trim()) {
      newErrors.phone = 'Mobile number is required so officers and resolution teams can contact you.'
    } else if (digitsOnly.length < 10 || (digitsOnly.length > 10 && !contactPhone.includes('+') && digitsOnly.length > 12)) {
      newErrors.phone = 'Please enter a valid 10-digit mobile number (e.g. 98765 43210).'
    }

    if (!consent) newErrors.consent = 'You must acknowledge the public-good licensing terms.'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setSubmitting(true)
    const formData = new FormData()
    formData.append('title', title)
    formData.append('description', effectiveDesc)
    formData.append('public_good_consent', 'true')

    // Clean and format phone for submission
    let formattedPhone = contactPhone.trim()
    if (digitsOnly.length === 10) {
      formattedPhone = `+91 ${digitsOnly.slice(0, 5)} ${digitsOnly.slice(5)}`
    } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
      formattedPhone = `+91 ${digitsOnly.slice(2, 7)} ${digitsOnly.slice(7)}`
    }
    formData.append('contact_phone', formattedPhone)

    if (englishTranslation) formData.append('transcription_english', englishTranslation)
    if (hindiTranslation) formData.append('transcription_hindi', hindiTranslation)

    if (lat && lng) {
      const pLat = parseFloat(lat)
      const pLng = parseFloat(lng)
      if (isNaN(pLat) || isNaN(pLng) || pLat < 21.90 || pLat > 25.40 || pLng < 83.20 || pLng > 87.90) {
        setServerError('The selected location must be strictly within Jharkhand state (21.90°N - 25.40°N, 83.20°E - 87.90°E).')
        window.scrollTo({ top: 0, behavior: 'smooth' })
        setSubmitting(false)
        return
      }
      formData.append('lat', lat)
      formData.append('lng', lng)
    }
    if (audioBlob) formData.append('audio', audioBlob, 'recording.webm')
    if (mediaFile) formData.append('media', mediaFile)

    try {
      const res = await fetch('/api/proxy/tickets', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        setSubmitResult({
          ...data,
          transcription_english: englishTranslation || data.transcription_english || data.transcription,
          transcription_hindi: hindiTranslation || data.transcription_hindi,
          contact_phone: formattedPhone || data.contact_phone,
        })
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
    setContactPhone('')
    setConsent(false)
    setLat('')
    setLng('')
    setAudioBlob(null)
    setAudioUrl(null)
    setLiveTranscript('')
    setSpokenRawText('')
    setEnglishTranslation('')
    setHindiTranslation('')
    setMediaFile(null)
    setSubmitResult(null)
  }

  return (
    <div className="max-w-3xl mx-auto pb-12 relative z-10">
<div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center opacity-[0.03]">
  <img src="https://upload.wikimedia.org/wikipedia/commons/1/17/Ashoka_Chakra.svg" alt="Ashoka Chakra" className="w-[800px] h-[800px]" />
</div>
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-xl shadow-orange-500/20 mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">Report a Civic Issue</h1>
        <p className="text-slate-600 max-w-xl mx-auto text-base">
          Help improve your community in Jharkhand. Describe the problem in Hindi or English, mark the location, and our AI will route it to the exact department responsible.
        </p>
      </div>

      {/* ── Server Error ── */}
      {serverError && (
        <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 animate-fade-in">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h4 className="text-sm font-bold text-red-400 mb-1">Notice</h4>
            <p className="text-sm text-red-300/80">{serverError}</p>
          </div>
        </div>
      )}

      {/* ── Success State ── */}
      {submitResult ? (
        <div className="rounded-3xl bg-white border border-slate-200 p-10 text-center animate-fade-in-up">
          <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-2xl shadow-green-500/30 mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 mb-3">Ticket #{submitResult.ticket_id} Submitted!</h2>
          <p className="text-slate-600 max-w-md mx-auto mb-8">
            Your issue has been successfully logged and processed by the AI routing system.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 text-left max-w-lg mx-auto mb-10">
            <div className="p-4 rounded-2xl bg-white border border-slate-200">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Assigned Domain</div>
              <div className="font-semibold text-green-700">{submitResult.domain || 'Processing...'}</div>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Cluster / Impact</div>
              <div className="font-semibold text-slate-900">{submitResult.cluster_id ? `#${submitResult.cluster_id} (Hotspot)` : 'Isolated Issue'}</div>
            </div>

            {/* Bilingual Voice Interpretation in Success Screen */}
            {(submitResult.transcription_english || submitResult.transcription_hindi || submitResult.transcription) && (
              <div className="col-span-2 p-4 rounded-2xl bg-white border border-orange-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-orange-600 uppercase tracking-widest flex items-center gap-1.5">
                    <span>🎙️</span> Bilingual Voice Interpretation
                  </span>
                  <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">AI Interpreted</span>
                </div>

                {submitResult.transcription_english && (
                  <div className="text-sm bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-xs font-semibold text-orange-700 block mb-0.5">🇬🇧 English Translation:</span>
                    <span className="text-slate-800">{submitResult.transcription_english}</span>
                  </div>
                )}

                {submitResult.transcription_hindi && (
                  <div className="text-sm bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-xs font-semibold text-green-800 block mb-0.5">🇮🇳 हिन्दी अनुवाद (Hindi):</span>
                    <span className="text-slate-800">{submitResult.transcription_hindi}</span>
                  </div>
                )}

                {!submitResult.transcription_english && !submitResult.transcription_hindi && submitResult.transcription && (
                  <div className="text-sm bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-xs font-semibold text-slate-600 block mb-0.5">Voice Transcription:</span>
                    <span className="text-slate-700 font-mono">&quot;{submitResult.transcription}&quot;</span>
                  </div>
                )}
              </div>
            )}

            {submitResult.contact_phone && (
              <div className="col-span-2 p-4 rounded-2xl bg-white border border-orange-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                    <span>📱</span> Citizen Contact Number
                  </div>
                  <div className="font-semibold text-orange-700 font-mono text-sm">{submitResult.contact_phone}</div>
                </div>
                <span className="text-[11px] text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full font-medium">
                  Attached to Ticket
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-center gap-4">
            <a href="/my-tickets" className="px-6 py-3 rounded-xl bg-slate-100 text-slate-900 font-semibold hover:bg-slate-700 transition-colors">
              Track Status
            </a>
            <button onClick={resetForm} className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-green-600 text-slate-900 font-bold shadow-lg shadow-indigo-500/25 hover:scale-105 transition-all">
              Submit Another
            </button>
          </div>
        </div>
      ) : (
        /* ── Submission Form ── */
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-xl">
            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="flex text-sm font-bold text-slate-900 mb-2">
                  Issue Title <span className="text-red-400 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Broken water pipe on Main Road, Ranchi causing flooding"
                  className={`w-full bg-slate-50 border ${
                    errors.title ? 'border-red-500 focus:ring-red-500/50' : 'border-slate-300 focus:border-orange-500 focus:ring-orange-500/50'
                  } rounded-xl px-5 py-3.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all`}
                />
                {errors.title && <p className="mt-2 text-sm text-red-400">{errors.title}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="flex text-sm font-bold text-slate-900 mb-2">
                  Detailed Description <span className="text-red-400 ml-1">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue in detail (location landmarks, severity, what happened). You can also speak using the Voice Note below to auto-fill this in Hindi & English..."
                  className={`w-full bg-slate-50 border ${
                    errors.description ? 'border-red-500 focus:ring-red-500/50' : 'border-slate-300 focus:border-orange-500 focus:ring-orange-500/50'
                  } rounded-xl px-5 py-3.5 h-32 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all resize-none`}
                />
                {errors.description && <p className="mt-2 text-sm text-red-400">{errors.description}</p>}
              </div>

              {/* Citizen Contact Mobile Number */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex text-sm font-bold text-slate-900 items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>Contact Mobile Number / संपर्क मोबाइल नंबर</span>
                    <span className="text-red-400 ml-1">*</span>
                  </label>
                  <span className="text-[11px] text-slate-600">For updates & verification</span>
                </div>

                <div className={`flex rounded-xl overflow-hidden border transition-all focus-within:ring-2 bg-slate-50 ${
                  errors.phone ? 'border-red-500 focus-within:ring-red-500/50' : 'border-slate-300 focus-within:border-orange-500 focus-within:ring-orange-500/50'
                }`}>
                  <div className="flex items-center gap-1.5 px-3.5 bg-slate-100 border-r border-slate-300 text-slate-700 font-semibold text-sm select-none shrink-0">
                    <span>🇮🇳</span>
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^\d\s-]/g, '')
                      setContactPhone(val)
                      if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }))
                    }}
                    placeholder="e.g. 98765 43210"
                    maxLength={14}
                    className="w-full bg-transparent px-4 py-3.5 text-slate-900 placeholder-slate-400 focus:outline-none text-sm font-medium"
                  />
                </div>
                {errors.phone ? (
                  <p className="mt-2 text-sm text-red-400 flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>{errors.phone}</span>
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-slate-500">
                    Field officers and the assigned institution team will contact you on this number for location clarification or resolution status.
                  </p>
                )}
              </div>

              {/* Media & Voice Row */}
              <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                {/* Voice Note Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <span>🎙️ Voice Note</span>
                      <span className="text-slate-500 font-medium text-xs">(Bilingual Translation)</span>
                    </label>
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-lg p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setSpeechLanguage('hi-IN')}
                        className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                          speechLanguage === 'hi-IN' ? 'bg-orange-600 text-slate-900' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        हिन्दी
                      </button>
                      <button
                        type="button"
                        onClick={() => setSpeechLanguage('en-IN')}
                        className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                          speechLanguage === 'en-IN' ? 'bg-orange-600 text-slate-900' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        English
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600">
                    Speak in Hindi or English. Our AI will automatically transcribe and translate your report into both languages.
                  </p>

                  {!isRecording ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={startRecording}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-100 text-orange-700 border border-orange-300 hover:bg-orange-200 transition-all font-semibold text-sm shadow-sm hover:scale-[1.02]"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        <span>{spokenRawText ? 'Re-record Voice Note' : 'Record Voice Note'}</span>
                      </button>

                      {audioUrl && <audio src={audioUrl} controls className="h-9 max-w-[190px]" />}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-colors font-semibold text-sm w-full justify-center shadow-lg"
                      >
                        <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                        <span>Stop & Interpret ({formatTime(recordingTime)})</span>
                      </button>

                      {/* Live spoken preview */}
                      {liveTranscript && (
                        <div className="p-2.5 rounded-xl bg-white border border-orange-200 text-xs text-orange-800">
                          <span className="text-slate-600 font-semibold mr-1.5">Listening:</span>
                          <span className="italic">{liveTranscript}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Translating Indicator */}
                  {isTranslating && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-700 animate-pulse">
                      <span className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      <span>Interpreting and translating speech into Hindi & English...</span>
                    </div>
                  )}

                  {/* Bilingual Interpretation Card */}
                  {(englishTranslation || hindiTranslation || spokenRawText) && !isRecording && (
                    <div className="p-3.5 rounded-2xl bg-white border border-orange-300 shadow-lg space-y-2.5 animate-fade-in">
                      <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-200">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="text-green-700">✓</span> Voice Transcribed & Translated
                        </span>
                        <button
                          type="button"
                          onClick={insertBilingualToDescription}
                          className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-lg border border-orange-200 transition-all flex items-center gap-1"
                        >
                          <span>✨</span>
                          <span>Insert into Description</span>
                        </button>
                      </div>

                      {/* English Display */}
                      <div className="text-xs bg-white p-2.5 rounded-xl border border-slate-200">
                        <div className="font-semibold text-orange-700 mb-0.5 flex items-center gap-1">
                          <span>🇬🇧</span>
                          <span>English Interpretation:</span>
                        </div>
                        <p className="text-slate-800 leading-relaxed">{englishTranslation || spokenRawText}</p>
                      </div>

                      {/* Hindi Display */}
                      <div className="text-xs bg-white p-2.5 rounded-xl border border-slate-200">
                        <div className="font-semibold text-green-800 mb-0.5 flex items-center gap-1">
                          <span>🇮🇳</span>
                          <span>हिन्दी अनुवाद (Hindi):</span>
                        </div>
                        <p className="text-slate-800 leading-relaxed">{hindiTranslation || spokenRawText}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Photo / Evidence Upload */}
                <div>
                  <label className="flex text-sm font-bold text-slate-900 mb-2">
                    Photo / Evidence <span className="text-slate-500 ml-2 font-medium">(Optional)</span>
                  </label>
                  <p className="text-xs text-slate-600 mb-3">Upload a picture of the issue to help teams assess severity.</p>

                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex items-center gap-3 px-5 py-2.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-700 transition-colors cursor-pointer">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {mediaFile ? mediaFile.name : 'Upload Photo'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Map Location Section (Jharkhand) */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <label className="text-sm font-bold text-slate-900">Incident Location (Jharkhand)</label>
                      <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                        Jharkhand Only
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">Search an address or landmark, enter coordinates, or click on the map.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-semibold transition-colors shrink-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Use my location
                  </button>
                </div>

                <LocationPicker lat={lat} lng={lng} onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng) }} />
              </div>
            </div>
          </div>

          {/* Consent & Submit */}
          <div className="space-y-6">
            <div className={`flex items-start gap-3 p-5 rounded-2xl border ${errors.consent ? 'bg-red-500/10 border-red-500/30' : 'bg-white border-slate-200'}`}>
              <div className="pt-0.5">
                <input
                  type="checkbox"
                  id="consent"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 bg-slate-100 accent-orange-600 cursor-pointer"
                />
              </div>
              <div>
                <label htmlFor="consent" className="text-sm text-slate-700 leading-relaxed font-medium cursor-pointer block">
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
              className="w-full relative flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-green-600 text-slate-900 font-extrabold text-lg shadow-xl shadow-orange-600/25 hover:shadow-orange-600/40 hover:scale-[1.02] transition-all disabled:opacity-70 disabled:pointer-events-none disabled:scale-100 overflow-hidden group"
            >
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />

              {submitting ? (
                <>
                  <span className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing via AI Engine...
                </>
              ) : (
                <>
                  Submit Ticket
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

