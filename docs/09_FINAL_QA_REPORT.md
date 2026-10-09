# NagarMitra AI — Final QA & Verification Report

**Product:** NagarMitra AI (शहराचे संकेत, निर्णय तुमचे)  
**QA Assessment Date:** October 9, 2026  
**Auditor:** Lead QA & Integration Engineer  
**Overall Verdict:** PASSED (100% Core Requirements Satisfied)

---

## 1. Test Execution Matrix

| Test ID | Test Scenario | Steps Executed | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| **QA-MAP-01** | Real Leaflet Basemap Tiles | Navigate to Home (`/`). Observe map tile network requests and attribution. | Genuine OpenStreetMap tiles render; visible `© OpenStreetMap contributors` attribution. | Tile requests to `https://tile.openstreetmap.org/{z}/{x}/{y}.png` succeed (HTTP 200). Attribution rendered cleanly. | ✅ PASS |
| **QA-MAP-02** | Custom Diamond Markers & Buffers | Observe incident markers on the map. Click on an incident. | 45° diamond markers with `!`, `✓`, `★`, `?` glyphs; 100m red dashed buffer circles; popup appears on click. | Markers match Figma specification. 100m circular danger buffers appear along routes. | ✅ PASS |
| **QA-MAP-03** | Geolocation & Recenter | Tap the "My location" pin icon on map controls. | Requests browser geolocation or falls back gracefully to Deccan Gymkhana with user toast feedback. | Returns acquired coordinates or informs user of Deccan Gymkhana default. | ✅ PASS |
| **QA-REP-01** | Report Intake Flow | Open Report tab (`report`). Enter description, select type, tap map pin. | Interactive pin picker opens. Tapping map updates pin latitude/longitude. | Coordinates update dynamically; user can confirm and proceed. | ✅ PASS |
| **QA-REP-02** | AI Structuring & Fallback | Progress from Report to Review. Submit report. | `POST /api/reports` runs AI/heuristic extraction, duplicate clustering, and updates repository. | Returns HTTP 200 with extracted incident type, summary, and recalculates evidence support score. | ✅ PASS |
| **QA-REP-03** | Duplicate Clustering | Submit report matching nearby active incident (<150m, <24h). | Ingests report as corroborating evidence without duplicate exposure count. Increments submission count. | Increments `distinctSubmissionCount`, re-scores evidence support score to reflect corroboration. | ✅ PASS |
| **QA-IMP-01** | Impact Replay Studio | From Submitted confirmation, tap "View Impact Replay". | Dual route visualization displays; before/after toggle shows recommendation shift from Fastest to Lower Reported Risk. | `POST /api/impact-replay` returns HTTP 200 with before/after route comparison, time/distance delta, and affected segment description. | ✅ PASS |
| **QA-LED-01** | Evidence Ledger Audit | Navigate to Evidence tab (`ledger`). Test status and category filters. | Filter by Unverified, Corroborated, Authority-confirmed, Contested, Recent, Aging, Stale. | Correct list subset displayed with transparency badges. Heuristics guide sheet opens cleanly. | ✅ PASS |
| **QA-ROU-01** | Route Exposure Comparison | Navigate to Routes tab (`routes`). Toggle between Fastest Route and Lower Reported Risk. | Active polyline changes on map; 100m hazard buffers highlighted; safety rationale displayed. | Route A vs Route B comparisons functional; no-alternative fallback preview works. | ✅ PASS |
| **QA-EXP-01** | Explore & Place Comparison | Navigate to Explore tab (`explore`). Select 2 places for comparison. Tap "Compare 2 places". | Side-by-side comparison table displays price band, rating, distance, accessibility, and nearby reports. | Comparison matrix renders cleanly with accurate data. | ✅ PASS |
| **QA-BLD-01** | Production Build & Lint | Run `npm run build` from command line. | Zero compilation errors, zero TypeScript errors, clean bundle generation. | `✓ Compiled successfully`, `Finished TypeScript in 4.3s`, `Generating static pages (11/11)` with exit code 0. | ✅ PASS |

---

## 2. Truthful AI & Safety Policy Compliance

- **No False Safety Guarantees**: Everywhere in the interface, routes with fewer hazards are described as "Lower reported risk", never "Safe route" or "Guaranteed hazard-free".
- **Unverified by Default**: All new citizen reports start with an explicit "Unverified" badge until corroborating independent reports or authority notices exist.
- **Simulated Data Transparency**: All demo fixtures are explicitly marked with "Simulated demo data" or "Cached demo route".
- **AI Extraction Uncertainty**: AI-structured fields carry transparent uncertainty warnings ("AI suggestion", "Severity is a default estimate based on incident type").

---

## 3. QA Conclusion

The NagarMitra AI platform is fully functional, aesthetically polished, mobile-responsive, backed by genuine OpenStreetMap tiles and a rigorous Evidence Engine, and completely ready for hackathon demonstration.
