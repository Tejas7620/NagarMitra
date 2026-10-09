# NagarMitra AI — Frontend Specification

**Product:** NagarMitra AI (शहराचे संकेत, निर्णय तुमचे — Explore. Report. Decide with evidence.)  
**Region:** Central Pune, Maharashtra  
**Tech Stack:** Next.js 16 (App Router), React 19, Leaflet 1.9, Tailwind CSS 4, Manrope Typography  
**Status:** IMPLEMENTED & VALIDATED

---

## 1. Architecture & Rendering Mode

| Screen / View | Identifier | Components Used | Rendering Mode | Purpose |
|---|---|---|---|---|
| **Map Screen** | `map` | `MapScreen`, `NagarMitraLeafletMap` | Client (`'use client'`) + Dynamic SSR-safe Leaflet | Interactive Central Pune basemap with OpenStreetMap raster tiles, place pins, diamond incident badges, 100m danger buffer circles, baseline route. |
| **Explore Places** | `explore` | `Explore`, `Card`, `Chip` | Client (`'use client'`) | Curated directory of 18 Pune landmarks, category filter, list/map toggle, compare selector. |
| **Compare Places** | `compare` | `Compare`, `Header`, `Table` | Client (`'use client'`) | Side-by-side comparison matrix across price, ratings, accessibility, distance, and nearby reports. |
| **Report Composer** | `report` | `Report`, `Sheet`, `NagarMitraLeafletMap` | Client (`'use client'`) | Multi-modal report intake (Text, simulated Photo upload, simulated Voice note), type selector, interactive map pin picker. |
| **AI Processing** | `processing` | `Processing`, `Card` | Client (`'use client'`) | 4-stage pipeline visualization (Reading report, Extracting details, Validating location, Checking duplicates) with AI-unavailable fallback simulation. |
| **Review Details** | `review` | `Review`, `Card`, `Btn` | Client (`'use client'`) | User confirmation of AI-extracted fields, uncertainty notes, user-confirmed coordinates, and submission trigger via `POST /api/reports`. |
| **Submission Confirmation** | `submitted` | `Submitted`, `Card` | Client (`'use client'`) | Celebratory submission confirmation badged with "Unverified", audit ledger details, and 1-tap Impact Replay launcher. |
| **Impact Replay** | `replay` | `Replay`, `NagarMitraLeafletMap` | Client (`'use client'`) | Interactive Before/After timeline, dual route visualizer (Baseline vs Alternative), affected segment highlight, delta comparison, and deterministic explanation. |
| **Evidence Ledger** | `ledger` | `Ledger`, `Expand`, `Sheet` | Client (`'use client'`) | Transparent audit registry with filters for Verification status (Unverified, Corroborated, Authority, Contested), Freshness, and Data source. |
| **Incident Detail** | `incident` | `IncidentDetail`, `NagarMitraLeafletMap` | Client (`'use client'`) | Deep-dive screen with full evidence scoring breakdown, duplicate matching history, route exposure distance, and Impact Replay trigger. |
| **Routes Comparison** | `routes` | `Routes`, `NagarMitraLeafletMap` | Client (`'use client'`) | Comparative walking routes: Fastest Route vs Lower Reported Risk Route, trade-off explanations, route exposure metrics, and fallback simulation. |
| **Outing Planner (P2)** | `planner` | `Planner`, `Card`, `Chip` | Client (`'use client'`) | Multi-stop outing itinerary generator weighing user budget, time duration, and Evidence Ledger caution signals. |

---

## 2. Real Leaflet Map Specification

1. **Basemap Provider**: Standard OpenStreetMap raster tiles (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`).
2. **Attribution**: Clearly visible on the bottom-right corner: `© OpenStreetMap contributors`.
3. **Interactive Capabilities**: Pan, zoom, pinch on mobile, double-click zoom, smooth recenter, and click-to-pin location selection.
4. **Custom Styled DivIcons**:
   - **Diamond Markers**: 45° rotated square glyphs with custom borders and colors representing verification status (`!`, `✓`, `★`, `?`), with pulsing halos for active trigger incidents and dashed borders for simulated demo incidents.
   - **Place Pins**: Teardrop pins with category icons and name tags.
   - **Route Polylines**: Solid blue (`#2855e8`) for baseline route, dashed teal (`#12a6a0`) with animation for alternative route, and red (`#e65362`) for affected hazard corridor.
   - **100m Hazard Buffers**: Translucent red circles around near-route incidents displaying danger zone bounds.
   - **Pin Dropper**: Interactive draggable and clickable marker capturing precise latitude/longitude.

---

## 3. Design System & Styling Tokens

- **Brand Typography**: Manrope via Google Fonts.
- **Palette**:
  - Background: `#f6f8fc` (Canvas), `#ffffff` (Cards), `#0f1a33` (Night Replay mode)
  - Navy (Primary Text & Badges): `#14213d`
  - Brand Blue: `#2855e8`
  - Violet Accent: `#7857f7`
  - Teal Route Alternative: `#12a6a0`
  - Coral Hazard Alert: `#e65362`
  - Amber Caution: `#f2a93b`
  - Success Green: `#1f9d68`
- **Micro-Animations**:
  - `pulse`: Pulsing radar glow on active hazards.
  - `flow`: Flowing dashed stroke on alternative routes.
  - `rise`: Smooth upward fade-in on sheets, cards, and screen transitions.
