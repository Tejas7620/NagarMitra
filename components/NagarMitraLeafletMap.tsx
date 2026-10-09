'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type VerifStatus = 'Unverified' | 'Corroborated' | 'Authority-confirmed' | 'Contested';
export type FreshStatus = 'Recent' | 'Aging' | 'Stale' | 'Unknown';

export interface MapIncident {
  id: string;
  type: string;
  title: string;
  place: string;
  time: string;
  source: string;
  verif: VerifStatus;
  fresh: FreshStatus;
  lat: number;
  lng: number;
  nearRoute?: boolean;
  desc?: string;
  exposure?: string;
  duplicates?: string[];
  independent?: string;
}

export interface MapPlace {
  id: string;
  name: string;
  cat: string;
  dist: string;
  price: string;
  rating: string | null;
  access: string;
  clean: string;
  desc: string;
  lat: number;
  lng: number;
  img?: string;
}

export interface NagarMitraMapProps {
  height?: number | string;
  incidents?: MapIncident[];
  places?: MapPlace[];
  routes?: 'none' | 'base' | 'both' | 'alt';
  routeCoords?: [number, number][]; // Dynamic primary route [[lat, lng], ...]
  altRouteCoords?: [number, number][]; // Dynamic alternative route [[lat, lng], ...]
  origin?: { name: string; lat: number; lng: number } | null;
  destination?: { name: string; lat: number; lng: number } | null;
  userLocation?: { lat: number; lng: number; accuracy?: number } | null;
  showPlaces?: boolean;
  placeCat?: string;
  selectedPlaceId?: string;
  highlightIncidentId?: string;
  onIncidentClick?: (incident: MapIncident) => void;
  onPlaceClick?: (placeId: string) => void;
  picker?: {
    lat: number;
    lng: number;
    confirmed: boolean;
  };
  onPickerChange?: (coords: { lat: number; lng: number }) => void;
  center?: [number, number];
  zoom?: number;
  showBuffers?: boolean;
  showControls?: boolean;
  autoFit?: boolean;
}

const MARK_COLORS: Record<VerifStatus, { fill: string; stroke: string; glyph: string; glyphFill: string }> = {
  Unverified: { fill: '#ffffff', stroke: '#e65362', glyph: '!', glyphFill: '#e65362' },
  Corroborated: { fill: '#e65362', stroke: '#e65362', glyph: '✓', glyphFill: '#ffffff' },
  'Authority-confirmed': { fill: '#14213d', stroke: '#14213d', glyph: '★', glyphFill: '#ffffff' },
  Contested: { fill: '#7857f7', stroke: '#7857f7', glyph: '?', glyphFill: '#ffffff' },
};

// Fallback baseline coordinates if no dynamic route supplied
const DEFAULT_BASELINE_COORDS: [number, number][] = [
  [18.5204, 73.8420], // Deccan Gymkhana
  [18.5218, 73.8435], // Sambhaji Park
  [18.5230, 73.8465], // JM Road
  [18.5220, 73.8500], // Shivaji Bridge approach
  [18.5185, 73.8535], // Near Mandai / Tulsi Baug corridor
  [18.5195, 73.8554], // Shaniwar Wada
];

const DEFAULT_ALT_COORDS: [number, number][] = [
  [18.5204, 73.8420],
  [18.5180, 73.8440],
  [18.5140, 73.8480],
  [18.5140, 73.8530],
  [18.5165, 73.8540],
  [18.5195, 73.8554],
];

export default function NagarMitraLeafletMap({
  height = 360,
  incidents = [],
  places = [],
  routes = 'base',
  routeCoords,
  altRouteCoords,
  origin,
  destination,
  userLocation,
  showPlaces = true,
  placeCat,
  selectedPlaceId,
  highlightIncidentId,
  onIncidentClick,
  onPlaceClick,
  picker,
  onPickerChange,
  center = [18.5195, 73.8554],
  zoom = 14,
  showBuffers = true,
  showControls = false,
  autoFit = false,
}: NagarMitraMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<{
    places: L.LayerGroup;
    incidents: L.LayerGroup;
    routes: L.LayerGroup;
    buffers: L.LayerGroup;
    picker: L.LayerGroup;
    userLoc: L.LayerGroup;
  } | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialCenter = origin
      ? [origin.lat, origin.lng] as [number, number]
      : center;

    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: zoom,
      zoomControl: showControls,
      attributionControl: true,
      minZoom: 4,
      maxZoom: 19,
    });

    // Real OpenStreetMap Standard Raster Tiles with required attribution
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    const buffersLayer = L.layerGroup().addTo(map);
    const routesLayer = L.layerGroup().addTo(map);
    const placesLayer = L.layerGroup().addTo(map);
    const incidentsLayer = L.layerGroup().addTo(map);
    const pickerLayer = L.layerGroup().addTo(map);
    const userLocLayer = L.layerGroup().addTo(map);

    layersRef.current = {
      places: placesLayer,
      incidents: incidentsLayer,
      routes: routesLayer,
      buffers: buffersLayer,
      picker: pickerLayer,
      userLoc: userLocLayer,
    };

    mapRef.current = map;

    // Handle map click for picker
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onPickerChange) {
        onPickerChange({
          lat: Number(e.latlng.lat.toFixed(5)),
          lng: Number(e.latlng.lng.toFixed(5)),
        });
      }
    });

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update User Current Location Marker
  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;

    layers.userLoc.clearLayers();

    if (userLocation) {
      const uIcon = L.divIcon({
        className: 'user-live-location-marker',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
            <div style="
              position: absolute; width: 32px; height: 32px; border-radius: 50%;
              background: rgba(40, 85, 232, 0.35);
              animation: pulse-ring 1.8s ease-out infinite;
            "></div>
            <div style="
              width: 16px; height: 16px; border-radius: 50%;
              background: #2855e8; border: 3px solid #ffffff;
              box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            "></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const userMarker = L.marker([userLocation.lat, userLocation.lng], {
        icon: uIcon,
        zIndexOffset: 1000,
      });

      const accText = userLocation.accuracy
        ? `<br/><span style="font-size: 11px; color: #64748b;">Accuracy: ±${Math.round(userLocation.accuracy)}m</span>`
        : '';
      userMarker.bindTooltip(`<b>Your Location</b>${accText}`, { sticky: true });
      layers.userLoc.addLayer(userMarker);

      if (userLocation.accuracy && userLocation.accuracy < 200) {
        const accCircle = L.circle([userLocation.lat, userLocation.lng], {
          radius: userLocation.accuracy,
          color: '#2855e8',
          fillColor: '#2855e8',
          fillOpacity: 0.08,
          weight: 1,
        });
        layers.userLoc.addLayer(accCircle);
      }
    }
  }, [userLocation]);

  // Update Routes, Origin/Dest Markers, and Buffers
  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;

    layers.routes.clearLayers();
    layers.buffers.clearLayers();

    const activeBaseCoords: [number, number][] =
      routeCoords && routeCoords.length > 1
        ? routeCoords
        : DEFAULT_BASELINE_COORDS;

    const activeAltCoords: [number, number][] =
      altRouteCoords && altRouteCoords.length > 1
        ? altRouteCoords
        : DEFAULT_ALT_COORDS;

    if (routes !== 'none') {
      // 1. Draw Baseline / Primary Route
      if (routes === 'base' || routes === 'both') {
        const baseCasing = L.polyline(activeBaseCoords, {
          color: '#ffffff',
          weight: 8,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        });
        layers.routes.addLayer(baseCasing);

        const baseLine = L.polyline(activeBaseCoords, {
          color: '#2855e8',
          weight: 5,
          opacity: routes === 'both' ? 0.7 : 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        });
        baseLine.bindTooltip('<b>Selected Route</b>', { sticky: true });
        layers.routes.addLayer(baseLine);

        // Highlight affected segment if requested
        if (highlightIncidentId) {
          const inc = incidents.find((i) => i.id === highlightIncidentId);
          if (inc && activeBaseCoords.length > 2) {
            // Find closest segment to highlight
            const seg = activeBaseCoords.slice(
              Math.max(0, Math.floor(activeBaseCoords.length / 2) - 1),
              Math.min(activeBaseCoords.length, Math.floor(activeBaseCoords.length / 2) + 2)
            );
            const affectedLine = L.polyline(seg, {
              color: '#e65362',
              weight: 7,
              opacity: 1,
              lineCap: 'round',
            });
            affectedLine.bindTooltip('<b>Corridor with Reported Issue</b>', { sticky: true });
            layers.routes.addLayer(affectedLine);
          }
        }
      }

      // 2. Draw Alternative Route
      if ((routes === 'alt' || routes === 'both') && (altRouteCoords || routes === 'both')) {
        const altCasing = L.polyline(activeAltCoords, {
          color: '#ffffff',
          weight: 8,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        });
        layers.routes.addLayer(altCasing);

        const altLine = L.polyline(activeAltCoords, {
          color: '#12a6a0',
          weight: 5,
          dashArray: '8, 6',
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        });
        altLine.bindTooltip('<b>Alternative Route (Lower Reported Risk)</b>', { sticky: true });
        layers.routes.addLayer(altLine);
      }

      // 3. Draw Dynamic Origin Marker 'A'
      const originLat = origin ? origin.lat : activeBaseCoords[0][0];
      const originLng = origin ? origin.lng : activeBaseCoords[0][1];
      const originTitle = origin ? origin.name : 'Origin';

      const startIcon = L.divIcon({
        className: 'custom-start-badge',
        html: `
          <div style="
            display: flex; align-items: center; justify-content: center;
            width: 28px; height: 28px; border-radius: 50%;
            background: #14213d; color: #fff; font-weight: 800; font-size: 11px;
            border: 2.5px solid #ffffff; box-shadow: 0 4px 10px rgba(20,33,61,0.4);
          ">A</div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const startMarker = L.marker([originLat, originLng], { icon: startIcon });
      startMarker.bindTooltip(`<b>Origin: ${originTitle}</b>`, { sticky: true });
      layers.routes.addLayer(startMarker);

      // 4. Draw Dynamic Destination Marker 'B'
      const destLat = destination ? destination.lat : activeBaseCoords[activeBaseCoords.length - 1][0];
      const destLng = destination ? destination.lng : activeBaseCoords[activeBaseCoords.length - 1][1];
      const destTitle = destination ? destination.name : 'Destination';

      const endIcon = L.divIcon({
        className: 'custom-end-badge',
        html: `
          <div style="
            display: flex; align-items: center; justify-content: center;
            width: 28px; height: 28px; border-radius: 50%;
            background: #2855e8; color: #fff; font-weight: 800; font-size: 11px;
            border: 2.5px solid #ffffff; box-shadow: 0 4px 10px rgba(40,85,232,0.4);
          ">B</div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const endMarker = L.marker([destLat, destLng], { icon: endIcon });
      endMarker.bindTooltip(`<b>Destination: ${destTitle}</b>`, { sticky: true });
      layers.routes.addLayer(endMarker);

      // Auto fit map bounds to route if autoFit or new coordinates given
      if (autoFit && activeBaseCoords.length > 0) {
        try {
          const bounds = L.latLngBounds(activeBaseCoords);
          if (origin) bounds.extend([origin.lat, origin.lng]);
          if (destination) bounds.extend([destination.lat, destination.lng]);
          map.fitBounds(bounds, { padding: [35, 35], maxZoom: 16 });
        } catch {
          // ignore invalid bounds
        }
      }
    }

    // 5. Render 100m Hazard Buffers
    if (showBuffers && incidents.length > 0) {
      incidents.forEach((inc) => {
        if (inc.nearRoute || inc.id === highlightIncidentId) {
          const circle = L.circle([inc.lat, inc.lng], {
            radius: 100, // 100 metres
            color: '#e65362',
            fillColor: '#e65362',
            fillOpacity: 0.12,
            weight: 1.5,
            dashArray: '4, 4',
          });
          circle.bindTooltip(`<b>100m Hazard Buffer</b><br/>${inc.title}`, { sticky: true });
          layers.buffers.addLayer(circle);
        }
      });
    }
  }, [routes, routeCoords, altRouteCoords, origin, destination, incidents, highlightIncidentId, showBuffers, autoFit]);

  // Update Places Markers
  useEffect(() => {
    const layers = layersRef.current;
    if (!layers) return;

    layers.places.clearLayers();

    if (!showPlaces) return;

    const filtered = placeCat && placeCat !== 'All'
      ? places.filter((p) => {
          const c = p.cat.toLowerCase();
          const target = placeCat.toLowerCase();
          if (target === 'food') return c === 'food' || c === 'cafe' || c === 'restaurant';
          if (target === 'heritage') return c === 'heritage' || c === 'temple' || c === 'museum' || c === 'cultural';
          if (target === 'stays') return c === 'stays' || c === 'hotel' || c === 'hostel';
          if (target === 'toilets') return c === 'toilets' || c === 'toilet';
          if (target === 'health') return c === 'health' || c === 'hospital' || c === 'emergency';
          if (target === 'parks' || target === 'activities') return c === 'park' || c === 'activities';
          return c === target;
        })
      : places;

    filtered.forEach((p) => {
      const isSelected = selectedPlaceId === p.id;
      const pinColor = isSelected ? '#14213d' : '#2855e8';

      const placeIcon = L.divIcon({
        className: 'custom-place-marker',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <div style="
              display: flex; align-items: center; justify-content: center;
              width: ${isSelected ? '32px' : '26px'};
              height: ${isSelected ? '32px' : '26px'};
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              background: ${pinColor};
              border: 2px solid #ffffff;
              box-shadow: 0 3px 8px rgba(0,0,0,0.3);
              transition: all 0.2s ease;
            ">
              <div style="
                width: 8px; height: 8px; border-radius: 50%; background: #ffffff;
              "></div>
            </div>
            ${isSelected || p.id === 'place-001' || p.id === 'p1' ? `
              <div style="
                margin-top: 2px;
                background: #ffffff;
                color: #14213d;
                font-weight: 800;
                font-size: 11px;
                padding: 1px 6px;
                border-radius: 6px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.15);
                border: 1px solid #e3e8f1;
                white-space: nowrap;
              ">
                ${p.name}
              </div>
            ` : ''}
          </div>
        `,
        iconSize: [36, 42],
        iconAnchor: [18, 28],
      });

      const marker = L.marker([p.lat, p.lng], { icon: placeIcon });
      marker.on('click', () => onPlaceClick?.(p.id));

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px; line-height: 1.4; color: #14213d; padding: 2px; min-width: 180px;">
          <div style="font-weight: 800; font-size: 14px; margin-bottom: 2px;">${p.name}</div>
          <div style="color: #65728a; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 4px;">${p.cat} • ${p.dist}</div>
          <p style="margin: 0 0 6px 0; color: #475569; font-size: 12px;">${p.desc}</p>
          <div style="font-size: 11px; color: #65728a;">Rating: <b>${p.rating ?? 'Not available'}</b></div>
        </div>
      `);

      layers.places.addLayer(marker);
    });
  }, [places, showPlaces, placeCat, selectedPlaceId, onPlaceClick]);

  // Update Incident Markers (Figma Diamond Badges)
  useEffect(() => {
    const layers = layersRef.current;
    if (!layers) return;

    layers.incidents.clearLayers();

    incidents.forEach((inc) => {
      const isHot = highlightIncidentId === inc.id;
      const m = MARK_COLORS[inc.verif] || MARK_COLORS.Unverified;
      const isSim = inc.source === 'Simulated demo data';
      const size = isHot ? 14 : 11;

      const diamondIcon = L.divIcon({
        className: 'custom-incident-marker',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; cursor: pointer;">
            ${isHot ? `
              <div style="
                position: absolute; width: 34px; height: 34px; border-radius: 50%;
                background: rgba(230, 83, 98, 0.4);
                animation: pulse-ring 1.6s ease-out infinite;
              "></div>
            ` : ''}
            <div style="
              width: ${size * 2}px; height: ${size * 2}px;
              transform: rotate(45deg);
              background: ${m.fill};
              border: 2.5px ${isSim ? 'dashed' : 'solid'} ${m.stroke};
              border-radius: 4px;
              display: flex; align-items: center; justify-content: center;
              box-shadow: 0 3px 8px rgba(0,0,0,0.25);
            ">
              <span style="
                transform: rotate(-45deg);
                font-size: ${size * 1.1}px;
                font-weight: 900;
                color: ${m.glyphFill};
                line-height: 1;
              ">
                ${m.glyph}
              </span>
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([inc.lat, inc.lng], { icon: diamondIcon });
      marker.on('click', () => onIncidentClick?.(inc));

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px; line-height: 1.4; color: #14213d; min-width: 210px; padding: 2px;">
          <div style="color: #e65362; font-size: 11px; font-weight: 800; text-transform: uppercase;">${inc.type} • ${inc.id}</div>
          <div style="font-weight: 800; font-size: 14px; margin-bottom: 4px;">${inc.title}</div>
          <p style="margin: 0 0 6px 0; color: #475569; font-size: 12px;">${inc.desc || inc.place}</p>
          <div style="border-top: 1px solid #e3e8f1; padding-top: 4px; font-size: 11px; color: #65728a;">
            <div>Verification: <strong style="color: #14213d;">${inc.verif}</strong></div>
            <div>Freshness: <strong style="color: #12a6a0;">${inc.fresh}</strong></div>
            <div>Source: <em>${inc.source}</em></div>
          </div>
        </div>
      `);

      layers.incidents.addLayer(marker);
    });
  }, [incidents, highlightIncidentId, onIncidentClick]);

  // Update Location Picker Pin
  useEffect(() => {
    const layers = layersRef.current;
    if (!layers) return;

    layers.picker.clearLayers();

    if (!picker) return;

    const pinColor = picker.confirmed ? '#1f9d68' : '#e65362';

    const pinIcon = L.divIcon({
      className: 'custom-picker-pin',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; width: 36px; height: 42px;">
          <div style="
            position: absolute; width: 36px; height: 36px; border-radius: 50%;
            background: ${pinColor}; opacity: 0.3;
            animation: pulse-ring 1.8s infinite;
          "></div>
          <div style="
            width: 28px; height: 28px; border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            background: ${pinColor};
            border: 3px solid #ffffff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.35);
            display: flex; align-items: center; justify-content: center;
          ">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: #ffffff;"></div>
          </div>
        </div>
      `,
      iconSize: [36, 42],
      iconAnchor: [18, 38],
    });

    const marker = L.marker([picker.lat, picker.lng], {
      icon: pinIcon,
      draggable: true,
    });

    marker.on('dragend', (e) => {
      const latlng = e.target.getLatLng();
      if (onPickerChange) {
        onPickerChange({
          lat: Number(latlng.lat.toFixed(5)),
          lng: Number(latlng.lng.toFixed(5)),
        });
      }
    });

    layers.picker.addLayer(marker);
  }, [picker, onPickerChange]);

  return (
    <div style={{ height }} className="relative w-full overflow-hidden bg-[#eef2f7]">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
