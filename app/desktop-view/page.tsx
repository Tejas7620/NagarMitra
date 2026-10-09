'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import PlacesPanel from '@/components/PlacesPanel';
import IncidentsFeed from '@/components/IncidentsFeed';
import RouteExposureView from '@/components/RouteExposureView';
import ImpactReplayModal from '@/components/ImpactReplayModal';
import ReportModal from '@/components/ReportModal';
import { 
  Place, 
  Incident, 
  RouteCandidate, 
  RouteExposureResult, 
  ImpactReplayResult,
  ReportResponse 
} from '@/lib/types';
import { 
  Loader2, 
  Sparkles, 
  AlertCircle, 
  Layers, 
  Compass, 
  Navigation 
} from 'lucide-react';

// Dynamically import LeafletMap with SSR disabled
const LeafletMap = dynamic(() => import('@/components/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      <span className="text-xs font-mono uppercase tracking-wider">Loading Pune Spatial Map...</span>
    </div>
  ),
});

export default function Home() {
  // Main Data States
  const [places, setPlaces] = useState<Place[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [routes, setRoutes] = useState<RouteCandidate[]>([]);
  const [routeExposure, setRouteExposure] = useState<RouteExposureResult[]>([]);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const [recommendedRouteId, setRecommendedRouteId] = useState<string | null>(null);
  const [recommendationReason, setRecommendationReason] = useState<string | null>(null);

  // Selection & UI States
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [originPlace, setOriginPlace] = useState<Place | null>(null);
  const [destinationPlace, setDestinationPlace] = useState<Place | null>(null);
  const [activeTab, setActiveTab] = useState<'places' | 'incidents' | 'route' | 'replay'>('route');

  // Modals & Map Interaction
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isReplayModalOpen, setIsReplayModalOpen] = useState(false);
  const [isPinningLocation, setIsPinningLocation] = useState(false);
  const [pinnedLocation, setPinnedLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Loading & Feedback
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dataMode, setDataMode] = useState<string>('demo_local_storage');

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Fetch initial places
  const fetchPlaces = useCallback(async () => {
    try {
      const res = await fetch('/api/places');
      const data = await res.json();
      if (data.places) {
        setPlaces(data.places);
        // Default origin & destination: Deccan Gymkhana & Koregaon Park
        const deccan = data.places.find((p: Place) => p.id === 'place-010');
        const kp = data.places.find((p: Place) => p.id === 'place-012');
        if (deccan) setOriginPlace(deccan);
        if (kp) setDestinationPlace(kp);
      }
    } catch (err) {
      console.error('Failed to fetch places:', err);
    }
  }, []);

  // Fetch incidents
  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch('/api/incidents');
      const data = await res.json();
      if (data.incidents) {
        setIncidents(data.incidents);
        if (data.dataMode) setDataMode(data.dataMode);
      }
    } catch (err) {
      console.error('Failed to fetch incidents:', err);
    }
  }, []);

  // Fetch routes
  const fetchRoutes = useCallback(async () => {
    setIsLoadingRoutes(true);
    try {
      const res = await fetch('/api/routes');
      const data = await res.json();
      if (data.scenario?.routes) {
        setRoutes(data.scenario.routes);
        if (data.scenario.routes.length > 0) {
          setActiveRouteId(data.scenario.routes[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch routes:', err);
    } finally {
      setIsLoadingRoutes(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchPlaces();
    fetchIncidents();
    fetchRoutes();
  }, [fetchPlaces, fetchIncidents, fetchRoutes]);

  // Recalculate route exposure whenever routes or incidents update
  useEffect(() => {
    if (routes.length === 0 || incidents.length === 0) return;

    // Use trigger API or baseline exposure
    fetch('/api/impact-replay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenarioId: 'central-pune-demo-01',
        incidentId: incidents[0].id,
      }),
    })
      .then(res => res.json())
      .then((data: ImpactReplayResult) => {
        if (data.baseline?.exposure) {
          setRouteExposure(data.baseline.exposure);
          setRecommendedRouteId(data.baseline.recommendedRouteId);
          setRecommendationReason(
            data.changed
              ? `Recommended route updated to minimize corridor hazards.`
              : `Route recommended based on minimal reported hazards and travel duration.`
          );
        }
      })
      .catch(err => console.error('Exposure calc failed:', err));
  }, [routes, incidents]);

  // Handle Map Click (pinning for report)
  const handleMapClick = (lat: number, lng: number) => {
    if (isPinningLocation) {
      setPinnedLocation({ lat, lng });
      setIsPinningLocation(false);
      setIsReportModalOpen(true);
      showToast(`Selected location: ${lat}, ${lng}`);
    }
  };

  // Reset Demo to initial state
  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      if (res.ok) {
        await fetchIncidents();
        await fetchRoutes();
        showToast('Demo store successfully reset to pristine seed state');
      }
    } catch (err) {
      console.error('Reset failed:', err);
      showToast('Failed to reset demo store');
    } finally {
      setIsResetting(false);
    }
  };

  // Submit new citizen report
  const handleSubmitReport = async (reportData: {
    text: string;
    latitude: number;
    longitude: number;
    locationText?: string;
    observedAt?: string;
  }): Promise<ReportResponse | null> => {
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        showToast(errorData.error || 'Failed to submit report');
        return null;
      }

      const result: ReportResponse = await res.json();
      await fetchIncidents();
      setSelectedIncident(result.incident);
      showToast('Report ingested & scored into Pune evidence engine!');
      return result;
    } catch (err) {
      console.error('Report submission error:', err);
      showToast('Error submitting report');
      return null;
    }
  };

  // Trigger Impact Replay for an incident
  const handleTriggerReplay = async (incidentId: string): Promise<ImpactReplayResult | null> => {
    try {
      const res = await fetch('/api/impact-replay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: 'central-pune-demo-01',
          incidentId,
        }),
      });

      if (!res.ok) {
        showToast('Impact replay calculation failed');
        return null;
      }

      const result: ImpactReplayResult = await res.json();
      setRouteExposure(result.updated.exposure);
      setRecommendedRouteId(result.updated.recommendedRouteId);
      setRecommendationReason(result.changeExplanation);
      return result;
    } catch (err) {
      console.error('Replay calculation error:', err);
      return null;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans select-none">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onOpenReplayModal={() => setIsReplayModalOpen(true)}
        onResetDemo={handleResetDemo}
        incidentCount={incidents.filter(i => !i.isResolved).length}
        isResetting={isResetting}
        dataMode={dataMode}
      />

      {/* Main Workspace (Split View: Panel + Map) */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Interactive Panel */}
        <div className="w-full sm:w-[420px] lg:w-[460px] h-full flex flex-col border-r border-slate-800 bg-slate-950/70 z-20 shrink-0 shadow-2xl overflow-hidden">
          {activeTab === 'places' && (
            <PlacesPanel
              places={places}
              selectedPlace={selectedPlace}
              onSelectPlace={(p) => {
                setSelectedPlace(p);
                setSelectedIncident(null);
              }}
              onSetOrigin={(p) => {
                setOriginPlace(p);
                showToast(`Route start set to: ${p.name}`);
              }}
              onSetDestination={(p) => {
                setDestinationPlace(p);
                showToast(`Route target set to: ${p.name}`);
              }}
            />
          )}

          {activeTab === 'incidents' && (
            <IncidentsFeed
              incidents={incidents}
              selectedIncident={selectedIncident}
              onSelectIncident={(inc) => {
                setSelectedIncident(inc);
                setSelectedPlace(null);
              }}
              onRunReplayForIncident={(inc) => {
                setSelectedIncident(inc);
                setIsReplayModalOpen(true);
              }}
            />
          )}

          {activeTab === 'route' && (
            <RouteExposureView
              routes={routes}
              activeRouteId={activeRouteId}
              routeExposure={routeExposure}
              recommendedRouteId={recommendedRouteId}
              recommendationReason={recommendationReason}
              originPlace={originPlace}
              destinationPlace={destinationPlace}
              onSelectRoute={(id) => setActiveRouteId(id)}
              onOpenReplayModal={() => setIsReplayModalOpen(true)}
              onFetchRoutes={fetchRoutes}
              isLoadingRoutes={isLoadingRoutes}
            />
          )}

          {activeTab === 'replay' && (
            <div className="p-6 flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-xl shadow-cyan-500/10">
                <Sparkles className="w-7 h-7" />
              </div>
              <h2 className="text-base font-bold text-white">Impact Replay Studio</h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                Launch the interactive before-and-after comparison simulation to demonstrate how incoming reports alter routing decisions in real time.
              </p>
              <button
                onClick={() => setIsReplayModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all"
              >
                Open Studio Simulation
              </button>
            </div>
          )}
        </div>

        {/* Center / Right Full Map View */}
        <div className="flex-1 h-full relative overflow-hidden bg-slate-950">
          <LeafletMap
            places={places}
            incidents={incidents}
            selectedPlace={selectedPlace}
            selectedIncident={selectedIncident}
            routes={routes}
            activeRouteId={activeRouteId}
            highlightedIncidentIds={
              selectedIncident
                ? [selectedIncident.id]
                : routeExposure.flatMap(e => e.affectedIncidents.map(ai => ai.incidentId))
            }
            routeExposure={routeExposure}
            onSelectPlace={(p) => {
              setSelectedPlace(p);
              setSelectedIncident(null);
            }}
            onSelectIncident={(i) => {
              setSelectedIncident(i);
              setSelectedPlace(null);
            }}
            onMapClick={handleMapClick}
            isPinningLocation={isPinningLocation}
            pinnedLocation={pinnedLocation}
          />

          {/* Floating Map Overlay: Top Information Pill */}
          <div className="absolute top-4 left-4 z-[500] hidden md:flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800 shadow-xl text-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-900 animate-pulse" />
            <span className="font-semibold text-white">Central Pune Demo Area</span>
            <span className="text-slate-500">&bull;</span>
            <span className="text-slate-400">100m Hazard Buffer Active</span>
          </div>

          {/* Floating Map Overlay: Bottom Right Quick Replay Pill */}
          <div className="absolute bottom-6 right-6 z-[500]">
            <button
              onClick={() => setIsReplayModalOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-2xl shadow-blue-500/30 border border-blue-400/40 transition-all hover:scale-105 active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Demonstrate Impact Replay</span>
            </button>
          </div>

          {/* Floating Map Overlay: Legend */}
          <div className="absolute bottom-6 left-6 z-[500] hidden lg:block bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-800 shadow-xl text-[11px] space-y-1.5">
            <div className="font-bold text-slate-300 text-[10px] uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Layers className="w-3 h-3 text-blue-400" />
              <span>Map Spatial Legend</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-3 h-1 bg-sky-400 rounded-full" />
              <span>Primary Corridor (JM Rd)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-3 h-1 bg-emerald-400 rounded-full" />
              <span>Safe Detour (Shivaji Br)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span>Waterlogging Hazard</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
              <span>Road Damage / Pothole</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400/30 border border-red-500" />
              <span>100m Exposure Buffer</span>
            </div>
          </div>
        </div>
      </div>

      {/* Impact Replay Signature Modal */}
      <ImpactReplayModal
        isOpen={isReplayModalOpen}
        onClose={() => setIsReplayModalOpen(false)}
        incidents={incidents}
        onTriggerReplay={handleTriggerReplay}
        onApplyRoute={(routeId) => {
          setActiveRouteId(routeId);
          setActiveTab('route');
          showToast('Updated route applied to navigation view');
        }}
      />

      {/* Citizen Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmitReport={handleSubmitReport}
        onPinOnMap={() => {
          setIsPinningLocation(true);
          showToast('Click anywhere on the map to drop the report location pin');
        }}
        pinnedLocation={pinnedLocation}
        onLaunchReplayForIncident={(incidentId) => {
          handleTriggerReplay(incidentId);
          setIsReplayModalOpen(true);
        }}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900 border border-blue-500/50 shadow-2xl text-xs font-semibold text-white">
            <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
