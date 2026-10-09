'use client';

import React, { useState, useMemo } from 'react';
import { Incident } from '@/lib/types';
import { 
  AlertTriangle, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  PlayCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';

interface IncidentsFeedProps {
  incidents: Incident[];
  selectedIncident: Incident | null;
  onSelectIncident: (incident: Incident) => void;
  onRunReplayForIncident: (incident: Incident) => void;
}

export default function IncidentsFeed({
  incidents,
  selectedIncident,
  onSelectIncident,
  onRunReplayForIncident,
}: IncidentsFeedProps) {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [verificationFilter, setVerificationFilter] = useState<string>('all');
  const [expandedReasonId, setExpandedReasonId] = useState<string | null>(null);

  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      if (inc.isResolved) return false;
      const matchesType = typeFilter === 'all' || inc.incidentType === typeFilter;
      const matchesVerif = verificationFilter === 'all' || inc.verificationStatus === verificationFilter;
      return matchesType && matchesVerif;
    });
  }, [incidents, typeFilter, verificationFilter]);

  return (
    <div className="flex flex-col h-full bg-slate-950/40 backdrop-blur-md">
      {/* Filters Header */}
      <div className="p-4 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Citizen Evidence Feed
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            {filteredIncidents.length} Active Hazards
          </span>
        </div>

        {/* Incident Type Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {['all', 'waterlogging', 'road_damage', 'traffic_disruption', 'temporary_obstruction', 'broken_streetlight', 'cleanliness_issue'].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-2.5 py-1 rounded-lg capitalize whitespace-nowrap transition-colors text-[11px] font-medium ${
                typeFilter === type
                  ? 'bg-amber-600 text-white shadow-sm shadow-amber-500/20'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/80'
              }`}
            >
              {type.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Verification Status Filter */}
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="text-slate-500 text-[10px] uppercase font-bold">Status:</span>
          {['all', 'corroborated', 'unverified', 'authority_confirmed'].map((status) => (
            <button
              key={status}
              onClick={() => setVerificationFilter(status)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                verificationFilter === status
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {status.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Incident Cards */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredIncidents.map((incident) => {
          const isSelected = selectedIncident?.id === incident.id;
          const scorePercent = incident.evidenceSupportScore
            ? Math.round(incident.evidenceSupportScore * 100)
            : 30;

          // Freshness badge color
          let freshnessColor = 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30';
          if (incident.freshnessStatus === 'aging') {
            freshnessColor = 'bg-amber-950/60 text-amber-400 border-amber-500/30';
          } else if (incident.freshnessStatus === 'stale') {
            freshnessColor = 'bg-slate-900 text-slate-400 border-slate-700';
          }

          // Type icon color
          let badgeColor = 'bg-red-500/10 text-red-400 border-red-500/30';
          if (incident.incidentType === 'waterlogging') {
            badgeColor = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
          } else if (incident.incidentType === 'road_damage') {
            badgeColor = 'bg-orange-500/10 text-orange-400 border-orange-500/30';
          } else if (incident.incidentType === 'temporary_obstruction') {
            badgeColor = 'bg-purple-500/10 text-purple-400 border-purple-500/30';
          }

          return (
            <div
              key={incident.id}
              onClick={() => onSelectIncident(incident)}
              className={`group p-3.5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 border-amber-500/70 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900/90 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${badgeColor}`}>
                      {incident.incidentType.replace(/_/g, ' ')}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${freshnessColor} flex items-center gap-1`}>
                      <Clock className="w-2.5 h-2.5" />
                      {incident.freshnessStatus}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-950/50 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                      <ShieldCheck className="w-2.5 h-2.5" />
                      {incident.verificationStatus.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-white group-hover:text-amber-300 transition-colors">
                    {incident.title}
                  </h3>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectIncident(incident);
                  }}
                  className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
                  title="Locate on Map"
                >
                  <MapPin className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
                {incident.summary}
              </p>

              {/* Evidence Support Score Gauge */}
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    Evidence Support Score:
                  </span>
                  <span className="font-bold text-cyan-300 text-[11px]">
                    {scorePercent}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                    style={{ width: `${scorePercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                  <span>{incident.distinctSubmissionCount} report{incident.distinctSubmissionCount > 1 ? 's' : ''} submitted</span>
                  <span>Severity {incident.severity || '?'}/5</span>
                </div>
              </div>

              {/* Action buttons & Expandable Explainability */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedReasonId(expandedReasonId === incident.id ? null : incident.id);
                  }}
                  className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
                >
                  <HelpCircle className="w-3 h-3 text-slate-500" />
                  <span>Why this score?</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRunReplayForIncident(incident);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-sm shadow-amber-600/20 transition-all active:scale-95"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  <span>Replay Route Impact</span>
                </button>
              </div>

              {/* Expanded Evidence Breakdown */}
              {expandedReasonId === incident.id && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] space-y-1.5 animate-slide-in-up">
                  <div className="font-semibold text-slate-300 text-[10px] uppercase tracking-wider">
                    Evidence Calculation Factors:
                  </div>
                  {incident.evidenceReasons && incident.evidenceReasons.length > 0 ? (
                    incident.evidenceReasons.map((reason, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                        <span className="capitalize">{reason.replace(/_/g, ' ')}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 italic">Single initial citizen report; awaiting independent cross-validation.</div>
                  )}
                  <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                    Confidence is bounded. Unverified single reports never exceed 0.40 support score without corroboration.
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredIncidents.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-xs">
            No active hazards matching the filter criteria.
          </div>
        )}
      </div>
    </div>
  );
}
