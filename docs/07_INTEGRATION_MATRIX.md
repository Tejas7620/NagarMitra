# NagarMitra AI — Frontend & Backend Integration Matrix

**Project:** NagarMitra AI  
**Hackathon:** PromptWars × Brain DYP COEI  
**Status:** FULLY INTEGRATED & VERIFIED  

---

## 1. Component to Backend Endpoint Mapping

| Frontend Component / User Action | Backend Endpoint | HTTP Method | Request Payload | Response Handling | State Effect |
|---|---|---|---|---|---|
| **Search Input & Autocomplete** | `/api/geocode/search` | `GET` | `?q={query}&limit=8` | `GeocodeItem[]` | Centers map on selected coordinate, updates destination state |
| **Category Pill Bar** (`Food`, `Heritage`, `Toilets`, etc.) | `/api/places` | `GET` | `?category={cat}&lat={lat}&lng={lng}&radius=25` | `Place[]` with distances | Renders custom category markers and populates place cards |
| **Map Viewport Pan/Zoom** | `/api/places` | `GET` | `?bbox={minLng,minLat,maxLng,maxLat}` | Viewport-filtered `Place[]` | Synchronizes visible markers with current bounding box |
| **Place Detail Card Directions Button** | `/api/routes` | `POST` / `GET` | `{ origin, destination, travelMode: 'walking', alternatives: true }` | `LineString` routes with exposure scores | Draws route on Leaflet map, highlights "Lower Reported Risk" |
| **Travel Mode Switcher** (Walk, Drive, Cycle) | `/api/routes` | `POST` | `{ origin, destination, travelMode }` | Updated mode geometry and durations | Recalculates turn instructions, distance, and ETA |
| **Incident Report Composer Submit Button** | `/api/reports` | `POST` | `{ text, latitude, longitude, locationText, photoUrl }` | Saved `Report`, updated `Incident` | Shows confirmation, adds incident marker to map, starts as unverified |
| **Incident Photo Attachment** | `/api/media/upload` | `POST` | `FormData({ file })` | `{ url: '/uploads/uuid.jpg' }` | Attaches URL to report payload before submission |
| **Incident Marker Click / Ledger Sheet** | `/api/incidents/[id]/evidence` | `GET` | (URL param `id`) | Evidence Ledger factors, reports | Opens sheet displaying support score breakdown and source factors |
| **Impact Replay Button** | `/api/impact-replay` | `POST` | `{ incidentId, origin, destination, travelMode }` | Before/after exposure and reason | Displays before vs after route comparison, delta ETA, and explanation |
| **Place Comparison Modal** | `/api/places/compare` | `POST` | `{ placeIds: [id1, id2], preferences }` | Ranked list with criteria disclosures | Displays comparative scores and transparent caveats |
| **Outing Itinerary Generator** | `/api/itinerary` | `POST` | `{ interests, budget, duration, travelMode }` | Ordered 2–3 stop itinerary | Displays stops, transit minutes, and safety alerts |
| **Live Weather Widget** | `/api/weather` | `GET` | `?latitude={lat}&longitude={lng}` | Temp (°C), condition, icon, wind | Updates top weather badge on map with live Open-Meteo data |
| **Admin Demo Reset Button** | `/api/reset` | `POST` | (empty body) | `{ success: true }` | Resets persistent disk store to clean seed state |

---

## 2. API Contract Envelope Standard

All responses strictly adhere to uniform JSON contracts:

### Success Format:
```json
{
  "success": true,
  "data": { ... },
  "dataMode": "live" | "live_curated" | "cached_osrm" | "demo_local_storage",
  "timestamp": "2026-10-09T08:00:00.000Z"
}
```

### Failure Format:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human-readable description of error",
    "details": { ... }
  }
}
```
