# NagarMitra AI — Frontend Integration Report

**Product:** NagarMitra AI  
**Integration Scope:** Figma Make UI Export Integration + Next.js App Router + Real Leaflet OpenStreetMap  
**Author:** Lead Frontend & Integration Engineering  
**Date:** October 9, 2026  

---

## 1. Overview & Objectives

The primary objective of this integration was to safely integrate the Figma Make frontend export (`Frontend_figma/`) into the existing Next.js 16 full-stack architecture, while fulfilling all functional requirements:
1. Preserve 100% of the Figma visual styling, color palette, custom diamond markers, typography, and micro-animations.
2. Replace static/mock map placeholders with a genuine interactive Leaflet OpenStreetMap engine using standard raster tiles and visible OSM attribution.
3. Bridge frontend components with backend API endpoints (`/api/reports`, `/api/incidents`, `/api/places`, `/api/routes`, `/api/impact-replay`) via a strongly typed service client.
4. Eliminate all dead UI elements, wire up real state transitions, and enforce honest safety language ("Lower reported risk", "Unverified until corroborated").

---

## 2. Architecture & File Structure

```
citypulse-ai/
├── app/
│   ├── api/
│   │   ├── impact-replay/route.ts  # POST: Before/After route corridor exposure calculation
│   │   ├── incidents/route.ts      # GET: Active incidents with recalculated support score
│   │   ├── places/route.ts         # GET: Curated central Pune landmarks
│   │   ├── reports/route.ts        # POST: Citizen report submission (AI/fallback + dedup)
│   │   ├── reset/route.ts          # POST: Resets in-memory demo store to seed data
│   │   └── routes/route.ts         # GET: Live OSRM / precomputed route candidates
│   ├── globals.css                 # Figma design tokens, animations (pulse, flow, rise), resets
│   ├── layout.tsx                  # Root HTML shell, Manrope font, mobile viewport meta
│   └── page.tsx                    # Next.js entrypoint mounting NagarMitraApp
├── components/
│   ├── figma/
│   │   └── NagarMitraApp.tsx       # Core unified mobile-first application shell (11 screens)
│   ├── NagarMitraLeafletMap.tsx    # Real Leaflet 1.9 map with OSM raster tiles & Figma markers
│   └── LeafletMap.tsx              # Standalone spatial visualizer
├── lib/
│   ├── ai/
│   │   ├── extractor.ts            # Gemini 2.0 Flash + keyword heuristic fallback
│   │   └── schema.ts               # Zod validation schemas
│   ├── evidence/
│   │   ├── duplicate-matching.ts   # Haversine distance (<150m) & temporal window clustering
│   │   ├── freshness.ts            # Incident type-specific half-life decay calculation
│   │   └── support-score.ts        # Heuristic evidence support scoring (0.00 - 1.00)
│   ├── geo/
│   │   └── route-exposure.ts       # Turf.js point-to-line 100m corridor danger index math
│   ├── repositories/
│   │   └── store.ts                # In-memory demo repository with seed dataset
│   ├── services/
│   │   └── api-client.ts           # Typed API Client consuming Next.js route handlers
│   └── types.ts                    # Central TypeScript interfaces
```

---

## 3. Real Map Implementation Details

### 3.1 Tile Layer & Attribution
- **Tile URL**: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
- **Max Zoom**: `19`
- **Attribution**: Clearly visible on the map corner: `© OpenStreetMap contributors`.
- **Bounding Box**: Constrained to the Pune metropolitan corridor (`[18.35, 73.65]` to `[18.65, 74.05]`), with default focus on Central Pune (`[18.5185, 73.8500]`).

### 3.2 Custom DivIcons & Layering
1. **Figma Diamond Markers**: Custom `L.divIcon` representing incident reports with 45° rotated square glyphs:
   - **Unverified**: White center, coral border (`#e65362`), `!` glyph.
   - **Corroborated**: Filled coral (`#e65362`), `✓` glyph.
   - **Authority-confirmed**: Filled dark navy (`#14213d`), `★` glyph.
   - **Contested**: Filled violet (`#7857f7`), `?` glyph.
   - **Simulated Demo Marker**: Dashed stroke border styling.
   - **Hot / Trigger Incident**: Outer pulsing radar ring (`animation: pulse-ring 1.6s infinite`).
2. **Place Pins**: Teardrop pin markers matching Figma styling with inner white circular dot and category labels.
3. **Route Polylines**:
   - **Baseline Route**: Solid blue polyline (`#2855e8`, weight 5) with white contrast casing.
   - **Alternative Route**: Dashed teal polyline (`#12a6a0`, weight 5, dashArray `8, 6`) with smooth animation.
   - **Affected Corridor**: Highlighted in coral red (`#e65362`, weight 7) on the affected segments.
4. **100m Hazard Buffer Circles**: Rendered using `L.circle` with 100-meter radius, semi-transparent red fill (`opacity: 0.12`), and dashed border (`dashArray: 4, 4`).
5. **Interactive Pin Picker**: Draggable and click-to-place pin with real-time coordinate updates and reverse display.

---

## 4. API Client & Engine Integration

1. **Report Submission (`POST /api/reports`)**:
   - Captures user's confirmed map pin coordinates.
   - Submits through `apiClient.submitReport(...)`.
   - Backend evaluates AI structuring, checks duplicate radius (<150m), links or creates incident, and returns updated evidence score.
2. **Impact Replay (`POST /api/impact-replay`)**:
   - Evaluates corridor exposure for Baseline vs Alternative routes.
   - Returns deterministic explanations:
     - Shift: "Newly reported waterlogging may affect the previously recommended route... recommendation changed to Alternative via Bajirao Rd."
     - No shift: "Report was considered but does not justify changing the recommended route."
3. **Routes Ingestion (`GET /api/routes`)**:
   - Fetches live or cached OSRM route candidates with genuine distance (meters) and duration (seconds).

---

## 5. Mobile & Responsive Layout

- On mobile viewports (smartphones), the app renders full width/height with safe area insets (`env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`).
- On desktop viewports (monitors, laptops), the app is presented inside an iPhone-style centered device frame (`390×844px`) accompanied by a left-hand navigation and feature showcase drawer.

---

## 6. Verification Checklist

- [x] All 11 screens reachable and functional.
- [x] Genuine Leaflet map with live OpenStreetMap raster tiles.
- [x] Attribution to OpenStreetMap contributors visible.
- [x] Zoom, pan, and pin placement active.
- [x] No `window is not defined` SSR hydration errors.
- [x] TypeScript compiled cleanly with zero errors (`npm run build`).
- [x] Backend routes respond with HTTP 200 OK.
