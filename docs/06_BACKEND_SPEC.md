# NagarMitra AI — Complete Backend & AI Specification

**Project:** NagarMitra AI  
**Hackathon:** PromptWars × Brain DYP COEI  
**Platform:** Mobile-first web application with Android/PWA readiness  
**Backend Framework:** Next.js Route Handlers (Node.js runtime, Turbopack)  
**Geo Computation:** `@turf/turf` (Spherical point-to-line distance, WGS84 projection)  
**AI Extraction:** Google Gemini 1.5 Flash (`@google/generative-ai`) with deterministic NLP fallback  
**Database:** Dual-mode persistence (Supabase PostgreSQL schema + file-backed persistent disk store in `data/db/`)  
**Status:** IMPLEMENTED, TESTED, AND PRODUCTION-VERIFIED  

---

## 1. Architecture Overview

NagarMitra AI backend implements the complete decision-support pipeline specified in the problem statement:

```
NEW INFORMATION (Citizen Report / Media)
       ↓
STRUCTURED INCIDENT (Gemini 1.5 Flash / NLP Fallback)
       ↓
EVIDENCE ASSESSMENT (Freshness Decay + Spatial Deduplication + Verification Weight)
       ↓
GEOGRAPHIC IMPACT (Turf.js 100m Corridor Buffer Proximity Scoring)
       ↓
ROUTE / PLAN ANALYSIS (OSRM Multi-modal Geometry & Alternatives)
       ↓
EXPLAINED RECOMMENDATION ("Lower Reported Risk" Comparative Guidance)
```

---

## 2. API Endpoints Specification

### 2.1 Places Discovery
- **`GET /api/places`**
  - **Query Params**: `category`, `bbox`, `latitude`, `longitude`, `radius`, `query`, `limit`
  - **Categories**: `food`, `heritage`, `tourist_attraction`, `hotel`, `public_toilet`, `drinking_water`, `transport`, `health`, `park`, `shopping`, `other`
  - **Response Contract**:
    ```json
    {
      "success": true,
      "places": [
        {
          "id": "place-010",
          "name": "Deccan Gymkhana",
          "category": "heritage",
          "latitude": 18.5173,
          "longitude": 73.8416,
          "distanceKm": 0.4,
          "distanceFormatted": "400 m",
          "provider": "openstreetmap",
          "source": "curated_pune"
        }
      ],
      "count": 1,
      "dataMode": "live_curated",
      "attribution": "© OpenStreetMap contributors, Pune Municipal Corporation Open Data"
    }
    ```

### 2.2 Geocoding & Search
- **`GET /api/geocode/search?q=...&limit=...`**
  - **Provider**: OpenStreetMap Nominatim with curated landmark prioritization.
  - **Coverage**: All of India and global addresses.
  - **Response**: Array of normalized results (`id`, `name`, `displayName`, `lat`, `lng`, `category`, `address`, `source`).
- **`GET /api/geocode/reverse?latitude=...&longitude=...`**
  - **Response**: Locality, display name, and city attributes.

### 2.3 Routing Backend
- **`POST /api/routes`** (Section 8 Standard)
  - **Request Body**:
    ```json
    {
      "origin": { "latitude": 18.5204, "longitude": 73.8567 },
      "destination": { "latitude": 18.5162, "longitude": 73.8568 },
      "travelMode": "walking",
      "alternatives": true
    }
    ```
  - **Travel Modes**: `walking` (OSRM foot), `driving` (OSRM driving), `cycling` (OSRM bicycle).
  - **Response Structure**:
    ```json
    {
      "routes": [
        {
          "id": "uuid",
          "geometry": { "type": "LineString", "coordinates": [[73.8567, 18.5204], ...] },
          "distanceMeters": 569,
          "durationSeconds": 405,
          "travelMode": "walking",
          "source": "live",
          "label": "Fastest Route",
          "exposureScore": 0.0,
          "affectedIncidents": []
        }
      ],
      "selectedRouteId": "uuid",
      "dataMode": "live"
    }
    ```

### 2.4 Incident Reports
- **`POST /api/reports`** (Section 9 Core Endpoint)
  - **Validation**: Text (3–1000 characters), valid WGS84 coordinates.
  - **Processing**:
    1. Gemini 1.5 Flash structured extraction (or deterministic NLP fallback).
    2. Spatial duplicate detection within 150m and matching temporal window.
    3. If duplicate found: links report, increments submission count, and transitions verification status to `corroborated`.
    4. If new: creates incident starting with `unverified` status.
    5. Commits to persistent file-backed disk store (`data/db/`) and Supabase PostgreSQL.
- **`GET /api/reports/[id]`**: Retrieves single report by ID.

### 2.5 Incident & Evidence Retrieval
- **`GET /api/incidents`**: Filterable catalog by `bbox`, `radius`, `incidentType`, `verificationStatus`, `freshnessStatus`, `lifecycleStatus`, `isSimulated`, and `limit`.
- **`GET /api/incidents/[id]`**: Detailed incident record with linked citizen reports count.
- **`GET /api/incidents/[id]/evidence`**: Evidence Ledger breakdown with support score factors, freshness windows, and report references.

### 2.6 Impact Replay Backend
- **`POST /api/impact-replay`** (Section 13 Standard)
  - **Request Body**: `{ origin, destination, travelMode, incidentId, baselineRouteId }` (or `{ scenarioId, incidentId }`).
  - **Calculation**: Evaluates candidate route corridors against incidents before and after the trigger incident.
  - **Response Envelope**:
    ```json
    {
      "success": true,
      "before": { "routeId": "...", "distanceMeters": 569, "reportedExposure": 0 },
      "after": { "routeId": "...", "distanceMeters": 569, "reportedExposure": 0 },
      "changed": false,
      "reason": "Explanation derived from actual route corridor calculations",
      "supportingIncidentIds": [],
      "dataMode": "live"
    }
    ```

### 2.7 Place Comparison
- **`POST /api/places/compare`** (Section 15)
  - Compares 2–5 places across price bands, ratings, accessibility, cleanliness, and nearby active incident counts within 500m.

### 2.8 Lightweight Itinerary
- **`POST /api/itinerary`** (Section 16)
  - Generates balanced 2–3 stop outings matching requested interests, budget, and travel mode with realistic dwell and transit times.

### 2.9 Weather Backend
- **`GET /api/weather?latitude=...&longitude=...`** (Section 17)
  - Integrates with Open-Meteo CC BY 4.0 API for real-time temperature (°C), feels-like, humidity (%), precipitation (mm), wind speed (km/h), and WMO condition codes.

### 2.10 Secure Media Upload
- **`POST /api/media/upload`** (Section 5.5 & 21)
  - Enforces strict MIME whitelisting (JPEG, PNG, WebP, GIF), 5MB size limit, and UUID naming in `/public/uploads/`.

---

## 3. Evidence Engine Mathematical Model

### 3.1 Route Exposure Scoring
For any incident within the 100m corridor of a route line string:
$$\text{ProximityFactor}(d) = \begin{cases} 1.0 & d \le 25\text{m} \\ 0.7 & 25\text{m} < d \le 50\text{m} \\ 0.3 & 50\text{m} < d \le 100\text{m} \\ 0.0 & d > 100\text{m} \end{cases}$$

$$\text{ExposureContribution} = \text{ProximityFactor} \times \text{SeverityFactor} \times \text{FreshnessFactor} \times \text{VerificationWeight}$$

### 3.2 Verification Weighting
- `authority_confirmed`: 1.0
- `corroborated`: 0.7
- `unverified`: 0.3
- `contested`: 0.15

### 3.3 Freshness Decay Windows
- **Waterlogging**: Recent $\le 3$h, Aging $\le 12$h, Stale $> 12$h
- **Temporary Obstruction**: Recent $\le 6$h, Aging $\le 24$h, Stale $> 24$h
- **Road Damage / Potholes**: Recent $\le 7$ days, Aging $\le 30$ days, Stale $> 30$ days
- **Streetlight**: Recent $\le 7$ days, Aging $\le 30$ days, Stale $> 30$ days
