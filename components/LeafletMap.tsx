'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Place, Incident, RouteCandidate, RouteExposureResult } from '@/lib/types';

interface LeafletMapProps {
  places: Place[];
  incidents: Incident[];
  selectedPlace: Place | null;
  selectedIncident: Incident | null;
  routes: RouteCandidate[];
  activeRouteId: string | null;
  highlightedIncidentIds?: string[];
  routeExposure?: RouteExposureResult[];
  onSelectPlace: (place: Place) => void;
  onSelectIncident: (incident: Incident) => void;
  onMapClick: (lat: number, lng: number) => void;
  isPinningLocation: boolean;
  pinnedLocation: { lat: number; lng: number } | null;
}

export default function LeafletMap({
  places,
  incidents,
  selectedPlace,
  selectedIncident,
  routes,
  activeRouteId,
  highlightedIncidentIds = [],
  routeExposure,
  onSelectPlace,
  onSelectIncident,
  onMapClick,
  isPinningLocation,
  pinnedLocation,
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  const buffersLayerRef = useRef<L.LayerGroup | null>(null);
  const pinnedMarkerRef = useRef<L.Marker | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center on Central Pune (FC Road / Deccan / Shaniwar Wada area)
    const map = L.map(mapContainerRef.current, {
      center: [18.5204, 73.8567],
      zoom: 14,
      zoomControl: true,
      attributionControl: true,
    });

    // Dark Matter tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution:
        '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    const routesLayer = L.layerGroup().addTo(map);
    const buffersLayer = L.layerGroup().addTo(map);

    markersLayerRef.current = markersLayer;
    routesLayerRef.current = routesLayer;
    buffersLayerRef.current = buffersLayer;
    mapInstanceRef.current = map;

    // Handle map click
    map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClick(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [onMapClick]);

  // Update Pinned Location Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (pinnedMarkerRef.current) {
      pinnedMarkerRef.current.remove();
      pinnedMarkerRef.current = null;
    }

    if (pinnedLocation) {
      const pinIcon = L.divIcon({
        className: 'custom-pin-marker',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
            <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(59, 130, 246, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; width: 24px; height: 24px; border-radius: 50%; background: #3b82f6; border: 2px solid #ffffff; box-shadow: 0 0 12px #3b82f6; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">
              📍
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([pinnedLocation.lat, pinnedLocation.lng], { icon: pinIcon }).addTo(map);
      marker.bindPopup(`<b>Selected Report Location</b><br/>Lat: ${pinnedLocation.lat}<br/>Lng: ${pinnedLocation.lng}`);
      pinnedMarkerRef.current = marker;
      map.panTo([pinnedLocation.lat, pinnedLocation.lng]);
    }
  }, [pinnedLocation]);

  // Render Markers (Places & Incidents)
  useEffect(() => {
    const markersLayer = markersLayerRef.current;
    if (!markersLayer) return;

    markersLayer.clearLayers();

    // Render Curated Places
    places.forEach((place) => {
      const isSelected = selectedPlace?.id === place.id;

      let iconEmoji = '📍';
      let iconColor = '#60a5fa'; // blue
      if (place.category === 'heritage') {
        iconEmoji = '🏛️';
        iconColor = '#fbbf24';
      } else if (place.category === 'park') {
        iconEmoji = '🌳';
        iconColor = '#34d399';
      } else if (place.category === 'temple') {
        iconEmoji = '🛕';
        iconColor = '#f97316';
      } else if (place.category === 'shopping' || place.tags.includes('food')) {
        iconEmoji = '🛍️';
        iconColor = '#ec4899';
      } else if (place.category === 'museum') {
        iconEmoji = '🎨';
        iconColor = '#a78bfa';
      }

      const placeIcon = L.divIcon({
        className: 'place-marker',
        html: `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: ${isSelected ? '36px' : '28px'};
            height: ${isSelected ? '36px' : '28px'};
            border-radius: 50%;
            background: #111827;
            border: 2px solid ${iconColor};
            box-shadow: ${isSelected ? `0 0 16px ${iconColor}` : '0 2px 6px rgba(0,0,0,0.6)'};
            font-size: ${isSelected ? '16px' : '13px'};
            cursor: pointer;
            transition: all 0.2s ease;
          " title="${place.name}">
            ${iconEmoji}
          </div>
        `,
        iconSize: isSelected ? [36, 36] : [28, 28],
        iconAnchor: isSelected ? [18, 18] : [14, 14],
      });

      const marker = L.marker([place.latitude, place.longitude], { icon: placeIcon });
      marker.on('click', () => onSelectPlace(place));

      const ratingText = place.rating ? `⭐ ${place.rating} / 5` : 'Curated Place';
      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px; line-height: 1.4; color: #f3f4f6; padding: 2px;">
          <div style="font-weight: 700; font-size: 14px; color: #ffffff; margin-bottom: 2px;">${place.name}</div>
          <div style="color: #9ca3af; font-size: 11px; text-transform: uppercase; margin-bottom: 6px;">${place.category} &bull; ${ratingText}</div>
          <p style="margin: 0 0 8px 0; color: #d1d5db; font-size: 12px;">${place.shortDescription || 'Curated landmark in central Pune.'}</p>
          <div style="display: flex; gap: 4px; flex-wrap: wrap;">
            ${place.tags.map(t => `<span style="background: rgba(255,255,255,0.1); padding: 1px 6px; border-radius: 4px; font-size: 10px; color: #93c5fd;">#${t}</span>`).join('')}
          </div>
        </div>
      `);

      markersLayer.addLayer(marker);
    });

    // Render Incidents
    incidents.forEach((incident) => {
      if (incident.isResolved) return;

      const isSelected = selectedIncident?.id === incident.id;
      const isHighlighted = highlightedIncidentIds.includes(incident.id);

      let color = '#ef4444'; // red default
      let iconSymbol = '⚠️';

      if (incident.incidentType === 'waterlogging') {
        color = '#06b6d4'; // cyan
        iconSymbol = '🌊';
      } else if (incident.incidentType === 'road_damage') {
        color = '#f97316'; // orange
        iconSymbol = '🕳️';
      } else if (incident.incidentType === 'temporary_obstruction') {
        color = '#a855f7'; // purple
        iconSymbol = '🚧';
      } else if (incident.incidentType === 'traffic_disruption') {
        color = '#ef4444'; // red
        iconSymbol = '🚗';
      } else if (incident.incidentType === 'broken_streetlight') {
        color = '#eab308'; // yellow
        iconSymbol = '💡';
      } else if (incident.incidentType === 'cleanliness_issue') {
        color = '#84cc16'; // lime
        iconSymbol = '🧹';
      }

      const scorePercent = incident.evidenceSupportScore
        ? Math.round(incident.evidenceSupportScore * 100)
        : 30;

      const incidentIcon = L.divIcon({
        className: 'incident-marker',
        html: `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: ${isSelected || isHighlighted ? '38px' : '30px'};
            height: ${isSelected || isHighlighted ? '38px' : '30px'};
            border-radius: 50%;
            background: #111827;
            border: 2px solid ${color};
            box-shadow: ${isSelected || isHighlighted ? `0 0 18px ${color}` : '0 2px 8px rgba(0,0,0,0.6)'};
            font-size: ${isSelected || isHighlighted ? '17px' : '14px'};
            cursor: pointer;
            animation: ${isHighlighted ? 'pulse-ring 1.8s infinite' : 'none'};
          " title="${incident.title}">
            ${iconSymbol}
            <div style="
              position: absolute;
              bottom: -4px;
              right: -4px;
              background: ${color};
              color: #000;
              font-weight: 800;
              font-size: 8px;
              padding: 1px 3px;
              border-radius: 4px;
            ">
              ${scorePercent}%
            </div>
          </div>
        `,
        iconSize: isSelected || isHighlighted ? [38, 38] : [30, 30],
        iconAnchor: isSelected || isHighlighted ? [19, 19] : [15, 15],
      });

      const marker = L.marker([incident.latitude, incident.longitude], { icon: incidentIcon });
      marker.on('click', () => onSelectIncident(incident));

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px; line-height: 1.4; color: #f3f4f6; min-width: 220px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
            <span style="font-weight: 700; color: #ffffff; font-size: 14px;">${incident.title}</span>
          </div>
          <div style="display: flex; gap: 6px; margin-bottom: 6px; flex-wrap: wrap;">
            <span style="background: rgba(255,255,255,0.1); color: ${color}; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase;">
              ${incident.incidentType.replace(/_/g, ' ')}
            </span>
            <span style="background: rgba(255,255,255,0.1); color: #60a5fa; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase;">
              ${incident.verificationStatus.replace(/_/g, ' ')}
            </span>
          </div>
          <p style="margin: 0 0 8px 0; color: #d1d5db; font-size: 12px;">${incident.summary}</p>
          <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px; font-size: 11px; color: #9ca3af;">
            <div>Evidence Score: <strong style="color: #38bdf8;">${scorePercent}%</strong> (${incident.distinctSubmissionCount} report${incident.distinctSubmissionCount > 1 ? 's' : ''})</div>
            <div>Freshness: <span style="color: #34d399; font-weight: 600;">${incident.freshnessStatus}</span></div>
          </div>
        </div>
      `);

      markersLayer.addLayer(marker);
    });
  }, [places, incidents, selectedPlace, selectedIncident, highlightedIncidentIds, onSelectPlace, onSelectIncident]);

  // Render Routes and 100m Hazard Buffers
  useEffect(() => {
    const routesLayer = routesLayerRef.current;
    const buffersLayer = buffersLayerRef.current;
    if (!routesLayer || !buffersLayer) return;

    routesLayer.clearLayers();
    buffersLayer.clearLayers();

    if (!routes || routes.length === 0) return;

    // Draw hazard buffers for affected incidents
    if (routeExposure && routeExposure.length > 0) {
      const activeExposure = routeExposure.find(e => e.routeId === activeRouteId) || routeExposure[0];
      if (activeExposure) {
        activeExposure.affectedIncidents.forEach((ai) => {
          const inc = incidents.find(i => i.id === ai.incidentId);
          if (inc) {
            // Draw 100m danger buffer circle
            const circle = L.circle([inc.latitude, inc.longitude], {
              radius: 100, // 100 meters
              color: '#ef4444',
              fillColor: '#ef4444',
              fillOpacity: 0.15,
              weight: 1.5,
              dashArray: '4, 4',
            });
            circle.bindTooltip(`Hazard Buffer: 100m around ${inc.title} (Exposure +${ai.contributionScore})`, {
              sticky: true,
              className: 'custom-map-tooltip',
            });
            buffersLayer.addLayer(circle);
          }
        });
      }
    }

    // Draw Route Polylines
    routes.forEach((route, index) => {
      const isActive = activeRouteId ? route.id === activeRouteId : index === 0;

      // Swap lat/lng for Leaflet: GeoJSON is [lng, lat], Leaflet is [lat, lng]
      const latLngs: [number, number][] = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);

      const isPrimary = index === 0;
      const lineColor = isActive
        ? (isPrimary ? '#38bdf8' : '#10b981')
        : '#475569';

      const weight = isActive ? 5 : 3;
      const opacity = isActive ? 0.95 : 0.45;

      const polyline = L.polyline(latLngs, {
        color: lineColor,
        weight,
        opacity,
        dashArray: isActive ? undefined : '6, 6',
        lineCap: 'round',
        lineJoin: 'round',
      });

      const distKm = (route.distance / 1000).toFixed(1);
      const durMin = Math.round(route.duration / 60);

      polyline.bindTooltip(`<b>${route.label}</b><br/>${distKm} km • ${durMin} min`, {
        sticky: true,
      });

      routesLayer.addLayer(polyline);

      // Add start and destination badges if active
      if (isActive && latLngs.length > 0) {
        const startPoint = latLngs[0];
        const endPoint = latLngs[latLngs.length - 1];

        const startIcon = L.divIcon({
          className: 'start-marker',
          html: `<div style="background: #10b981; color: white; border: 2px solid white; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; box-shadow: 0 0 10px #10b981;">A</div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });

        const endIcon = L.divIcon({
          className: 'end-marker',
          html: `<div style="background: #ef4444; color: white; border: 2px solid white; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; box-shadow: 0 0 10px #ef4444;">B</div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });

        routesLayer.addLayer(L.marker(startPoint, { icon: startIcon }));
        routesLayer.addLayer(L.marker(endPoint, { icon: endIcon }));
      }
    });

    // Auto-fit bounds if we have routes
    if (routes.length > 0 && mapInstanceRef.current) {
      const allCoords = routes.flatMap(r => r.geometry.coordinates.map(c => [c[1], c[0]] as [number, number]));
      if (allCoords.length > 0) {
        const bounds = L.latLngBounds(allCoords);
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [routes, activeRouteId, routeExposure, incidents]);

  // Center on selected place or incident
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (selectedPlace) {
      map.flyTo([selectedPlace.latitude, selectedPlace.longitude], 15, { duration: 1 });
    } else if (selectedIncident) {
      map.flyTo([selectedIncident.latitude, selectedIncident.longitude], 16, { duration: 1 });
    }
  }, [selectedPlace, selectedIncident]);

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Pin location helper banner when in report mode */}
      {isPinningLocation && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-blue-600/90 backdrop-blur-md text-white text-xs px-4 py-2 rounded-full shadow-lg border border-blue-400 flex items-center gap-2 animate-bounce">
          <span>📍 Click anywhere on the map to place incident pin</span>
        </div>
      )}
    </div>
  );
}
