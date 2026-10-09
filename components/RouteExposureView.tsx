'use client';

import React from 'react';
import { RouteCandidate, RouteExposureResult, Place } from '@/lib/types';
import { 
  Navigation, 
  ShieldAlert, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  History,
  Info
} from 'lucide-react';

interface RouteExposureViewProps {
  routes: RouteCandidate[];
  activeRouteId: string | null;
  routeExposure: RouteExposureResult[];
  recommendedRouteId: string | null;
  recommendationReason: string | null;
  originPlace: Place | null;
  destinationPlace: Place | null;
  onSelectRoute: (routeId: string) => void;
  onOpenReplayModal: () => void;
  onFetchRoutes: () => void;
  isLoadingRoutes: boolean;
}

export default function RouteExposureView({
  routes,
  activeRouteId,
  routeExposure,
  recommendedRouteId,
  recommendationReason,
  originPlace,
  destinationPlace,
  onSelectRoute,
  onOpenReplayModal,
  onFetchRoutes,
  isLoadingRoutes,
}: RouteExposureViewProps) {
  const originName = originPlace ? originPlace.name : 'Deccan Gymkhana';
  const destName = destinationPlace ? destinationPlace.name : 'Koregaon Park';

  const activeExposure = routeExposure.find(e => e.routeId === activeRouteId) || routeExposure[0];

  return (
    <div className="flex flex-col h-full bg-slate-950/40 backdrop-blur-md">
      {/* Route Header & Origin/Destination */}
      <div className="p-4 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-blue-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Route Exposure &amp; Hazard Engine
            </h2>
          </div>
          <button
            onClick={onFetchRoutes}
            disabled={isLoadingRoutes}
            className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold disabled:opacity-50"
          >
            {isLoadingRoutes ? 'Calculating...' : 'Recalculate'}
          </button>
        </div>

        {/* Origin / Destination Badges */}
        <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 text-xs space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-900 shrink-0" />
            <span className="text-slate-400 text-[11px] w-12">Start:</span>
            <span className="font-semibold text-white truncate">{originName}</span>
          </div>
          <div className="h-2 border-l border-dashed border-slate-700 ml-1.5" />
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400 ring-2 ring-red-900 shrink-0" />
            <span className="text-slate-400 text-[11px] w-12">Target:</span>
            <span className="font-semibold text-white truncate">{destName}</span>
          </div>
        </div>

        {/* AI Recommendation Banner */}
        {recommendationReason && (
          <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-blue-300 text-[11px]">System Route Guidance:</div>
              <p className="text-slate-300 text-[11px] leading-relaxed">{recommendationReason}</p>
            </div>
          </div>
        )}
      </div>

      {/* Route Candidates List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="text-xs text-slate-400 font-semibold px-1">
          Route Alternatives Evaluated:
        </div>

        {routes.map((route) => {
          const isSelected = activeRouteId === route.id;
          const isRecommended = recommendedRouteId === route.id;
          const exposure = routeExposure.find(e => e.routeId === route.id);
          const hazardIndex = exposure ? exposure.totalExposureIndex : 0;
          const affectedCount = exposure ? exposure.affectedIncidents.length : 0;

          const distKm = (route.distance / 1000).toFixed(1);
          const durMin = Math.round(route.duration / 60);

          return (
            <div
              key={route.id}
              onClick={() => onSelectRoute(route.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 border-blue-500 shadow-md shadow-blue-500/10'
                  : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900/90 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    {isRecommended ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Recommended
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-400">
                        Alternative
                      </span>
                    )}

                    {hazardIndex > 0 ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-950/60 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Exposure: {hazardIndex}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950/50 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Zero Hazards
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm text-white">
                    {route.label}
                  </h3>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-white flex items-center gap-1 justify-end">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {durMin} min
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {distKm} km
                  </div>
                </div>
              </div>

              {/* Hazards summary */}
              <div className="text-xs text-slate-400 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                <span>
                  {affectedCount > 0
                    ? `⚠️ ${affectedCount} incident${affectedCount > 1 ? 's' : ''} in 100m corridor`
                    : '🛡️ Clear corridor within 100m buffer'}
                </span>
                <span className="text-[10px] text-slate-500 uppercase font-medium">
                  {route.source}
                </span>
              </div>
            </div>
          );
        })}

        {/* Hazard Corridor Details for Active Route */}
        {activeExposure && activeExposure.affectedIncidents.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 px-1">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Corridor Hazards Breakdown (100m Buffer):</span>
            </div>

            <div className="space-y-2">
              {activeExposure.affectedIncidents.map((hazard) => (
                <div
                  key={hazard.incidentId}
                  className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between font-semibold text-white">
                    <span className="truncate text-amber-300">{hazard.incidentTitle}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-500/30 shrink-0">
                      +{hazard.contributionScore} risk
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    <span>Distance from route: <strong className="text-white">{hazard.distanceToRoute}m</strong></span>
                  </div>

                  <div className="text-[10px] text-slate-500 leading-normal bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                    <div>Proximity ({hazard.proximityFactor}) &times; Severity ({hazard.severityFactor}) &times; Freshness ({hazard.freshnessFactor}) &times; Verif ({hazard.verificationWeight})</div>
                    <div className="text-slate-400 mt-0.5 italic">{hazard.explanation}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signature Impact Replay Callout */}
        <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-cyan-950/50 via-slate-900 to-blue-950/50 border border-cyan-500/30 space-y-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400 animate-spin-slow" />
            <h3 className="font-bold text-xs text-white uppercase tracking-wider">
              Signature Feature: Impact Replay
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            See in real-time how a newly reported hazard dynamically shifts this route recommendation from JM Road to the safer alternative, with transparent evidence.
          </p>
          <button
            onClick={onOpenReplayModal}
            className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-md shadow-cyan-500/20 transition-all active:scale-95 flex items-center justify-center gap-1.5"
          >
            <History className="w-3.5 h-3.5" />
            <span>Launch Live Impact Replay</span>
          </button>
        </div>
      </div>
    </div>
  );
}
