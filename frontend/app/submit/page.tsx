"use client";

import React, { useState, useRef } from "react";

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
        (error) => {
          alert("Could not get location. Please enter manually.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access denied or unavailable.");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      alert("Please grant public-good licensing consent.");
      return;
    }
    
    setSubmitting(true);
    
    const formData = new FormData();
    formData.append("reporter_id", "1"); // Assuming logged-in user 1 for now
    formData.append("title", title);
    formData.append("description", description);
    formData.append("public_good_consent", consent ? "true" : "false");
    
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
      const res = await fetch("http://localhost:8000/api/tickets", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        alert("Ticket submitted successfully!");
        setTitle("");
        setDescription("");
        setConsent(false);
        setLat("");
        setLng("");
        setAudioBlob(null);
        setAudioUrl(null);
        setMediaFile(null);
      } else {
        const text = await res.text();
        alert("Error submitting: " + text);
      }
    } catch (err) {
      alert("Error: " + err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Report an Issue</h1>
        <p className="text-gray-600">
          Describe the civic issue you've encountered. Our platform will classify and route it to the right department.
        </p>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-md border">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Issue Title</label>
            <input 
              required
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded-lg px-4 py-2" 
              placeholder="E.g. Broken water pipe"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 h-28" 
              placeholder="Describe the issue in detail..."
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Voice Note (Optional)</label>
            <div className="flex items-center gap-4">
              {!isRecording ? (
                <button type="button" onClick={startRecording} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
                  Record Voice Note
                </button>
              ) : (
                <button type="button" onClick={stopRecording} className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> Stop Recording ({formatTime(recordingTime)})
                </button>
              )}
              {audioUrl && !isRecording && (
                <audio src={audioUrl} controls className="h-10" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Latitude</label>
              <input type="text" value={lat} onChange={e=>setLat(e.target.value)} className="w-full border rounded-lg px-4 py-2" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Longitude</label>
              <input type="text" value={lng} onChange={e=>setLng(e.target.value)} className="w-full border rounded-lg px-4 py-2" />
            </div>
          </div>
          <button type="button" onClick={handleGetLocation} className="text-sm text-blue-600 underline">Auto-detect location</button>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Photo / Video</label>
            <input 
              type="file" 
              accept="image/*,video/*"
              onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
              className="w-full border rounded-lg px-4 py-2" 
            />
          </div>
          
          <div className="flex items-start gap-2">
            <input 
              type="checkbox" 
              id="consent" 
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1"
            />
            <label htmlFor="consent" className="text-sm text-gray-600">
              I acknowledge that solutions arising from this report default to open/public-good licensing unless a participating industry partner negotiates otherwise.
            </label>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Issue"}
          </button>
        </form>
      </div>
    </div>
  );
}
