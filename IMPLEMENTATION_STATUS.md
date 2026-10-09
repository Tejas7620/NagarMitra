# NagarMitra AI — Implementation Status & Architecture Audit

**Project:** NagarMitra AI (शहराचे संकेत, निर्णय तुमचे — Explore. Report. Decide with evidence.)  
**Hackathon:** PromptWars × Brain DYP COEI  
**Scope:** AI-powered, mobile-first city exploration & evidence-aware route decision support platform  
**Region Covered:** Pune Metropolitan Region (Central Pune, Deccan Gymkhana, Shaniwar Wada, Dagdusheth, Mandai, FC Road, JM Road, Kalyani Nagar, Parvati Hill) with arbitrary multi-city search support across India via OpenStreetMap Nominatim.  
**Status:** COMPLETED, AUDITED & DEMO-READY  

---

## 1. Executive Summary & Root Cause Analysis

### A. Root Cause of the Original "Constant Map, Route & Destination" Problem
The initial application had several hardcoded assumptions across frontend and backend:
1. **Hardcoded Leaflet Baseline Coordinates**: In `components/NagarMitraLeafletMap.tsx`, `BASELINE_COORDS` was hardcoded to a static polyline from Deccan Gymkhana to Shaniwar Wada, and `ALTERNATIVE_COORDS` was hardcoded to Bajirao Road. Origin badge 'A' (`18.5204, 73.8420`) and destination badge 'B' (`18.5195, 73.8554`) were fixed, ignoring any user-selected origin, destination, or current location.
2. **Fixed 4-Place Dataset in UI**: In `components/figma/NagarMitraApp.tsx`, `PLACES` was hardcoded to 4 demo items (`p1..p4`), disconnected from the dynamic `places.json` database and external OpenStreetMap APIs. Category clicks merely toggled button styles without loading real category data.
3. **OSRM Route Fallback Override**: In `app/api/routes/route.ts`, if OSRM returned fewer than 2 routes (standard when only one primary driving/walking path exists), the server discarded the real OSRM route and forced a fallback to `demo-routes.json` between Deccan Gymkhana and Koregaon Park.
4. **Geolocation Mock**: "Use My Location" merely flashed a toast string without setting origin coordinates, triggering map re-centering, or updating route geometry.
5. **No Geocoding / Destination Search Endpoint**: The application lacked a `/api/geocode` route, meaning users could not search for iconic landmarks like Dagdusheth Ganpati Temple, Aga Khan Palace, or arbitrary addresses.

### B. Summary of Repairs & Implementation
- Replaced static map polylines with **live GeoJSON road geometries** fetched from OpenStreetMap's OSRM router.
- Connected the Geolocation API to detect real device coordinates (`navigator.geolocation.getCurrentPosition`), place an accuracy-ringed user location marker on Leaflet, and update routing from the user's position.
- Created `/api/geocode` powered by OpenStreetMap Nominatim + curated landmarks with 1-tap autocomplete for major Pune heritage and urban destinations.
- Enhanced `/api/places` with dynamic category discovery supporting **10 categories**: Food, Heritage, Stays, Public Toilets, Drinking Water, Health & Emergency, Transport, Parks, and Shopping.
- Enabled multi-modal travel routing (`walking`, `driving`, `cycling`) using corresponding OSRM profiles (`foot`, `driving`, `bicycle`).
- Connected Turf.js (`@turf/turf`) point-to-line exposure evaluation to score candidate routes against active citizen reports and label them **"Lower reported risk"** honestly without claiming absolute safety.
- Wired Impact Replay to the dynamically active origin, destination, and incident corridor.

---

## 2. Technical Stack & Service Providers

| Subsystem | Service / Library | Configuration & Provider Details | Status |
|---|---|---|---|
| **Basemap Library** | Leaflet 1.9.4 (`leaflet`) | Custom React wrapper with `next/dynamic` (`ssr: false`). Responsive viewport, pan, pinch-zoom, and auto-fitting bounds (`map.fitBounds`). | ✅ Active |
| **Map Tile Provider** | OpenStreetMap Standard Raster Tiles | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` with visible `© OpenStreetMap contributors` attribution. | ✅ Active |
| **Geocoding Service** | OpenStreetMap Nominatim + Curated Pune Engine | `/api/geocode` querying `https://nominatim.openstreetmap.org/search` with User-Agent header, debouncing, and local landmark fallback. | ✅ Active |
| **Road Routing Engine** | OSRM (`router.project-osrm.org`) | Live road routing supporting `foot` (walking), `driving` (car), and `bicycle` (cycling) with real GeoJSON geometries, meters distance, and seconds duration. | ✅ Active |
| **Place Discovery** | OpenStreetMap POI & Curated Pune Dataset | 40 verified Pune locations across 10 categories with accurate coordinates, prices, ratings, and accessibility data. | ✅ Active |
| **AI Extraction Engine** | Google Gemini 1.5 Flash (`@google/generative-ai`) | Structured entity extraction with deterministic fallback heuristic for offline/no-key mode. | ✅ Active |
| **Spatial Heuristics** | Turf.js (`@turf/turf`) | 100m hazard buffer circle calculation and point-to-route distance measurement. | ✅ Active |
| **Frontend Design** | Figma Make Design System | Tailwind CSS 4, Manrope typography, safe-area mobile framing (`390×844`), bottom navigation, and zero dead UI buttons. | ✅ Active |

---

## 3. Screen Inventory & Dynamic Verification

| # | Screen | Key Capabilities & Live Data Connection | Verification Status |
|---|---|---|---|
| 1 | **Map (`map`)** | Interactive Leaflet map, live GPS detection button, dynamic search bar, 9 category chips, live OSRM route card showing duration and distance, and 100m hazard buffer circles. | ✅ Verified |
| 2 | **Explore (`explore`)** | Multi-category directory (Food, Heritage, Stays, Toilets, Health, Parks, Transport) with live distance from user origin, search filter, place comparison launcher, and "Route here" 1-tap action. | ✅ Verified |
| 3 | **Compare (`compare`)** | Multi-attribute comparison table evaluating price bands, ratings, accessibility, proximity, and nearby Evidence Ledger reports. Missing facts are never invented. | ✅ Verified |
| 4 | **Report (`report`)** | Multi-modal report composer (Text, Photo upload, Voice note), category selection, and draggable Leaflet map pin locator. | ✅ Verified |
| 5 | **AI Processing (`processing`)** | 4-stage visual progress animation showing AI parsing, entity extraction, duplicate cluster checks, and corridor exposure evaluation. | ✅ Verified |
| 6 | **Review (`review`)** | Structured summary of extracted fields, initial Unverified state, location coordinate confirmation, and submission to in-memory store. | ✅ Verified |
| 7 | **Submitted (`submitted`)** | Confirmation screen with direct launcher into Impact Replay. | ✅ Verified |
| 8 | **Impact Replay (`replay`)** | Interactive Before/After slider showing how a newly reported hazard shifts route recommendations to an alternative path with lower reported risk. | ✅ Verified |
| 9 | **Evidence Ledger (`ledger`)** | Transparent audit registry of all reports, categorizing verification state separately from freshness status (Recent, Aging, Stale). | ✅ Verified |
| 10 | **Incident Detail (`incident`)** | Single report deep-dive showing source credibility, duplicate linking, and corridor proximity. | ✅ Verified |
| 11 | **Routes (`routes`)** | Multi-route comparison comparing Fastest Route vs Lower Reported Risk Route, travel mode selector (Walk, Bike, Car), and live distance/duration metrics. | ✅ Verified |
| 12 | **Planner (`planner`)** | Multi-stop outing itinerary generator with budget, duration, and preference sliders. | ✅ Verified |

---

## 4. Test Verification Checklist (Phase 18 Quality Gate)

- [x] **Map Tiles & Attribution**: OpenStreetMap tiles render smoothly with visible attribution.
- [x] **Pan & Zoom**: Map freely pans and zooms without coordinate bounds locking.
- [x] **Current Location**: "Use My Location" requests browser Geolocation, centers the map, places pulsing blue marker with accuracy radius, and updates route origin.
- [x] **Dynamic Search**: Searching "Dagdusheth", "Shaniwar Wada", "Aga Khan Palace", or custom queries updates destination and recalculates route.
- [x] **Category Discovery**:
  - Clicking `Food` displays authentic restaurants (Cafe Goodluck, Vaishali, Sujata Mastani, Bedekar Misal).
  - Clicking `Heritage` displays historical sites (Shaniwar Wada, Dagdusheth, Lal Mahal, Sinhagad Fort, Aga Khan Palace).
  - Clicking `Toilets` displays mapped municipal public toilets and She-Toilets.
  - Clicking `Health` displays hospitals and emergency stations (KEM Hospital, Poona Hospital, Sahyadri, Faraskhana Police).
- [x] **Dynamic OSRM Routing**:
  - Route calculates between arbitrary coordinates.
  - Real road geometry polyline is drawn on map.
  - Duration and distance match live OSRM response.
  - Switching travel mode between Walking, Driving, and Cycling recalculates route.
  - Map auto-fits bounds to display the full route.
- [x] **Impact Replay**: Demonstrates before/after route changes when a report intersects the route corridor.
- [x] **Zero Build Errors**: `npm run build` succeeds cleanly with exit code 0.

---

## 5. Demo Instructions

To run the application locally:
```bash
cd "c:\Users\tejas\OneDrive\Documents\DYPCOE hackathon\City-Pulse\citypulse-ai"
npm run dev
```
Open **`http://localhost:3000/`** in your browser.
