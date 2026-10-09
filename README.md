# NagarMitra AI (नगरमित्र)
### Evidence-Aware City Explorer & Intelligent Urban Decision Support System

> **Hackathon:** PromptWars × Brain DYP COEI  
> **Problem Statement:** *City Life: Exploring, Experiencing & Navigating the Chaos We Call Home*  
> **Platform:** Mobile-first Web Application with Android / PWA Readiness  
> **Repository:** [https://github.com/Tejas7620/NagarMitra.git](https://github.com/Tejas7620/NagarMitra.git)

---

## 🌟 Core Product Principle

$$\text{NEW INFORMATION} \longrightarrow \text{STRUCTURED INCIDENT} \longrightarrow \text{EVIDENCE ASSESSMENT} \longrightarrow \text{GEOGRAPHIC IMPACT} \longrightarrow \text{ROUTE/PLAN ANALYSIS} \longrightarrow \text{EXPLAINED RECOMMENDATION}$$

NagarMitra AI helps citizens and visitors explore cities, discover authentic places, assess safety conditions, compare destinations with transparent factors, and make informed travel choices without false guarantees.

---

## 🚀 Key Features

### 1. Dynamic Place Discovery
- Real-time place querying across 10 verified urban categories:
  - 🍛 **Food & Hospitality**: Iconic eateries, cafes, street food (Vaishali, Cafe Goodluck, Bedekar Misal).
  - 🏛️ **Heritage & Culture**: Historical landmarks, temples, museums (Shaniwar Wada, Aga Khan Palace, Dagdusheth Temple).
  - 🚻 **Public Sanitation**: Municipal smart toilets & Ti She-Toilets.
  - 💧 **Drinking Water**: Mapped potable water stations.
  - 🏨 **Hotels & Stays**: Accommodations near transit corridors.
  - 🏥 **Health & Emergency**: Hospitals, pharmacies, clinics (KEM, Sahyadri, Sancheti).
  - 🌳 **Parks & Recreation**: Public gardens and green spaces (Sarasbaug, Sambhaji Park).
  - 🚌 **Public Transit**: Metro stations, bus terminals (PMPML / MahaMetro).
  - 🛍️ **Shopping & Markets**: Bazaars and retail corridors (Tulshibaug, Laxmi Road).
- **Spatial Filters**: Viewport bounding box (`bbox`), radial proximity (`radius` in km), and spherical Haversine distance scoring.

### 2. Live Pan-India Geocoding & Search
- Integrated with OpenStreetMap Nominatim for address and landmark search across India.
- Search examples: *Dagdusheth Halwai Ganpati Temple*, *Gateway of India*, *Connaught Place*, *Shivajinagar Station*.
- Reverse geocoding returning locality, street, and administrative hierarchy.

### 3. Multi-Modal Road Routing & Corridor Exposure Scoring
- Direct integration with Open Source Routing Machine (OSRM) supporting:
  - 🚶 **Walking** (`foot`)
  - 🚗 **Driving** (`driving`)
  - 🚴 **Cycling** (`bicycle`)
- Evaluates route geometry against all active incidents using a **100m corridor buffer** powered by `@turf/turf`.
- Mathematical proximity decay:
  - $0\text{--}25\text{m} \to 1.0$ factor
  - $25\text{--}50\text{m} \to 0.7$ factor
  - $50\text{--}100\text{m} \to 0.3$ factor
  - $>100\text{m} \to 0.0$ factor
- Transparently labels optimal routes with **"Lower Reported Risk"** (strictly avoiding uncalibrated safety guarantees).

### 4. Citizen Incident Reporting & Media Support
- Real-time incident report composer supporting:
  - 📝 **Free-text description** (up to 1000 characters).
  - 📷 **Incident photo upload** (JPEG, PNG, WebP up to 5MB with UUID storage).
  - 🎙️ **Voice note recording & speech-to-text dictation** via Web Speech API.
  - 📍 **User-confirmed map pin coordinates** (confirmed by citizen, not estimated from text).
- Newly filed reports start as **Unverified** to preserve evidence integrity.

### 5. Server-Side AI/ML Extraction & Spatio-Temporal Deduplication
- Server-side **Google Gemini 1.5 Flash** structured entity extraction with deterministic regex/NLP fallback.
- Controlled incident categories: `waterlogging`, `road_damage`, `temporary_obstruction`, `traffic_disruption`, `broken_streetlight`, `accident_report`, `cleanliness_issue`, `other`.
- **Duplicate Clustering**: Merges compatible incidents within 150m and temporal windows; a second corroborating report automatically promotes status to **Corroborated**.

### 6. Transparent Evidence Engine & Evidence Ledger
- **Freshness Half-Life Windows**: Waterlogging (3h / 12h), Potholes / Road damage (7d / 30d), Obstructions (6h / 24h).
- **Evidence Support Score**: Multi-factor composite score combining freshness, distinct submissions, verification state, and severity with explainable reason tokens.

### 7. Impact Replay
- Evaluates baseline vs alternative route exposures before and after an incident is reported.
- Compares travel time, distance, and hazard exposure with human-readable reasoning.

### 8. Decision-Support Place Comparison & Itinerary Planning
- **Place Comparison**: Transparent multi-criteria scoring across price tier, ratings, wheelchair accessibility, cleanliness, and nearby active incidents.
- **Outing Itinerary**: Generates curated 2–3 stop city tours with dwell times and transit estimates.

### 9. Live Weather Integration
- Real-time weather observations from **Open-Meteo CC BY 4.0** (temperature °C, humidity %, precipitation mm, wind speed km/h, and WMO condition codes).

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Next.js 16 (App Router), TypeScript, Vanilla CSS + Tailwind Tokens |
| **Maps & GIS** | Leaflet 1.9, React-Leaflet 5.0, OpenStreetMap Raster Tiles, `@turf/turf` 7.4 |
| **Backend & APIs** | Next.js Route Handlers (Node.js runtime, Turbopack), Zod 4.6 Validation |
| **AI / ML** | Google Gemini 1.5 Flash (`@google/generative-ai`) + Deterministic NLP Fallback |
| **Routing & Geocoding** | Project-OSRM (Multi-modal), OpenStreetMap Nominatim |
| **Weather** | Open-Meteo Global Weather Service |
| **Persistence** | Supabase PostgreSQL Migrations + File-backed Disk Store (`data/db/`) |

---

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ (tested on Node v24.12.0)
- npm or yarn

### Installation
```bash
git clone https://github.com/Tejas7620/NagarMitra.git
cd NagarMitra
npm install
```

### Environment Configuration
Copy the example environment file:
```bash
cp .env.example .env.local
```
*(All endpoints work with built-in fallbacks even without third-party API keys).*

### Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Run Automated Backend Test Suite
```bash
npm run test:backend
```
Executes all 32 tests across 9 specification categories (Places, Geocoding, Routing, Reports, Evidence Engine, Impact Replay, Comparison, Weather, Security).

### Build for Production
```bash
npm run build
npm start
```

---

## 📡 Backend API Endpoints

- `GET  /api/places` — Dynamic place discovery with bounding box and category filtering
- `GET  /api/geocode/search` — Multi-city geocoding via Nominatim
- `GET  /api/geocode/reverse` — Reverse geocoding for coordinates
- `POST /api/routes` — OSRM multi-modal routing with corridor hazard exposure
- `POST /api/reports` — Citizen incident submission with AI extraction & deduplication
- `GET  /api/reports/:id` — Single report retrieval
- `GET  /api/incidents` — Filterable incident catalog
- `GET  /api/incidents/:id` — Single incident detail
- `GET  /api/incidents/:id/evidence` — Transparent Evidence Ledger breakdown
- `POST /api/impact-replay` — Before/after route recommendation comparison
- `POST /api/places/compare` — Multi-attribute place comparison
- `POST /api/itinerary` — Curated 2–3 stop city tour generation
- `GET  /api/weather` — Real-time weather observations
- `POST /api/media/upload` — Secure photo upload (JPEG, PNG, WebP)
- `POST /api/reset` — Reset database to clean deterministic state

---

## 📄 License & Attribution

- Built for **PromptWars × Brain DYP COEI Hackathon**.
- Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright).
- Routing by [Project OSRM](https://project-osrm.org/).
- Weather data by [Open-Meteo.com](https://open-meteo.com/) under CC BY 4.0.
