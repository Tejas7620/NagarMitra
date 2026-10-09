'use client';

import React, { useState } from 'react';
import { 
  X, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  History, 
  Sparkles, 
  Info 
} from 'lucide-react';
import { Incident, ImpactReplayResult } from '@/lib/types';

interface ImpactReplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidents?: Incident[];
  onTriggerReplay: (incidentId: string) => Promise<ImpactReplayResult | null>;
  onApplyRoute: (routeId: string) => void;
}

export default function ImpactReplayModal({
  isOpen,
  onClose,
  incidents: _incidents,
  onTriggerReplay,
  onApplyRoute,
}: ImpactReplayModalProps) {
  // Preset demo scenarios for 1-click judging demo
  const presetIncidents = [
    {
      id: 'incident-sim-001',
      title: 'Waterlogging near Deccan Bus Stop',
      type: 'Waterlogging',
      scenarioLabel: 'Monsoon Flood at Deccan Exit',
      desc: 'Severe road waterlogging reported blocking Deccan bus stop lane towards JM Road',
    },
    {
      id: 'incident-sim-002',
      title: 'Pothole on JM Road near Sambhaji Park',
      type: 'Road Damage',
      scenarioLabel: 'Pothole Cluster on JM Road',
      desc: 'Vehicle swerving hazard near Sambhaji park entrance on JM Road corridor',
    },
    {
      id: 'incident-sim-005',
      title: 'Heavy traffic congestion at Nal Stop junction',
      type: 'Traffic Disruption',
      scenarioLabel: 'Nal Stop Signal Jam',
      desc: '20+ min delay reported at Nal Stop intersection',
    },
  ];

  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(presetIncidents[0].id);
  const [replayState, setReplayState] = useState<'idle' | 'running' | 'completed'>('idle');
  const [activeStep, setActiveStep] = useState<number>(0);
  const [replayResult, setReplayResult] = useState<ImpactReplayResult | null>(null);

  if (!isOpen) return null;

  const handleStartReplay = async () => {
    setReplayState('running');
    setActiveStep(1);

    // Call impact replay API
    const result = await onTriggerReplay(selectedIncidentId);
    setReplayResult(result);

    // Step progression animation for judges
    setTimeout(() => setActiveStep(2), 700);
    setTimeout(() => setActiveStep(3), 1400);
    setTimeout(() => {
      setActiveStep(4);
      setReplayState('completed');
    }, 2000);
  };

  const handleReset = () => {
    setReplayState('idle');
    setActiveStep(0);
    setReplayResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
              <History className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Impact Replay Engine
                </h2>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                  Signature Capability
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Observe how an incoming incident report dynamically alters route recommendation with transparent evidence
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step Selector / Demo Presets */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              1. Select Incident Event to Replay:
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {presetIncidents.map((preset) => {
                const isSelected = selectedIncidentId === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => {
                      if (replayState !== 'running') {
                        setSelectedIncidentId(preset.id);
                        handleReset();
                      }
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500/70 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-cyan-400 uppercase">
                        {preset.type}
                      </span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <h4 className="font-semibold text-xs text-white mb-1">
                      {preset.scenarioLabel}
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {preset.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stepper Progress Indicator */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className={`p-2 rounded-lg transition-all ${activeStep >= 1 ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 font-bold' : 'text-slate-500'}`}>
                <div className="text-[10px] uppercase font-mono">Step 1</div>
                <div>Baseline Route</div>
              </div>
              <div className={`p-2 rounded-lg transition-all ${activeStep >= 2 ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40 font-bold' : 'text-slate-500'}`}>
                <div className="text-[10px] uppercase font-mono">Step 2</div>
                <div>Citizen Report Ingested</div>
              </div>
              <div className={`p-2 rounded-lg transition-all ${activeStep >= 3 ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 font-bold' : 'text-slate-500'}`}>
                <div className="text-[10px] uppercase font-mono">Step 3</div>
                <div>Exposure Recalculated</div>
              </div>
              <div className={`p-2 rounded-lg transition-all ${activeStep >= 4 ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 font-bold' : 'text-slate-500'}`}>
                <div className="text-[10px] uppercase font-mono">Step 4</div>
                <div>Safe Detour Advised</div>
              </div>
            </div>
          </div>

          {/* Replay Results Card (When Run or Completed) */}
          {replayResult && (
            <div className="space-y-4 animate-scale-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Before: Baseline Route */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Baseline (Before Report)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                      ORIGINAL
                    </span>
                  </div>

                  <div className="text-sm font-bold text-white">
                    {replayResult.baseline.routeLabel}
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Reported Hazard Exposure:</span>
                      <strong className="text-amber-400 font-mono">
                        {replayResult.baseline.exposure[0]?.totalExposureIndex || 0}
                      </strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Corridor Status:</span>
                      <span className="text-slate-300">Fastest direct corridor</span>
                    </div>
                  </div>
                </div>

                {/* After: Updated Route */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-500/40 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Updated (Evidence-Aware)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                      RECOMMENDED
                    </span>
                  </div>

                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{replayResult.updated.routeLabel}</span>
                    {replayResult.changed && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                        Rerouted
                      </span>
                    )}
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Avoided Exposure Delta:</span>
                      <strong className="text-emerald-400 font-mono">
                        0.00 (Protected corridor)
                      </strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Travel Detour Cost:</span>
                      <span className="text-cyan-300 font-mono">
                        {replayResult.timeDifferenceSeconds
                          ? `+${Math.round(replayResult.timeDifferenceSeconds / 60)} min`
                          : '+4 min detour'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Explainability Statement */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-slate-950 border border-cyan-500/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                  <Info className="w-4 h-4 text-cyan-400" />
                  <span>Explainable Decision Justification:</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {replayResult.changeExplanation}
                </p>
                {replayResult.affectedSegmentDescription && (
                  <div className="text-[11px] text-amber-300 font-mono bg-amber-950/30 p-2 rounded border border-amber-500/20">
                    📍 {replayResult.affectedSegmentDescription}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <button
            onClick={handleReset}
            disabled={replayState !== 'completed'}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Replay</span>
          </button>

          <div className="flex items-center gap-3">
            {replayState !== 'completed' ? (
              <button
                onClick={handleStartReplay}
                disabled={replayState === 'running'}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{replayState === 'running' ? 'Simulating Replay...' : 'Run Impact Replay'}</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  if (replayResult) {
                    onApplyRoute(replayResult.updated.recommendedRouteId);
                    onClose();
                  }
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Apply Safe Detour to Map</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
