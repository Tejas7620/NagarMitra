'use client';

import React, { useState, useRef } from 'react';
import { 
  X, 
  Send, 
  AlertTriangle, 
  Sparkles, 
  CheckCircle2, 
  Compass,
  Zap,
  Camera,
  Mic,
  Trash2
} from 'lucide-react';
import { ReportResponse } from '@/lib/types';
import { apiClient } from '@/lib/services/api-client';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitReport: (data: {
    text: string;
    latitude: number;
    longitude: number;
    locationText?: string;
    observedAt?: string;
    photoUrl?: string | null;
    voiceTranscript?: string | null;
  }) => Promise<ReportResponse | null>;
  onPinOnMap: () => void;
  pinnedLocation: { lat: number; lng: number } | null;
  onLaunchReplayForIncident: (incidentId: string) => void;
}

export default function ReportModal({
  isOpen,
  onClose,
  onSubmitReport,
  onPinOnMap,
  pinnedLocation,
  onLaunchReplayForIncident,
}: ReportModalProps) {
  // Preset demo incidents for rapid judging evaluation
  const demoPresets = [
    {
      title: 'Waterlogging at Alka Talkies',
      text: 'Severe waterlogging approximately 2 feet deep near Alka Talkies chowk after rain. Two two-wheelers stalled.',
      lat: 18.5190,
      lng: 73.8460,
      location: 'Alka Talkies / Deccan Chowk, Pune',
    },
    {
      title: 'Deep Pothole on FC Road',
      text: 'Deep hazardous pothole cluster on FC Road near Goodluck Cafe. Vehicles abruptly swerving.',
      lat: 18.5255,
      lng: 73.8415,
      location: 'FC Road near Goodluck Cafe, Pune',
    },
    {
      title: 'Barricade near Shaniwar Wada',
      text: 'Temporary pipeline repair barricade blocking main entry lane towards Shaniwar Wada.',
      lat: 18.5198,
      lng: 73.8550,
      location: 'Shaniwar Wada main road, Pune',
    },
  ];

  const [text, setText] = useState(demoPresets[0].text);
  const [latitude, setLatitude] = useState<number>(demoPresets[0].lat);
  const [longitude, setLongitude] = useState<number>(demoPresets[0].lng);
  const [locationText, setLocationText] = useState<string>(demoPresets[0].location);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<ReportResponse | null>(null);

  // Photo upload & Voice state
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<unknown>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Synchronize if map was clicked
  const [prevPinned, setPrevPinned] = useState(pinnedLocation);
  if (pinnedLocation !== prevPinned) {
    setPrevPinned(pinnedLocation);
    if (pinnedLocation) {
      setLatitude(pinnedLocation.lat);
      setLongitude(pinnedLocation.lng);
      setLocationText(`Pinned Location (${pinnedLocation.lat}, ${pinnedLocation.lng})`);
    }
  }

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof demoPresets[0]) => {
    setText(preset.text);
    setLatitude(preset.lat);
    setLongitude(preset.lng);
    setLocationText(preset.location);
    setSubmissionResult(null);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setUploadError(null);
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File exceeds max size of 5MB');
      return;
    }
    setIsUploading(true);
    try {
      const res = await apiClient.uploadMedia(file);
      if (res.url) {
        setPhotoUrl(res.url);
      }
    } catch {
      setPhotoUrl(URL.createObjectURL(file));
    } finally {
      setIsUploading(false);
    }
  };

  const startVoiceRecording = () => {
    setIsRecording(true);
    setRecSeconds(0);
    timerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);

    if (typeof window !== 'undefined') {
      const win = window as unknown as Record<string, unknown>;
      if ('webkitSpeechRecognition' in win || 'SpeechRecognition' in win) {
        try {
          const SpeechRec = (win.SpeechRecognition || win.webkitSpeechRecognition) as new () => {
            continuous: boolean;
            interimResults: boolean;
            lang: string;
            onresult: (event: { resultIndex: number; results: Array<Array<{ transcript: string }>> }) => void;
            start: () => void;
            stop: () => void;
          };
          const rec = new SpeechRec();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = 'en-IN';

          rec.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript;
            }
            if (transcript.trim()) {
              setVoiceTranscript(transcript);
              setText(transcript);
            }
          };
          rec.start();
          recognitionRef.current = rec;
        } catch {
          // Gracefully continue if microphone permission denied
        }
      }
    }
  };

  const stopVoiceRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognitionRef.current && typeof (recognitionRef.current as { stop?: () => void }).stop === 'function') {
      try { (recognitionRef.current as { stop: () => void }).stop(); } catch { /* ignore */ }
    }
    setIsRecording(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !photoUrl && !voiceTranscript) return;

    setIsSubmitting(true);
    const result = await onSubmitReport({
      text: text || 'Incident observed at confirmed coordinates',
      latitude,
      longitude,
      locationText,
      observedAt: new Date().toISOString(),
      photoUrl,
      voiceTranscript,
    });
    setIsSubmitting(false);

    if (result) {
      setSubmissionResult(result);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-600/20">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Submit Citizen Incident Report
              </h2>
              <p className="text-xs text-slate-400">
                AI extraction &bull; Corroboration scoring &bull; Dynamic route recalculation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Quick Presets for Demo */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Quick Demo Scenarios:
              </span>
              <span className="text-slate-500 text-[10px]">1-click populate</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {demoPresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-950 text-left transition-all text-xs"
                >
                  <div className="font-semibold text-white text-[11px] truncate mb-0.5">
                    {preset.title}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {preset.location}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Incident Text Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Incident Description (Free-text):</span>
                <span className="text-[10px] text-slate-500 font-normal">Parsed by Gemini AI / Regex NLP</span>
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                placeholder="Describe the issue, estimated depth, road blockage, or vehicles affected..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors leading-relaxed"
              />

              {/* Photo & Voice Attachments */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
                    photoUrl
                      ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  {isUploading ? 'Uploading...' : photoUrl ? 'Photo Attached ✓' : 'Upload Photo'}
                </button>

                <button
                  type="button"
                  onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
                    isRecording
                      ? 'bg-rose-950/80 border-rose-500/80 text-rose-300 animate-pulse'
                      : voiceTranscript
                      ? 'bg-purple-950/60 border-purple-500/50 text-purple-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  {isRecording ? `Recording (${recSeconds}s)...` : voiceTranscript ? 'Voice Transcribed ✓' : 'Record Voice'}
                </button>

                {photoUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoUrl(null)}
                    className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/40 text-xs"
                    title="Remove photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {uploadError && <p className="text-[11px] text-rose-400 font-semibold">{uploadError}</p>}

              {photoUrl && (
                <div className="relative mt-2 rounded-xl overflow-hidden border border-slate-800 max-h-36">
                  <img src={photoUrl} alt="Attached incident evidence" className="w-full h-36 object-cover" />
                  <span className="absolute bottom-2 left-2 bg-slate-950/80 px-2 py-0.5 rounded text-[10px] text-emerald-400 font-bold">
                    ✓ Image Attached
                  </span>
                </div>
              )}
            </div>

            {/* Coordinates & Map Pin */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Location Landmark:
                </label>
                <input
                  type="text"
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                  placeholder="e.g. Near Alka Talkies, JM Road"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-300">
                    Map Coordinates:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      onPinOnMap();
                      onClose();
                    }}
                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
                  >
                    <Compass className="w-3 h-3" /> Pin on Map
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.0001"
                    value={latitude}
                    onChange={(e) => setLatitude(parseFloat(e.target.value))}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    placeholder="Lat (18.52)"
                    required
                  />
                  <input
                    type="number"
                    step="0.0001"
                    value={longitude}
                    onChange={(e) => setLongitude(parseFloat(e.target.value))}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    placeholder="Lng (73.85)"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Submission Status or Trigger Callout */}
            {submissionResult ? (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-3 animate-slide-in-up">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Report Successfully Ingested into CityPulse Store!</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-slate-500">Classification:</span>{' '}
                    <strong className="text-white capitalize">{submissionResult.incident.incidentType.replace(/_/g, ' ')}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Support Score:</span>{' '}
                    <strong className="text-cyan-400 font-mono">
                      {Math.round((submissionResult.incident.evidenceSupportScore || 0.4) * 100)}%
                    </strong>
                  </div>
                  <div className="col-span-2 text-slate-400 text-[10px]">
                    {submissionResult.linkedToExistingIncident
                      ? '🔗 Corroborated with an existing nearby incident cluster (+1 report weight)'
                      : '✨ Created new incident cluster with user-confirmed coordinates'}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-300 font-medium">
                    Test the impact of this new report:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onLaunchReplayForIncident(submissionResult.incident.id);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 transition-all flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Launch Impact Replay Now</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Extracting & Ingesting...' : 'Submit Incident Report'}</span>
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
