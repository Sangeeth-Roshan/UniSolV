"use client";

import React, { useState, useRef } from "react";


// ── Submit result type (matches backend response) ─────────────────────────────
interface SubmitResult {
  ticket_id: number;
  domain: string;
  cluster_id: number | null;
  needs_human_review: boolean;
  transcription: string;
}

export default function SubmitPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [consent, setConsent] = useState(false);
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");

  // Audio state
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const handleGetLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude.toString());
          setLng(position.coords.longitude.toString());
        },
        () => {
          setSubmitError("Could not get location. Please enter coordinates manually.");
        }
      );
    } else {
      setSubmitError("Geolocation is not supported by your browser.");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch {
      setSubmitError("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setConsent(false);
    setLat("");
    setLng("");
    setAudioBlob(null);
    setAudioUrl(null);
    setMediaFile(null);
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setSubmitError("Please grant public-good licensing consent before submitting.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitResult(null);

    const formData = new FormData();
    // NOTE: reporter_id is derived server-side from the JWT — do NOT send it.
    formData.append("title", title);
    formData.append("description", description);
    formData.append("public_good_consent", "true");

    if (lat && lng) {
      formData.append("lat", lat);
      formData.append("lng", lng);
    }
    if (audioBlob) {
      formData.append("audio", audioBlob, "recording.webm");
    }
    if (mediaFile) {
      formData.append("media", mediaFile);
    }

    try {
      // Route through our own Next.js API proxy so the HttpOnly auth cookie is
      // attached automatically (client-side fetch cannot read HttpOnly cookies).
      const res = await fetch("/api/proxy/tickets", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data: SubmitResult = await res.json();
        setSubmitResult(data);
        resetForm();
      } else {
        const body = await res.json().catch(() => ({ detail: res.statusText }));
        setSubmitError(body.detail ?? "Failed to submit ticket. Please try again.");
      }
    } catch (err) {
      setSubmitError("Network error: " + String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="page-title">Report an Issue</h1>
        <p className="page-subtitle">
          Describe the civic issue you&apos;ve encountered. Our platform will classify
          and route it to the right department automatically.
        </p>
      </div>

      {/* ── Success Banner ──────────────────────────────────────────────────── */}
      {submitResult && (
        <div className="mb-6 p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
          <div className="flex items-center gap-2 font-semibold mb-2">
            <span>✅</span> Ticket #{submitResult.ticket_id} submitted successfully
          </div>
          <div className="text-sm space-y-1 text-emerald-400">
            <div>
              <span className="text-white/60">Detected domain: </span>
              <span className="font-mono font-medium">{submitResult.domain ?? "—"}</span>
            </div>
            {submitResult.cluster_id && (
              <div>
                <span className="text-white/60">Cluster: </span>
                <span className="font-mono">#{submitResult.cluster_id}</span>
              </div>
            )}
            {submitResult.transcription && (
              <div className="mt-2 p-3 bg-slate-900/50 rounded-lg text-slate-300 text-xs font-mono">
                <span className="text-white/60 block mb-1">Voice transcription:</span>
                {submitResult.transcription}
              </div>
            )}
            {submitResult.needs_human_review && (
              <div className="mt-2 flex items-center gap-1.5 text-amber-300 text-xs">
                ⚠️ This ticket has been flagged for human review before routing.
              </div>
            )}
          </div>
          <button
            onClick={() => setSubmitResult(null)}
            className="mt-3 text-xs underline text-emerald-400 hover:text-emerald-300"
          >
            Submit another issue
          </button>
        </div>
      )}

      {/* ── Error Banner ────────────────────────────────────────────────────── */}
      {submitError && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start gap-2">
          <span className="mt-0.5">⚠️</span>
          <span>{submitError}</span>
        </div>
      )}

      {/* ── Form ────────────────────────────────────────────────────────────── */}
      {!submitResult && (
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Issue Title <span className="text-red-400">*</span>
              </label>
              <input
                required
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
                placeholder="E.g. Broken water pipe on MG Road"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2.5 h-28 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-none"
                placeholder="Describe the issue in detail..."
              />
            </div>

            {/* Voice Note */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Voice Note{" "}
                <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <div className="flex items-center gap-4 flex-wrap">
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
                  >
                    🎙️ Record Voice Note
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm"
                  >
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    Stop Recording ({formatTime(recordingTime)})
                  </button>
                )}
                {audioUrl && !isRecording && (
                  <audio src={audioUrl} controls className="h-9" />
                )}
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Location{" "}
                <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="Latitude"
                  className="bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-sm"
                />
                <input
                  type="text"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="Longitude"
                  className="bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={handleGetLocation}
                className="text-sm text-indigo-400 hover:text-indigo-300 underline"
              >
                📍 Auto-detect my location
              </button>
            </div>

            {/* Photo / Video */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Photo / Video{" "}
                <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                className="w-full text-slate-400 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-500/20 file:text-indigo-300 hover:file:bg-indigo-500/30 cursor-pointer"
              />
              {mediaFile && (
                <p className="text-xs text-slate-500">
                  Selected: {mediaFile.name} ({(mediaFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            {/* Consent */}
            <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
              <input
                type="checkbox"
                id="consent"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 accent-indigo-500"
              />
              <label htmlFor="consent" className="text-sm text-slate-400 leading-relaxed">
                I acknowledge that solutions arising from this report default to
                open / public-good licensing unless a participating industry partner
                negotiates otherwise.{" "}
                <span className="text-red-400">*</span>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn-primary w-full justify-center py-3 text-base disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit Issue"
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
