# NagarMitra AI — Code Structure & Architectural Guide

> **Platform:** Next.js 16 (Turbopack) + React 19 + TypeScript + Leaflet + TailwindCSS  
> **Event:** PromptWars × Brain DYP COEI Hackathon

---

## 1. Architectural Overview

NagarMitra AI adheres to a **Domain-Driven, Layered Clean Architecture** designed for high modularity, predictable data flow, strict typing, and separation of concerns:

```
┌────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                   │
│  - components/figma/NagarMitraApp.tsx (Mobile UI)      │
│  - components/NagarMitraLeafletMap.tsx (GIS Map)       │
│  - components/Navbar, PlacesPanel, ReportModal, etc.   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                      API LAYER                         │
│  - /api/places, /api/geocode, /api/routes              │
│  - /api/incidents, /api/reports, /api/impact-replay    │
│  - /api/weather, /api/media/upload, /api/itinerary     │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│             DOMAIN / EVIDENCE ENGINE LAYER             │
│  - lib/evidence/support-score.ts (Heuristic scoring)   │
│  - lib/evidence/duplicate-matching.ts (Spatiotemporal)│
│  - lib/evidence/freshness.ts (Decay models)            │
│  - lib/geo/route-exposure.ts (Turf.js Corridors)       │
│  - lib/ai/extractor.ts (Hybrid NLP/Heuristic parsing)  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               DATA & PERSISTENCE LAYER                 │
│  - lib/repositories/store.ts (Unified Memory + Disk)   │
│  - data/places.json (Curated POIs)                     │
│  - data/db/persisted-incidents.json (Evidence Store)   │
│  - data/db/persisted-reports.json (Citizen Reports)    │
│  - Supabase PostgreSQL / PostGIS schema migrations     │
└────────────────────────────────────────────────────────┘
```

---

## 2. Directory Layout & Module Responsibilities

| Directory | Purpose & Contents |
| :--- | :--- |
| `app/` | Next.js App Router root. Contains all 14 dynamic REST endpoints under `app/api/`, the root landing layout, and desktop view. |
| `app/api/` | Strictly typed Next.js route handlers. Handles Zod validation, HTTP status codes, and JSON serialization. |
| `components/` | Reusable React UI components, interactive Leaflet map wrappers, modals, feeds, and barrel exports. |
| `components/figma/` | Production mobile-first UI integrated from Figma Make design tokens with full interactive state. |
| `lib/ai/` | Hybrid AI extraction pipeline (Gemini API with deterministic heuristic fallback). |
| `lib/evidence/` | Core algorithmic logic: Bayesian-inspired support scoring, spatiotemporal clustering, and decay. |
| `lib/geo/` | Geospatial computation using Turf.js: line slicing, buffer corridors, and point-to-polyline exposure. |
| `lib/repositories/` | Persistent repository pattern. Reads and atomically writes to persistent JSON / Supabase. |
| `lib/services/` | Strongly-typed client-side API SDK (`api` singleton). |
| `lib/validations/` | Zod runtime request and query parameter validation schemas. |
| `lib/types.ts` | Source-of-truth TypeScript interfaces and domain types. |
| `data/` | High-quality geographic seed data for Pune, OSM fixtures, and persistent storage. |
| `docs/` | Comprehensive technical specifications, QA test plans, and problem statement analysis. |
| `scripts/` | Automated test suite verifying contract integrity across 32 assertions. |
| `supabase/` | SQL migration scripts for enterprise PostgreSQL + PostGIS deployment. |

---

## 3. Code Quality Principles

1. **Strict Type Safety**:
   - Zero unsafely cast objects. Domain entities (`Place`, `Incident`, `Report`, `RouteScenario`) are centralized in `lib/types.ts`.
   - Client and server communication is strictly validated through `lib/validations/schemas.ts`.

2. **Clean Route Handlers**:
   - GET route handlers use Next.js `request.nextUrl` for query parameters.
   - Internal Next.js prerender interrupts are re-thrown (`err?.digest?.startsWith('NEXT_')`) to ensure dynamic rendering during static builds.

3. **Resilient Offline / Demo Mode**:
   - Every external service (Nominatim geocoding, OSRM routing, Open-Meteo weather, Gemini AI) includes transparent offline fallbacks and fixtures.
   - Responses disclose data provenance (`dataMode: 'live' | 'demo' | 'mixed'`).

4. **Zero-Deadlock State Management**:
   - Client components avoid cascading `setState` calls inside effects.
   - Async data fetching is keyed to user interaction or throttled mount lifecycle.

---

## 4. Testing & Verification

- **Automated Backend Test Suite**:
  ```bash
  node scripts/test-backend.mjs
  ```
  Runs 32 end-to-end integration assertions covering all 14 endpoints, spatial routing, clustering, and security.

- **Type Checking & Production Build**:
  ```bash
  npm run build
  ```
  Ensures 100% clean TypeScript compilation, Next.js page optimization, and zero prerender errors.

- **ESLint & Code Standards**:
  ```bash
  npm run lint
  ```
  Enforces Next.js, React, and TypeScript formatting standards across all source files.
