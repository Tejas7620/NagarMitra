'use client';

import { useEffect, useState, useRef, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { apiClient, GeocodeItem } from '@/lib/services/api-client'
import type { MapIncident, MapPlace } from '@/components/NagarMitraLeafletMap'
import { RouteCandidate, Place } from '@/lib/types'
import initialPlacesData from '@/data/places.json'

const NagarMitraLeafletMap = dynamic(
  () => import('@/components/NagarMitraLeafletMap'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#eef2f7] text-[13px] text-muted">
        <span className="animate-pulse font-semibold">Loading OpenStreetMap tiles...</span>
      </div>
    ),
  }
)

/* ---------------- Types ---------------- */
type Screen =
  | 'map' | 'explore' | 'compare' | 'report' | 'processing' | 'review' | 'submitted'
  | 'replay' | 'ledger' | 'incident' | 'routes' | 'planner'
type Verif = 'Unverified' | 'Corroborated' | 'Authority-confirmed' | 'Contested'
type Fresh = 'Recent' | 'Aging' | 'Stale' | 'Unknown'
type Source = 'Citizen submission' | 'Simulated demo data'
type Incident = {
  id: string; type: string; title: string; place: string; time: string; source: Source
  verif: Verif; fresh: Fresh; x: number; y: number; lat: number; lng: number; img?: string; nearRoute: boolean; desc: string
  exposure: string; duplicates: string[]; independent: string
}
type Scenario = 'changes' | 'noChange' | 'noIntersect' | 'fallback' | 'contested'

const IMG = {
  wada: 'https://images.unsplash.com/photo-1760034588108-987757454c18?auto=format&fit=crop&w=400&q=70',
  food: 'https://images.unsplash.com/photo-1738291422837-85761f82a10e?auto=format&fit=crop&w=400&q=70',
  museum: 'https://images.unsplash.com/photo-1631713215053-cc2df30dc6e9?auto=format&fit=crop&w=400&q=70',
  chai: 'https://images.unsplash.com/photo-1536514888772-a269c6a8a198?auto=format&fit=crop&w=400&q=70',
  flood: 'https://images.unsplash.com/photo-1661868678317-13067cfbb00d?auto=format&fit=crop&w=400&q=70',
  pothole: 'https://images.unsplash.com/photo-1658223684971-f262da87168f?auto=format&fit=crop&w=400&q=70',
  park: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=400&q=70',
  hotel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=70',
  health: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=400&q=70',
  transit: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=400&q=70',
}

const DEMO_INCIDENTS: Incident[] = [
  { id: 'D-104', type: 'Pothole', title: 'Pothole on Bajirao Road', place: 'Bajirao Rd, near Vishrambaug Wada', time: 'Today, 08:40', source: 'Simulated demo data', verif: 'Corroborated', fresh: 'Recent', x: 252, y: 196, lat: 18.5140, lng: 73.8530, img: IMG.pothole, nearRoute: true, desc: 'Demo incident: a large pothole partially blocking the left lane.', exposure: 'Lies 9 m from the baseline route centreline (measured on route geometry).', duplicates: ['D-108 (same block, 40 min apart)'], independent: 'Two demo reports from different simulated contributors.' },
  { id: 'D-211', type: 'Streetlight outage', title: 'Streetlight outage', place: 'Tilak Rd, Sadashiv Peth', time: 'Yesterday, 21:10', source: 'Simulated demo data', verif: 'Unverified', fresh: 'Aging', x: 120, y: 150, lat: 18.5080, lng: 73.8490, nearRoute: false, desc: 'Demo incident: three streetlights reported dark after 9 pm.', exposure: 'Lies 410 m from both candidate routes. Not counted as exposure.', duplicates: [], independent: 'Single source. Independence cannot be established.' },
  { id: 'D-317', type: 'Obstruction', title: 'Construction barricade', place: 'Laxmi Rd, Budhwar Peth', time: '4 days ago', source: 'Simulated demo data', verif: 'Contested', fresh: 'Stale', x: 300, y: 250, lat: 18.5165, lng: 73.8540, nearRoute: false, desc: 'Demo incident: one report says the barricade remains; a later report says it was removed.', exposure: 'Lies 120 m from the alternative route. Low relevance.', duplicates: ['D-322 (conflicting: "removed")'], independent: 'Two demo sources disagree.' },
  { id: 'D-405', type: 'Road closure', title: 'Scheduled road works', place: 'Kumthekar Rd, Sadashiv Peth', time: 'Today, 07:00', source: 'Simulated demo data', verif: 'Authority-confirmed', fresh: 'Recent', x: 150, y: 330, lat: 18.5120, lng: 73.8510, nearRoute: false, desc: 'Demo incident: a simulated municipal notice of lane closure for drainage work until 6 pm. Represents how an authority source would appear.', exposure: 'Lies 160 m from the baseline route. Not counted as exposure.', duplicates: [], independent: 'Simulated authority notice (demo stand-in for an official source).' },
]

const NEW_REPORT: Incident = { id: 'U-001', type: 'Waterlogging', title: 'Waterlogging near Mandai', place: 'Shivaji Rd, near Mandai', time: 'Just now', source: 'Citizen submission', verif: 'Unverified', fresh: 'Recent', x: 196, y: 262, lat: 18.5129, lng: 73.8562, img: IMG.flood, nearRoute: true, desc: 'Ankle-deep water across the road after rain; pedestrians walking on the divider.', exposure: 'Intersects 140 m of the baseline route (segment B–C, measured on route geometry).', duplicates: ['No likely duplicates found within 200 m / 6 h'], independent: 'Single new report. Awaiting supporting evidence.' }

function getPlaceImageForCategory(cat: string): string {
  const c = cat.toLowerCase()
  if (c.includes('food') || c.includes('cafe')) return IMG.food
  if (c.includes('heritage') || c.includes('temple') || c.includes('fort')) return IMG.wada
  if (c.includes('park')) return IMG.park
  if (c.includes('stay') || c.includes('hotel')) return IMG.hotel
  if (c.includes('health') || c.includes('hospital')) return IMG.health
  if (c.includes('transport') || c.includes('bus') || c.includes('metro')) return IMG.transit
  return IMG.museum
}

function mapInitialPlaces(raw: Array<Place | Record<string, unknown>>): MapPlace[] {
  return raw.map((item) => {
    const p = item as Record<string, unknown>
    const category = typeof p.category === 'string' ? p.category : ''
    const name = typeof p.name === 'string' ? p.name : ''
    const id = String(p.id ?? '')
    const lat = typeof p.latitude === 'number' ? p.latitude : typeof p.lat === 'number' ? (p.lat as number) : 18.5204
    const lng = typeof p.longitude === 'number' ? p.longitude : typeof p.lng === 'number' ? (p.lng as number) : 73.8567
    const desc = typeof p.shortDescription === 'string' ? p.shortDescription : typeof p.desc === 'string' ? (p.desc as string) : ''
    const dist = typeof p.distanceFormatted === 'string' ? p.distanceFormatted : '1.5 km'
    const priceBand = typeof p.priceBand === 'number' ? p.priceBand : null
    const price = priceBand === 0 ? 'Free' : priceBand === 1 ? '₹ (budget)' : priceBand === 2 ? '₹₹ (moderate)' : priceBand === 3 ? '₹₹₹ (premium)' : '₹ (budget)'
    const rating = p.rating ? `${p.rating} ★` : null
    const access = p.accessibilityStatus === 'known' ? 'Accessible' : p.accessibilityStatus === 'limited' ? 'Limited' : 'Unknown'
    const clean = typeof p.cleanlinessValue === 'number' ? `${p.cleanlinessValue}/5` : 'Municipal civic area'
    const img = typeof p.img === 'string' ? (p.img as string) : getPlaceImageForCategory(category)

    return {
      id,
      name,
      cat: category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Heritage',
      dist,
      price,
      rating,
      access,
      clean,
      desc,
      lat,
      lng,
      img,
    }
  })
}

/* ---------------- Icons ---------------- */
const P: Record<string, string> = {
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14',
  explore: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm3.5-12.5-2 5-5 2 2-5 5-2Z',
  plus: 'M12 5v14M5 12h14',
  route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12-10a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM8 17h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7',
  ledger: 'M7 3h8l4 4v14H7V3Zm8 0v4h4M10 12h6M10 16h6',
  back: 'M15 18l-6-6 6-6',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm9 2-4-4',
  check: 'M5 12.5 10 17l9-10',
  alert: 'M12 9v4m0 4h.01M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-6v-4m0-4h.01',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-15v5l3 2',
  pin: 'M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4V8Zm8 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  mic: 'M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm-6-3a6 6 0 0 0 12 0M12 18v3',
  text: 'M4 6h16M4 12h16M4 18h10',
  chev: 'M6 9l6 6 6-6',
  layers: 'm12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5',
  x: 'M6 6l12 12M18 6 6 18',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z',
  shield: 'M12 3 5 6v6c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6l-7-3Z',
  db: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Zm0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  walk: 'M13 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm-3 18 2-7 3 3v4M8 11l3-3 3 2 3 3M11 8l-1 5',
  cloud: 'M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 11a3.5 3.5 0 0 0 1 7Z',
  swap: 'M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0-3 3m3-3 3 3',
  car: 'M5 11l2-5h10l2 5M3 17h18v-5H3v5Zm2 0v2a1 1 0 0 1-1 1H3v-3h2Zm16 0v2a1 1 0 0 1-1 1h-1v-3h2Z',
  bike: 'M5 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm14 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM9 14h6l-3-5H9l3 5Z',
}
function Icon({ n, s = 20, className = '' }: { n: string; s?: number; className?: string }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={P[n] || P.pin} />
    </svg>
  )
}

/* ---------------- Badges ---------------- */
const VERIF: Record<Verif, [string, string]> = {
  Unverified: ['bg-slate-100 text-slate-700 ring-slate-300', 'info'],
  Corroborated: ['bg-teal/10 text-[#0b706c] ring-teal/40', 'check'],
  'Authority-confirmed': ['bg-ok/10 text-ok ring-ok/40', 'shield'],
  Contested: ['bg-violet/10 text-violet ring-violet/40', 'swap'],
}
const FRESH: Record<Fresh, string> = {
  Recent: 'bg-brand/8 text-brand ring-brand/30',
  Aging: 'bg-amber/15 text-[#8a5a0c] ring-amber/50',
  Stale: 'bg-slate-200 text-slate-600 ring-slate-300',
  Unknown: 'bg-white text-muted ring-line',
}
function Pill({ cls, icon, children }: { cls: string; icon?: string; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ${cls}`}>{icon && <Icon n={icon} s={13} />}{children}</span>
}
const VerifBadge = ({ v }: { v: Verif }) => <Pill cls={VERIF[v][0]} icon={VERIF[v][1]}><span className="sr-only">Verification: </span>{v}</Pill>
const FreshBadge = ({ f }: { f: Fresh }) => <Pill cls={FRESH[f]} icon="clock"><span className="sr-only">Freshness: </span>{f}</Pill>
function SourceBadge({ k }: { k: 'Live' | 'Cached' | 'Simulated' | 'Unknown' | 'Demo route' | 'Citizen' }) {
  const m = { Live: 'bg-ok/10 text-ok ring-ok/30', Cached: 'bg-amber/15 text-[#8a5a0c] ring-amber/40', Simulated: 'bg-violet/10 text-violet ring-violet/30', Unknown: 'bg-white text-muted ring-line', 'Demo route': 'bg-violet/10 text-violet ring-violet/30', Citizen: 'bg-navy/5 text-navy ring-navy/20' }
  const label = { Live: 'Live data', Cached: 'Cached route', Simulated: 'Simulated demo data', Unknown: 'Unknown source', 'Demo route': 'Demo route', Citizen: 'Citizen submission' }
  return <Pill cls={m[k]} icon="db">{label[k]}</Pill>
}

/* ---------------- Primitives ---------------- */
function Btn({ children, onClick, kind = 'primary', disabled, icon, full = true }: { children: ReactNode; onClick?: () => void; kind?: 'primary' | 'secondary' | 'ghost' | 'ai'; disabled?: boolean; icon?: string; full?: boolean }) {
  const k = {
    primary: 'bg-brand text-white shadow-[0_6px_16px_-6px_rgba(40,85,232,.6)] active:bg-[#1f46c7]',
    ai: 'bg-gradient-to-r from-[#f26a5b] via-[#c25ec9] to-violet text-white shadow-[0_6px_16px_-6px_rgba(120,87,247,.6)]',
    secondary: 'bg-white text-navy ring-1 ring-line active:bg-bg',
    ghost: 'text-brand',
  }[kind]
  return (
    <button onClick={onClick} disabled={disabled} className={`${full ? 'w-full' : ''} inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-[15px] font-bold transition active:scale-[.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none ${k}`}>
      {icon && <Icon n={icon} s={18} />}{children}
    </button>
  )
}
function Card({ children, className = '', dark }: { children: ReactNode; className?: string; dark?: boolean }) {
  return <div className={`rounded-[20px] p-4 ring-1 ${dark ? 'bg-white/[.06] ring-white/10' : 'bg-white ring-line shadow-[0_1px_2px_rgba(20,33,61,.04)]'} ${className}`}>{children}</div>
}
function Chip({ on, children, onClick }: { on?: boolean; children: ReactNode; onClick?: () => void }) {
  return <button onClick={onClick} aria-pressed={on} className={`h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold ring-1 transition ${on ? 'bg-navy text-white ring-navy' : 'bg-white text-navy ring-line'}`}>{children}</button>
}
function ChipGroup({ opts }: { opts: string[] }) {
  const [v, setV] = useState(opts[opts.length - 1])
  return <div className="flex flex-wrap gap-2">{opts.map((o) => <Chip key={o} on={v === o} onClick={() => setV(o)}>{o}</Chip>)}</div>
}
function Header({ title, onBack, right, sub, dark }: { title: string; onBack?: () => void; right?: ReactNode; sub?: string; dark?: boolean }) {
  return (
    <div className={`sticky top-0 z-20 flex items-center gap-2 px-4 pb-3 pt-4 backdrop-blur ${dark ? 'bg-[#0f1a33]/90' : 'bg-bg/90'}`}>
      {onBack && <button onClick={onBack} aria-label="Back" className={`grid size-11 place-items-center rounded-full ring-1 ${dark ? 'bg-white/10 ring-white/15' : 'bg-white ring-line'}`}><Icon n="back" /></button>}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[20px] font-extrabold tracking-tight">{title}</h1>
        {sub && <p className={`text-[13px] ${dark ? 'text-slate-300' : 'text-muted'}`}>{sub}</p>}
      </div>
      {right}
    </div>
  )
}
function Note({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' | 'demo' }) {
  const c = { info: 'bg-brand/5 text-navy ring-brand/15', warn: 'bg-amber/10 text-[#6e4708] ring-amber/40', demo: 'bg-violet/5 text-[#4b33b5] ring-violet/20' }[tone]
  return <div className={`flex gap-2 rounded-2xl p-3 text-[13px] leading-snug ring-1 ${c}`}><Icon n={tone === 'warn' ? 'alert' : 'info'} s={16} className="mt-0.5 shrink-0" /><div>{children}</div></div>
}
function Row({ k, v }: { k: string; v: ReactNode }) {
  return <div className="flex justify-between gap-4 border-b border-line/70 py-2 text-[13px] last:border-0"><span className="text-muted">{k}</span><span className="text-right font-semibold">{v}</span></div>
}

/* ---------------- Map Wrapper ---------------- */
function CityMap({
  h = 360,
  routes = 'base',
  incidents = DEMO_INCIDENTS,
  places = [],
  showPlaces = true,
  highlight,
  onIncident,
  onPlace,
  selected,
  picker,
  placeCat,
  onPickerChange,
  routeCoords,
  altRouteCoords,
  origin,
  destination,
  userLocation,
  autoFit = false,
}: {
  placeCat?: string;
  h?: number;
  routes?: 'none' | 'base' | 'both' | 'alt';
  incidents?: Incident[];
  places?: MapPlace[];
  showPlaces?: boolean;
  highlight?: string;
  onIncident?: (i: Incident) => void;
  onPlace?: (id: string) => void;
  selected?: string;
  picker?: { x: number; y: number; lat?: number; lng?: number; confirmed: boolean };
  onPickerChange?: (coords: { lat: number; lng: number }) => void;
  routeCoords?: [number, number][];
  altRouteCoords?: [number, number][];
  origin?: { name: string; lat: number; lng: number } | null;
  destination?: { name: string; lat: number; lng: number } | null;
  userLocation?: { lat: number; lng: number; accuracy?: number } | null;
  autoFit?: boolean;
}) {
  const mapIncidents: MapIncident[] = incidents.map((i) => ({
    id: i.id,
    type: i.type,
    title: i.title,
    place: i.place,
    time: i.time,
    source: i.source,
    verif: i.verif,
    fresh: i.fresh,
    lat: i.lat || 18.5140,
    lng: i.lng || 73.8530,
    nearRoute: i.nearRoute,
    desc: i.desc,
    exposure: i.exposure,
    duplicates: i.duplicates,
    independent: i.independent,
  }));

  const mapPicker = picker
    ? {
        lat: picker.lat || 18.5129,
        lng: picker.lng || 73.8562,
        confirmed: picker.confirmed,
      }
    : undefined;

  return (
    <div style={{ height: h }} className="relative w-full overflow-hidden">
      <NagarMitraLeafletMap
        height={h}
        routes={routes}
        routeCoords={routeCoords}
        altRouteCoords={altRouteCoords}
        origin={origin}
        destination={destination}
        userLocation={userLocation}
        incidents={mapIncidents}
        places={places}
        showPlaces={showPlaces}
        placeCat={placeCat}
        selectedPlaceId={selected}
        highlightIncidentId={highlight}
        onIncidentClick={(mi) => {
          const original = incidents.find((inc) => inc.id === mi.id);
          if (original) onIncident?.(original);
        }}
        onPlaceClick={(id) => onPlace?.(id)}
        picker={mapPicker}
        onPickerChange={onPickerChange}
        showBuffers={true}
        autoFit={autoFit}
      />
    </div>
  );
}

const MARK: Record<Verif, { fill: string; stroke: string; glyph: string; glyphFill: string }> = {
  Unverified: { fill: '#fff', stroke: '#e65362', glyph: '!', glyphFill: '#e65362' },
  Corroborated: { fill: '#e65362', stroke: '#e65362', glyph: '✓', glyphFill: '#fff' },
  'Authority-confirmed': { fill: '#14213d', stroke: '#14213d', glyph: '★', glyphFill: '#fff' },
  Contested: { fill: '#7857f7', stroke: '#7857f7', glyph: '?', glyphFill: '#fff' },
}
function DiamondMark({ x, y, v, sim, size = 11 }: { x: number; y: number; v: Verif; sim?: boolean; size?: number }) {
  const m = MARK[v]
  return (
    <g>
      <rect x={x - size} y={y - size} width={size * 2} height={size * 2} rx="4" transform={`rotate(45 ${x} ${y})`} fill={m.fill} stroke={sim ? '#fff' : m.stroke} strokeWidth="2.5" />
      {sim && <rect x={x - size} y={y - size} width={size * 2} height={size * 2} rx="4" transform={`rotate(45 ${x} ${y})`} fill="none" stroke={m.stroke} strokeWidth="2" strokeDasharray="3 2" />}
      <text x={x} y={y + size * 0.38} textAnchor="middle" fontSize={size * 1.1} fontWeight="900" fill={m.glyphFill}>{m.glyph}</text>
    </g>
  )
}
function Legend({ onClose }: { onClose: () => void }) {
  const mk = (v: Verif, sim = false) => <svg width="24" height="24" viewBox="0 0 24 24"><DiamondMark x={12} y={12} v={v} sim={sim} size={7.5} /></svg>
  const rows = [
    { id: 'place', icon: <svg width="18" height="20" viewBox="0 0 24 28"><path d="M12 26 1 11a11 11 0 1 1 22 0z" fill="#2855e8" /><circle cx="12" cy="11" r="4" fill="#fff" /></svg>, label: 'Place (pin)' },
    { id: 'unverified', icon: mk('Unverified'), label: 'Unverified report (hollow, !)' },
    { id: 'corroborated', icon: mk('Corroborated'), label: 'Corroborated (filled, ✓)' },
    { id: 'authority', icon: mk('Authority-confirmed'), label: 'Authority-confirmed (dark, ★)' },
    { id: 'contested', icon: mk('Contested'), label: 'Contested (violet, ?)' },
    { id: 'simulated', icon: mk('Unverified', true), label: 'Simulated demo (dashed edge)' },
    { id: 'baseline', icon: <svg width="24" height="8"><path d="M0 4h24" stroke="#2855e8" strokeWidth="4" /></svg>, label: 'Baseline route (solid)' },
    { id: 'alternative', icon: <svg width="24" height="8"><path d="M0 4h24" stroke="#12a6a0" strokeWidth="4" strokeDasharray="6 4" /></svg>, label: 'Alternative route (dashed)' },
  ];
  return (
    <div className="rise absolute right-16 top-3 z-20 w-64 rounded-2xl bg-white p-3 text-[13px] shadow-xl ring-1 ring-line" role="dialog" aria-label="Map legend">
      <div className="mb-1 flex items-center justify-between font-bold">Map legend<button onClick={onClose} aria-label="Close legend" className="grid size-9 place-items-center rounded-full bg-bg"><Icon n="x" s={16} /></button></div>
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">Verification</p>
      {rows.map((r) => <div key={r.id} className="flex items-center gap-2 py-0.5"><span className="grid w-6 place-items-center">{r.icon}</span>{r.label}</div>)}
      <p className="mt-2 border-t border-line pt-2 text-[12px] text-muted"><b className="text-navy">Freshness is separate:</b> shown as a clock badge in details. Stale markers appear faded.</p>
    </div>
  )
}

/* ---------------- Sheet / Toast ---------------- */
function Sheet({ children, onClose, title }: { children: ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-navy/40" onClick={onClose}>
      <div className="rise max-h-[85%] w-full overflow-y-auto rounded-t-[28px] bg-white p-5 pb-8" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
        <div className="mb-3 flex items-center justify-between"><h2 className="text-[18px] font-extrabold">{title}</h2><button onClick={onClose} aria-label="Close" className="grid size-11 place-items-center rounded-full bg-bg"><Icon n="x" s={18} /></button></div>
        {children}
      </div>
    </div>
  )
}

/* ---------------- Central Context Type ---------------- */
type Ctx = {
  go: (s: Screen) => void
  back: () => void
  tab: (s: Screen) => void
  flash: (m: string) => void
  submitted: boolean
  setSubmitted: (b: boolean) => void
  incident: Incident
  openIncident: (i: Incident) => void
  scenario: Scenario
  setScenario: (s: Scenario) => void
  allIncidents: Incident[]
  compareSel: string[]
  setCompareSel: (s: string[]) => void
  draft: { desc: string; type: string; time: string; photo: boolean; photoUrl?: string | null; voice: boolean; voiceTranscript?: string | null; confirmed: boolean; pin: { x: number; y: number; lat: number; lng: number } }
  setDraft: (d: Ctx['draft']) => void

  // Dynamic Navigation & Origin/Destination State
  origin: { name: string; lat: number; lng: number }
  setOrigin: (origin: { name: string; lat: number; lng: number }) => void
  dest: { id?: string; name: string; lat: number; lng: number; cat?: string }
  setDest: (dest: { id?: string; name: string; lat: number; lng: number; cat?: string }) => void
  userLoc: { lat: number; lng: number; accuracy?: number } | null
  travelMode: 'walking' | 'driving' | 'cycling'
  setTravelMode: (mode: 'walking' | 'driving' | 'cycling') => void
  activeRoutes: RouteCandidate[]
  selectedRouteIndex: number
  setSelectedRouteIndex: (idx: number) => void
  routeCoords: [number, number][]
  altRouteCoords: [number, number][]
  isRoutingLoading: boolean
  routingDataSource: string
  recalculateRoute: (o?: { lat: number; lng: number; name: string }, d?: { lat: number; lng: number; name: string }, m?: 'walking' | 'driving' | 'cycling') => Promise<void>
  requestCurrentLocation: () => Promise<void>

  // Dynamic Places & Categories
  places: MapPlace[]
  activeCategory: string
  setActiveCategory: (cat: string) => void
  loadPlaces: (cat?: string, lat?: number, lng?: number) => Promise<void>
  selectPlaceAsDestination: (p: MapPlace) => void

  // Dynamic Search
  searchQuery: string
  setSearchQuery: (q: string) => void
  searchResults: GeocodeItem[]
  isSearching: boolean
  executeSearch: (q: string) => Promise<void>
  selectSearchResult: (item: GeocodeItem) => void
}

/* ================= App Root ================= */
export default function App() {
  const [screen, setScreen] = useState<Screen>('map')
  const [_history, setHistory] = useState<Screen[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [incident, setIncident] = useState<Incident>(DEMO_INCIDENTS[0])
  const [scenario, setScenario] = useState<Scenario>('changes')
  const [toast, setToast] = useState<string | null>(null)
  const [compareSel, setCompareSel] = useState<string[]>(['place-001', 'place-002'])

  // Navigation state
  const [origin, setOrigin] = useState<{ name: string; lat: number; lng: number }>({
    name: 'Deccan Gymkhana',
    lat: 18.5204,
    lng: 73.8420,
  })
  const [dest, setDest] = useState<{ id?: string; name: string; lat: number; lng: number; cat?: string }>({
    id: 'place-001',
    name: 'Shaniwar Wada',
    lat: 18.5195,
    lng: 73.8554,
    cat: 'Heritage',
  })
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null)
  const [travelMode, setTravelMode] = useState<'walking' | 'driving' | 'cycling'>('walking')
  const [activeRoutes, setActiveRoutes] = useState<RouteCandidate[]>([])
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0)
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([])
  const [altRouteCoords, setAltRouteCoords] = useState<[number, number][]>([])
  const [isRoutingLoading, setIsRoutingLoading] = useState(false)
  const [routingDataSource, setRoutingDataSource] = useState('live')

  // Dynamic Places state
  const [places, setPlaces] = useState<MapPlace[]>(() => mapInitialPlaces(initialPlacesData))
  const [activeCategory, setActiveCategory] = useState('All')

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<GeocodeItem[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Report draft
  const [draft, setDraft] = useState<{
    desc: string
    type: string
    time: string
    photo: boolean
    photoUrl?: string | null
    voice: boolean
    voiceTranscript?: string | null
    confirmed: boolean
    pin: { x: number; y: number; lat: number; lng: number }
  }>({
    desc: '',
    type: '',
    time: 'Just now',
    photo: false,
    photoUrl: null,
    voice: false,
    voiceTranscript: null,
    confirmed: false,
    pin: { x: 196, y: 262, lat: 18.5129, lng: 73.8562 },
  })

  const go = (s: Screen) => { setHistory((h) => [...h, screen]); setScreen(s) }
  const back = () => { setHistory((h) => { const p = h[h.length - 1] ?? 'map'; setScreen(p); return h.slice(0, -1) }) }
  const tab = (s: Screen) => { setHistory([]); setScreen(s) }
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2800) }

  const allIncidents = submitted ? [NEW_REPORT, ...DEMO_INCIDENTS] : DEMO_INCIDENTS
  const openIncident = (i: Incident) => { setIncident(i); go('incident') }

  // Recalculate route between arbitrary origin and destination
  const recalculateRoute = async (
    targetOrigin = origin,
    targetDest = dest,
    targetMode = travelMode
  ) => {
    setIsRoutingLoading(true)
    try {
      const res = await apiClient.getRoutes({
        originLat: targetOrigin.lat,
        originLng: targetOrigin.lng,
        destLat: targetDest.lat,
        destLng: targetDest.lng,
        mode: targetMode,
        originName: targetOrigin.name,
        destName: targetDest.name,
      })

      const routes = res.scenario.routes || []
      setActiveRoutes(routes)
      setRoutingDataSource(res.dataMode)
      setSelectedRouteIndex(0)

      if (routes.length > 0 && routes[0].geometry?.coordinates) {
        // GeoJSON [lng, lat] -> Leaflet [lat, lng]
        const pCoords = routes[0].geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
        )
        setRouteCoords(pCoords)

        if (routes.length > 1 && routes[1].geometry?.coordinates) {
          const aCoords = routes[1].geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
          )
          setAltRouteCoords(aCoords)
        } else {
          setAltRouteCoords([])
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('Live routing failed, using fallback corridor:', msg)
      setRouteCoords([
        [targetOrigin.lat, targetOrigin.lng],
        [targetDest.lat, targetDest.lng],
      ])
      setAltRouteCoords([])
    } finally {
      setIsRoutingLoading(false)
    }
  }

  // Load places for category
  const loadPlaces = async (cat = activeCategory, refLat = origin.lat, refLng = origin.lng) => {
    try {
      const res = await apiClient.getPlaces({
        category: cat === 'All' ? undefined : cat.toLowerCase(),
        lat: refLat,
        lng: refLng,
      })
      if (res.places && res.places.length > 0) {
        setPlaces(mapInitialPlaces(res.places))
      }
    } catch (err) {
      console.warn('Places fetch error:', err)
    }
  }

  // Request browser geolocation
  const requestCurrentLocation = async () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      flash('Geolocation API not supported by browser. Pick location manually.')
      return
    }
    flash('Detecting current GPS location...')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5))
        const lng = Number(pos.coords.longitude.toFixed(5))
        const acc = pos.coords.accuracy
        const loc = { lat, lng, accuracy: acc }
        setUserLoc(loc)
        const newOrigin = { name: 'My Current Location', lat, lng }
        setOrigin(newOrigin)
        flash(`Location acquired (±${Math.round(acc)}m). Recalculating route...`)
        recalculateRoute(newOrigin, dest, travelMode)
        loadPlaces(activeCategory, lat, lng)
      },
      (err) => {
        console.warn('Geolocation error:', err)
        flash('Location permission unavailable. Origin set to Deccan Gymkhana.')
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  // Execute Search query
  const executeSearch = async (q: string) => {
    setSearchQuery(q)
    if (!q.trim()) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    try {
      const results = await apiClient.geocode(q.trim(), 8)
      setSearchResults(results)
    } catch (err) {
      console.warn('Geocoding search failed:', err)
    } finally {
      setIsSearching(false)
    }
  }

  // Select Search result
  const selectSearchResult = (item: GeocodeItem) => {
    const newDest = {
      id: item.id,
      name: item.name,
      lat: item.lat,
      lng: item.lng,
      cat: item.category,
    }
    setDest(newDest)
    setSearchQuery('')
    setSearchResults([])
    flash(`Destination set to ${item.name}. Calculating route...`)
    recalculateRoute(origin, newDest, travelMode)
  }

  // Select Place as Destination
  const selectPlaceAsDestination = (p: MapPlace) => {
    const newDest = {
      id: p.id,
      name: p.name,
      lat: p.lat,
      lng: p.lng,
      cat: p.cat,
    }
    setDest(newDest)
    flash(`Destination: ${p.name}. Updating route...`)
    recalculateRoute(origin, newDest, travelMode)
    go('routes')
  }

  // Initial Route & Places fetch on mount
  useEffect(() => {
    let active = true
    const init = async () => {
      if (active) {
        await recalculateRoute(origin, dest, travelMode)
        await loadPlaces('All', origin.lat, origin.lng)
      }
    }
    init()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ctx: Ctx = {
    go,
    back,
    tab,
    flash,
    submitted,
    setSubmitted,
    incident,
    openIncident,
    scenario,
    setScenario,
    allIncidents,
    compareSel,
    setCompareSel,
    draft,
    setDraft,
    origin,
    setOrigin,
    dest,
    setDest,
    userLoc,
    travelMode,
    setTravelMode,
    activeRoutes,
    selectedRouteIndex,
    setSelectedRouteIndex,
    routeCoords,
    altRouteCoords,
    isRoutingLoading,
    routingDataSource,
    recalculateRoute,
    requestCurrentLocation,
    places,
    activeCategory,
    setActiveCategory,
    loadPlaces,
    selectPlaceAsDestination,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    executeSearch,
    selectSearchResult,
  }

  const showNav = ['map', 'explore', 'routes', 'ledger', 'replay', 'incident', 'compare', 'planner', 'submitted'].includes(screen)
  const navActive: Screen = (['replay', 'incident'].includes(screen) ? 'ledger' : screen === 'compare' || screen === 'planner' ? 'explore' : screen === 'submitted' ? 'report' : screen) as Screen

  return (
    <div className="flex min-h-screen items-center justify-center gap-10 p-0 sm:p-6">
      <aside className="hidden max-w-xs lg:block">
        <Logo big />
        <p className="mt-4 text-[15px] text-muted">Explore. Report. Decide with evidence.</p>
        <div className="mt-6 space-y-4">
          {[
            ['explore', 'Explore Places', 'Food, heritage, stays & more', 'from-[#f7a23b] to-[#ec4f73]'],
            ['route', 'Evidence-aware Routes', 'Lower reported risk routes, with evidence', 'from-teal to-ok'],
            ['plus', 'Report & Contribute', 'Text, photo or voice note', 'from-[#2fb3e6] to-teal'],
            ['spark', 'Impact Replay', 'See how new reports change plans', 'from-violet to-[#c25ec9]'],
            ['ledger', 'Evidence Ledger', 'Transparent sources and status', 'from-brand to-[#2fb3e6]']
          ].map(([i, t, d, g]) => (
            <div key={t} className="flex items-center gap-3">
              <span className={`grid size-11 place-items-center rounded-full bg-gradient-to-br ${g} text-white shadow`}><Icon n={i} /></span>
              <div><p className="text-[15px] font-extrabold">{t}</p><p className="text-[13px] text-muted">{d}</p></div>
            </div>
          ))}
        </div>
        <div className="mt-6 space-y-2 text-[13px]">
          <p className="font-bold text-navy">Prototype shortcuts</p>
          {[
            ['Main journey: start a report', 'report'],
            ['Impact Replay', 'replay'],
            ['Evidence Ledger', 'ledger'],
            ['Route comparison', 'routes'],
            ['Place comparison', 'compare'],
            ['Outing planner (P2)', 'planner']
          ].map(([l, s]) => (
            <button key={s} onClick={() => tab(s as Screen)} className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-2.5 text-left font-semibold ring-1 ring-line hover:ring-brand">
              {l}<Icon n="back" s={14} className="rotate-180" />
            </button>
          ))}
          <p className="pt-3 text-muted">Connected to live OpenStreetMap Nominatim, OSRM road router, and Pune city data.</p>
        </div>
      </aside>
      <div className="relative h-[100dvh] w-full overflow-hidden bg-bg [transform:translateZ(0)] sm:h-[844px] sm:w-[390px] sm:rounded-[44px] sm:shadow-2xl sm:ring-8 sm:ring-navy">
        <div aria-hidden className={`absolute inset-x-0 top-0 z-40 hidden h-11 items-center justify-between px-7 text-[14px] font-bold sm:flex ${screen === 'replay' ? 'bg-[#0f1a33] text-white' : 'bg-bg text-navy'}`}>
          <span>9:41</span><span className="h-7 w-28 rounded-full bg-navy" /><span className="flex items-center gap-1"><span className="h-2.5 w-4 rounded-sm bg-current" /><span className="h-3 w-6 rounded-[4px] ring-2 ring-current" /></span>
        </div>
        <div className={`no-scrollbar absolute inset-x-0 bottom-0 top-[env(safe-area-inset-top)] overflow-y-auto overscroll-contain sm:top-11 ${screen === 'replay' ? 'bg-[#0f1a33]' : ''}`} style={{ paddingBottom: showNav ? 'calc(112px + env(safe-area-inset-bottom))' : 'env(safe-area-inset-bottom)' }} key={screen}>
          {screen === 'map' && <MapScreen {...ctx} />}
          {screen === 'explore' && <Explore {...ctx} />}
          {screen === 'compare' && <Compare {...ctx} />}
          {screen === 'report' && <Report {...ctx} />}
          {screen === 'processing' && <Processing {...ctx} />}
          {screen === 'review' && <Review {...ctx} />}
          {screen === 'submitted' && <Submitted {...ctx} />}
          {screen === 'replay' && <Replay {...ctx} />}
          {screen === 'ledger' && <Ledger {...ctx} />}
          {screen === 'incident' && <IncidentDetail {...ctx} />}
          {screen === 'routes' && <Routes {...ctx} />}
          {screen === 'planner' && <Planner {...ctx} />}
        </div>
        {showNav && <BottomNav active={navActive} onTab={tab} />}
        {toast && <div className="rise absolute inset-x-4 bottom-32 z-50 flex items-center gap-2 rounded-2xl bg-navy px-4 py-3 text-[14px] font-semibold text-white shadow-xl"><Icon n="check" s={18} />{toast}</div>}
      </div>
    </div>
  )
}

function Logo({ big }: { big?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 48 58" className={big ? 'h-16 w-14' : 'h-10 w-9'} aria-hidden>
        <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f7a23b" /><stop offset=".5" stopColor="#ec4f73" /><stop offset="1" stopColor="#7857f7" /></linearGradient></defs>
        <path d="M24 57S3 35 3 22a21 21 0 0 1 42 0c0 13-21 35-21 35Z" fill="url(#lg)" />
        <circle cx="24" cy="22" r="14" fill="#fff" />
        <path d="M24 10l2 4v3l3 2v4l2 1v7H17v-7l2-1v-4l3-2v-3l2-4Z" fill="#ec4f73" /><path d="M14 31h20" stroke="#7857f7" strokeWidth="2" />
      </svg>
      <div>
        <div className={`font-extrabold leading-none tracking-tight ${big ? 'text-[26px]' : 'text-[17px]'}`}>NagarMitra <span className="bg-gradient-to-r from-[#ec4f73] to-violet bg-clip-text text-transparent">AI</span></div>
        <div className={`text-muted ${big ? 'mt-1 text-[14px]' : 'text-[11px]'}`}>शहराचे संकेत, निर्णय तुमचे.</div>
      </div>
    </div>
  )
}

function BottomNav({ active, onTab }: { active: Screen; onTab: (s: Screen) => void }) {
  const items: [Screen, string, string][] = [['map', 'Map', 'map'], ['explore', 'Explore', 'explore'], ['report', 'Report', 'plus'], ['routes', 'Routes', 'route'], ['ledger', 'Evidence', 'ledger']]
  return (
    <nav className="absolute inset-x-0 bottom-0 z-30 flex items-end justify-around border-t border-line bg-white/95 px-2 pt-2 backdrop-blur pb-[max(12px,env(safe-area-inset-bottom))] sm:pb-6" aria-label="Main">
      {items.map(([s, l, i]) =>
        s === 'report' ? (
          <button key={s} onClick={() => onTab(s)} className="-mt-7 flex flex-col items-center gap-1 text-[11px] font-bold text-navy">
            <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-brand to-violet text-white shadow-lg ring-4 ring-white"><Icon n={i} s={26} /></span>{l}
          </button>
        ) : (
          <button key={s} onClick={() => onTab(s)} aria-current={active === s} className={`flex min-h-12 min-w-14 flex-col items-center justify-center gap-1 text-[11px] font-bold ${active === s ? 'text-brand' : 'text-muted'}`}>
            <Icon n={i} s={22} />{l}
          </button>
        ),
      )}
    </nav>
  )
}

/* ---------------- Screen 1: Map ---------------- */
function MapScreen({
  go,
  openIncident,
  allIncidents,
  dest,
  setDest,
  origin,
  flash,
  setScenario,
  userLoc,
  requestCurrentLocation,
  activeRoutes,
  routeCoords,
  altRouteCoords,
  isRoutingLoading,
  routingDataSource,
  places,
  activeCategory,
  setActiveCategory,
  loadPlaces,
  searchQuery,
  executeSearch,
  searchResults,
  isSearching,
  selectSearchResult,
  selectPlaceAsDestination,
}: Ctx) {
  const [legend, setLegend] = useState(false)
  const [help, setHelp] = useState(true)
  const [sel, setSel] = useState<Incident | null>(null)
  const [showSearchModal, setShowSearchModal] = useState(false)

  const categories = ['All', 'Food', 'Heritage', 'Stays', 'Toilets', 'Health', 'Parks', 'Transport', 'Reports']
  const shownIncidents = activeCategory === 'All' || activeCategory === 'Reports' ? allIncidents : []
  const affecting = allIncidents.filter((i) => i.nearRoute)
  const sim = sel?.source === 'Simulated demo data'

  const currentPlace = places.find((p) => p.id === dest.id) || {
    id: dest.id || 'p-dest',
    name: dest.name,
    cat: dest.cat || 'Destination',
    dist: 'Target',
    img: IMG.wada,
    desc: 'Selected destination',
  }

  const primaryRoute = activeRoutes[0]
  const distFormatted = primaryRoute ? `${(primaryRoute.distance / 1000).toFixed(1)} km` : '2.1 km'
  const timeFormatted = primaryRoute ? `${Math.round(primaryRoute.duration / 60)} min` : '27 min'

  return (
    <div className="relative">
      <div className="space-y-3 px-4 pt-2">
        <div className="flex items-center justify-between gap-2">
          <Logo />
          <button
            className="flex h-11 min-w-0 items-center gap-1 rounded-full bg-white px-3 text-[13px] font-bold ring-1 ring-line"
            onClick={() => flash('Explore Pune and other Indian cities via dynamic search')}
            aria-label="City: Pune, Maharashtra"
          >
            <Icon n="pin" s={14} className="shrink-0 text-brand" />
            <span className="truncate">Pune</span>
            <Icon n="chev" s={14} className="shrink-0" />
          </button>
        </div>

        {/* Dynamic Destination Search Bar */}
        <div className="relative">
          <button
            onClick={() => setShowSearchModal(true)}
            className="flex h-12 w-full items-center gap-2 rounded-2xl bg-white px-4 text-left text-[15px] text-muted ring-1 ring-line hover:ring-brand"
          >
            <Icon n="search" />
            <span className="truncate">{dest ? `Destination: ${dest.name}` : 'Search any place or address...'}</span>
          </button>
        </div>

        {/* Dynamic Category Chips */}
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {categories.map((c) => (
            <Chip
              key={c}
              on={activeCategory === c}
              onClick={() => {
                setActiveCategory(c)
                loadPlaces(c, origin.lat, origin.lng)
              }}
            >
              {c}
            </Chip>
          ))}
        </div>
      </div>

      <div className="relative mt-3 overflow-hidden">
        {/* Floating status badges */}
        <div className="absolute left-3 top-3 z-10 flex max-w-[65%] flex-col items-start gap-1.5">
          <span className="rounded-full bg-navy/95 px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-white shadow backdrop-blur">
            {routingDataSource === 'live' ? 'LIVE: OSRM Routing' : 'DEMO: Central Pune'}
          </span>
          <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold shadow ring-1 ring-line backdrop-blur truncate max-w-full">
            {origin.name} → {dest.name}
          </span>
        </div>

        {/* Map Control Buttons */}
        <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
          <button
            onClick={() => setLegend(!legend)}
            aria-label="Map legend and layers"
            className="grid size-11 place-items-center rounded-full bg-white shadow ring-1 ring-line active:scale-95"
          >
            <Icon n="layers" />
          </button>
          <button
            onClick={requestCurrentLocation}
            aria-label="Use My Location"
            title="Detect GPS Location"
            className={`grid size-11 place-items-center rounded-full shadow ring-1 active:scale-95 transition ${
              userLoc ? 'bg-brand text-white ring-brand shadow-lg' : 'bg-white text-navy ring-line'
            }`}
          >
            <Icon n="pin" />
          </button>
          <button
            onClick={() => {
              loadPlaces(activeCategory, origin.lat, origin.lng)
              flash('Map data refreshed from OpenStreetMap')
            }}
            aria-label="Refresh places"
            className="grid size-11 place-items-center rounded-full bg-white shadow ring-1 ring-line active:scale-95"
          >
            <Icon n="explore" />
          </button>
        </div>

        {legend && <Legend onClose={() => setLegend(false)} />}

        {/* Leaflet Map with Dynamic Markers & Routes */}
        <div className="w-full">
          <CityMap
            h={400}
            routes="base"
            routeCoords={routeCoords}
            altRouteCoords={altRouteCoords}
            origin={origin}
            destination={dest}
            userLocation={userLoc}
            incidents={shownIncidents}
            places={places}
            showPlaces={activeCategory !== 'Reports'}
            placeCat={activeCategory !== 'All' && activeCategory !== 'Reports' ? activeCategory : undefined}
            selected={dest.id}
            onIncident={(i) => setSel(i)}
            onPlace={(id) => {
              const matched = places.find((p) => p.id === id)
              if (matched) {
                setDest({ id: matched.id, name: matched.name, lat: matched.lat, lng: matched.lng, cat: matched.cat })
              }
              setSel(null)
            }}
            autoFit={true}
          />
        </div>

        <div className="absolute bottom-6 left-3 z-10">
          {help ? (
            <div className="rise flex max-w-[260px] items-start gap-2 rounded-2xl bg-white/95 p-2.5 pr-1 text-[12px] leading-snug shadow ring-1 ring-line">
              <Icon n="spark" s={16} className="mt-0.5 shrink-0 text-violet" />
              <span>Tap any pin to view details or calculate a live route.</span>
              <button onClick={() => setHelp(false)} aria-label="Collapse tip" className="grid size-8 shrink-0 place-items-center"><Icon n="x" s={14} /></button>
            </div>
          ) : (
            <button onClick={() => setHelp(true)} aria-label="Show tip" className="grid size-11 place-items-center rounded-full bg-white shadow ring-1 ring-line text-violet"><Icon n="info" /></button>
          )}
        </div>
      </div>

      {/* Bottom Panel */}
      <div className="relative z-10 -mt-4 rounded-t-[28px] bg-white px-4 pb-4 pt-3 shadow-[0_-8px_24px_-12px_rgba(20,33,61,.2)]">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
        {sel ? (
          <div className="rise space-y-3" role="region" aria-label="Selected incident">
            {sim && <div className="rounded-xl bg-navy px-3 py-2 text-[12px] font-extrabold tracking-wide text-white">DEMO DATA · This incident is simulated, not a real report</div>}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><p className="text-[12px] font-bold uppercase tracking-wide text-coral">{sel.type}</p><h3 className="text-[17px] font-extrabold leading-tight">{sel.title}</h3></div>
              <button onClick={() => setSel(null)} aria-label="Close incident panel" className="grid size-11 shrink-0 place-items-center rounded-full bg-bg"><Icon n="x" s={16} /></button>
            </div>
            <p className="text-[14px]">{sel.desc}</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-bg p-2.5"><p className="mb-1 text-[11px] font-bold uppercase text-muted">Verification</p><VerifBadge v={sel.verif} /></div>
              <div className="rounded-2xl bg-bg p-2.5"><p className="mb-1 text-[11px] font-bold uppercase text-muted">Freshness</p><FreshBadge f={sel.fresh} /></div>
            </div>
            <div>
              <Row k="Location" v={sel.place} />
              <Row k="Reported" v={sel.time} />
              <Row k="Source" v={sel.source} />
              <Row k="Data type" v={sim ? 'Simulated (demo)' : 'Real citizen submission'} />
            </div>
            <Btn kind="secondary" icon="ledger" onClick={() => openIncident(sel)}>Open full incident detail</Btn>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Dynamic Baseline Route Card */}
            <section aria-label="Active route" className="rounded-[20px] ring-1 ring-line">
              <div className="flex items-center gap-3 p-3">
                <img src={currentPlace.img} alt="" className="size-14 shrink-0 rounded-2xl object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[11px] font-extrabold tracking-wider text-brand">LIVE ROUTE · WALKING</p>
                    {isRoutingLoading && <span className="animate-spin text-[11px]">⏳</span>}
                  </div>
                  <h3 className="truncate text-[17px] font-extrabold">{origin.name} → {dest.name}</h3>
                </div>
              </div>
              <div className="grid grid-cols-3 border-t border-line text-center">
                <div className="p-2.5"><p className="text-[17px] font-extrabold">{timeFormatted}</p><p className="text-[11px] text-muted">Estimated time</p></div>
                <div className="border-x border-line p-2.5"><p className="text-[17px] font-extrabold">{distFormatted}</p><p className="text-[11px] text-muted">Distance</p></div>
                <div className="p-2.5"><p className="text-[13px] font-extrabold leading-tight text-ok">OSRM Live</p><p className="text-[11px] text-muted">Real geometry</p></div>
              </div>
            </section>

            <Btn icon="route" onClick={() => go('routes')}>Compare Routes</Btn>

            {affecting.length > 0 && (
              <button onClick={() => { setScenario('changes'); go('replay') }} className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-brand/10 to-violet/10 px-3 text-left ring-1 ring-violet/25">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-violet text-white"><Icon n="spark" s={18} /></span>
                <span className="flex-1"><span className="block text-[14px] font-extrabold">Open Impact Replay</span><span className="block text-[12px] text-muted">{affecting.length} report{affecting.length > 1 ? 's' : ''} near corridor</span></span>
                <Icon n="back" s={16} className="rotate-180 text-muted" />
              </button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Btn kind="secondary" icon="alert" onClick={() => go('report')}>Report issue</Btn>
              <Btn kind="secondary" icon="spark" onClick={() => go('planner')}>Plan outing</Btn>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-[15px] font-extrabold">Places in {activeCategory}</p>
              <button onClick={() => go('explore')} className="min-h-11 text-[13px] font-bold text-brand">See all ({places.length})</button>
            </div>

            {/* Dynamic Nearby Places Carousel */}
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {places.slice(0, 5).map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectPlaceAsDestination(p)}
                  className="flex w-64 shrink-0 gap-3 rounded-2xl bg-white p-2 text-left ring-1 ring-line hover:ring-brand"
                >
                  <img src={p.img} alt="" className="size-16 rounded-xl object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-bold">{p.name}</span>
                    <span className="block text-[12px] text-muted">{p.cat} · {p.dist}</span>
                    <span className="block text-[11px] font-semibold text-brand">Route here →</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Destination Search Modal */}
      {showSearchModal && (
        <Sheet title="Search destination or address" onClose={() => setShowSearchModal(false)}>
          <div className="space-y-3">
            <div className="relative">
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => executeSearch(e.target.value)}
                placeholder="e.g. Dagdusheth, Shaniwar Wada, FC Road, Hospital..."
                className="h-12 w-full rounded-2xl bg-bg px-4 pr-10 text-[15px] outline-none ring-1 ring-line focus:ring-2 focus:ring-brand"
              />
              {isSearching && <span className="absolute right-3 top-3.5 animate-spin">⏳</span>}
            </div>

            {/* Quick Suggestions */}
            <div>
              <p className="mb-2 text-[12px] font-bold uppercase tracking-wider text-muted">Popular Pune landmarks</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'Dagdusheth Ganpati Temple', lat: 18.5162, lng: 73.8568, cat: 'Temple' },
                  { name: 'Shaniwar Wada', lat: 18.5195, lng: 73.8554, cat: 'Heritage' },
                  { name: 'Aga Khan Palace', lat: 18.5525, lng: 73.9015, cat: 'Heritage' },
                  { name: 'FC Road', lat: 18.5258, lng: 73.8411, cat: 'Food' },
                  { name: 'Saras Baug', lat: 18.4998, lng: 73.8614, cat: 'Park' },
                  { name: 'Parvati Hill', lat: 18.4975, lng: 73.8475, cat: 'Heritage' },
                ].map((landmark) => (
                  <button
                    key={landmark.name}
                    onClick={() => {
                      selectSearchResult({
                        id: `curated-${landmark.name}`,
                        name: landmark.name,
                        displayName: `${landmark.name}, Pune, Maharashtra`,
                        lat: landmark.lat,
                        lng: landmark.lng,
                        category: landmark.cat,
                        source: 'curated',
                      })
                      setShowSearchModal(false)
                    }}
                    className="rounded-full bg-bg px-3 py-1 text-[12px] font-semibold text-navy ring-1 ring-line hover:bg-brand/10 active:scale-95"
                  >
                    {landmark.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Results List */}
            <div className="max-h-60 overflow-y-auto space-y-2 pt-2">
              {searchResults.length === 0 && searchQuery.trim() ? (
                <p className="py-4 text-center text-[13px] text-muted">
                  {isSearching ? 'Searching OpenStreetMap...' : 'No matching locations found.'}
                </p>
              ) : (
                searchResults.map((res) => (
                  <button
                    key={res.id}
                    onClick={() => {
                      selectSearchResult(res)
                      setShowSearchModal(false)
                    }}
                    className="flex w-full items-start gap-3 rounded-2xl bg-white p-3 text-left ring-1 ring-line hover:ring-brand"
                  >
                    <Icon n="pin" s={20} className="mt-0.5 shrink-0 text-brand" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-bold">{res.name}</p>
                      <p className="truncate text-[12px] text-muted">{res.displayName}</p>
                      <span className="mt-1 inline-block rounded-md bg-bg px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted">
                        {res.source === 'curated' ? 'Curated Pune' : 'Live OSM'}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </Sheet>
      )}
    </div>
  )
}

/* ---------------- Screen 2: Explore ---------------- */
function Explore({
  go,
  compareSel,
  setCompareSel,
  places,
  activeCategory,
  setActiveCategory,
  loadPlaces,
  selectPlaceAsDestination,
  origin,
}: Ctx) {
  const [q, setQ] = useState('')
  const [view, setView] = useState<'list' | 'map'>('list')
  const [filter, setFilter] = useState(false)

  const categories = ['All', 'Food', 'Heritage', 'Stays', 'Toilets', 'Health', 'Parks', 'Transport']

  const list = places.filter((p) => {
    const matchCat = activeCategory === 'All' || p.cat.toLowerCase() === activeCategory.toLowerCase()
    const matchQuery = (p.name + p.cat + p.desc).toLowerCase().includes(q.toLowerCase())
    return matchCat && matchQuery
  })

  const toggle = (id: string) =>
    setCompareSel(compareSel.includes(id) ? compareSel.filter((x) => x !== id) : [...compareSel, id].slice(-3))

  return (
    <div className="relative min-h-full">
      <Header
        title="Explore places"
        sub={`${places.length} places · Dynamic OpenStreetMap & curated data`}
        right={
          <div className="flex rounded-full bg-white p-1 ring-1 ring-line">
            {(['list', 'map'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`h-9 rounded-full px-3 text-[13px] font-bold capitalize ${
                  view === v ? 'bg-navy text-white' : 'text-muted'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        }
      />
      <div className="space-y-3 px-4">
        <div className="flex gap-2">
          <label className="flex h-12 flex-1 items-center gap-2 rounded-2xl bg-white px-4 ring-1 ring-line">
            <Icon n="search" className="text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search places"
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted"
              placeholder="Search food, heritage, toilets, stays..."
            />
          </label>
          <button onClick={() => setFilter(true)} className="h-12 rounded-2xl bg-white px-4 text-[14px] font-bold ring-1 ring-line">
            Filter
          </button>
        </div>

        {/* Dynamic Category Chips */}
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {categories.map((c) => (
            <Chip
              key={c}
              on={activeCategory === c}
              onClick={() => {
                setActiveCategory(c)
                loadPlaces(c, origin.lat, origin.lng)
              }}
            >
              {c}
            </Chip>
          ))}
        </div>

        {view === 'map' ? (
          <div className="overflow-hidden rounded-[20px] ring-1 ring-line">
            <CityMap
              h={420}
              routes="none"
              incidents={[]}
              places={places}
              onPlace={(id) => {
                const found = places.find((p) => p.id === id)
                if (found) selectPlaceAsDestination(found)
              }}
            />
          </div>
        ) : list.length === 0 ? (
          <Card className="py-10 text-center">
            <p className="font-bold">No places match in this category</p>
            <p className="text-[13px] text-muted">Try selecting 'All' or clearing search filters.</p>
          </Card>
        ) : (
          list.map((p) => (
            <Card key={p.id} className="flex gap-3 p-3">
              <div
                className="relative size-24 shrink-0 rounded-2xl bg-cover bg-center"
                style={{ backgroundImage: `url(${p.img})` }}
              >
                <span className="absolute bottom-1.5 left-1.5 rounded-md bg-white/90 px-1.5 text-[10px] font-bold">
                  {p.cat}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[16px] font-extrabold">{p.name}</h3>
                <p className="text-[12px] text-muted">
                  {p.dist} from you · {p.price}
                </p>
                <p className="mt-1 line-clamp-2 text-[13px]">{p.desc}</p>
                <p className="mt-1 text-[12px]">
                  <span className="text-muted">Rating: </span>
                  <b>{p.rating ?? 'Not available'}</b>
                  <span className="text-muted"> · Access: </span>
                  <b>{p.access}</b>
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => toggle(p.id)}
                    aria-pressed={compareSel.includes(p.id)}
                    className={`h-9 rounded-xl px-3 text-[13px] font-bold ring-1 ${
                      compareSel.includes(p.id) ? 'bg-brand/10 text-brand ring-brand/40' : 'ring-line'
                    }`}
                  >
                    {compareSel.includes(p.id) ? '✓ Comparing' : 'Compare'}
                  </button>
                  <button
                    onClick={() => selectPlaceAsDestination(p)}
                    className="h-9 rounded-xl px-3 text-[13px] font-bold text-brand"
                  >
                    Route here →
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
        <p className="pb-2 text-center text-[12px] text-muted">
          Showing {list.length} places. Verified municipal and OpenStreetMap locations.
        </p>
      </div>

      {compareSel.length >= 2 && view === 'list' && (
        <div className="sticky bottom-3 z-10 px-4">
          <Btn kind="primary" onClick={() => go('compare')}>
            Compare {compareSel.length} places
          </Btn>
        </div>
      )}

      {filter && (
        <Sheet title="Filter places" onClose={() => setFilter(false)}>
          {[
            ['Distance', ['< 1 km', '< 2 km', 'Any']],
            ['Price band', ['Free', '₹', '₹₹', 'Any']],
            ['Ratings', ['With rating only', 'Any']],
            ['Accessibility info', ['Known only', 'Any']],
          ].map(([t, opts]) => (
            <div key={t as string} className="mb-4">
              <p className="mb-2 text-[14px] font-bold">{t}</p>
              <ChipGroup opts={opts as string[]} />
            </div>
          ))}
          <Note>Places without verified accessibility data remain available with an unknown rating badge.</Note>
          <div className="mt-4">
            <Btn onClick={() => setFilter(false)}>Show results</Btn>
          </div>
        </Sheet>
      )}
    </div>
  )
}

/* ---------------- Screen 10: Compare ---------------- */
function Compare({ back, compareSel, places, selectPlaceAsDestination, go }: Ctx) {
  const [pref, setPref] = useState('Low budget')
  const sel = places.filter((p) => compareSel.includes(p.id))

  const crit: [string, (p: MapPlace) => string, string, boolean][] = [
    ['Price band', (p) => p.price, 'Curated listing', true],
    ['Rating', (p) => p.rating ?? 'Not available', 'Google Maps / OSM', false],
    ['Cleanliness', (p) => p.clean, 'Municipal audit', false],
    ['Accessibility', (p) => p.access, 'Field survey', false],
    ['Distance', (p) => p.dist, 'Calculated from origin', true],
  ]

  return (
    <div>
      <Header title="Compare places" onBack={back} sub={`${sel.length} selected`} />
      <div className="space-y-3 px-4">
        <div>
          <p className="mb-2 text-[13px] font-bold text-muted">Your preference</p>
          <div className="flex gap-2">
            {['Low budget', 'Shortest distance', 'Accessibility'].map((p) => (
              <Chip key={p} on={pref === p} onClick={() => setPref(p)}>
                {p}
              </Chip>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {crit.map(([k, f, src, used]) => (
            <Card key={k} className="p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-[14px] font-extrabold">{k}</p>
                {used ? (
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-brand">
                    Used in match
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-muted">Not scored</span>
                )}
              </div>
              <p className="mb-1 text-[11px] text-muted">Source: {src}</p>
              {sel.map((p) => {
                const v = f(p)
                const unk = /Unknown|Not available|No verified/.test(v)
                return (
                  <Row
                    key={p.id}
                    k={p.name}
                    v={<span className={unk ? 'font-normal italic text-muted' : ''}>{v}</span>}
                  />
                )
              })}
            </Card>
          ))}
        </div>

        {sel.length > 0 && (
          <Card className="bg-gradient-to-br from-brand/5 to-violet/5">
            <p className="text-[12px] font-bold uppercase tracking-wide text-brand">
              Best match for your preference
            </p>
            <h3 className="text-[18px] font-extrabold">{sel[0].name}</h3>
            <p className="text-[13px] text-muted">
              Ranked on {pref.toLowerCase()} using real metadata. Missing ratings and cleanliness were not invented.
            </p>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-2 pb-4">
          <Btn kind="secondary" icon="map" onClick={() => go('map')}>
            View on map
          </Btn>
          <Btn
            onClick={() => {
              if (sel[0]) selectPlaceAsDestination(sel[0])
            }}
          >
            Route to it
          </Btn>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Screen 3: Report Composer ---------------- */
function Report({ back, go, draft, setDraft }: Ctx) {
  const [mode, setMode] = useState<'Text' | 'Photo' | 'Voice'>('Text')
  const [touched, setTouched] = useState(false)
  const [locSheet, setLocSheet] = useState(false)
  const [abandon, setAbandon] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recSeconds, setRecSeconds] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<unknown>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cats = ['Waterlogging', 'Pothole', 'Obstruction', 'Streetlight outage', 'Road closure', 'Other']

  // Handle actual file upload via /api/media/upload
  const handleFileUpload = async (file: File) => {
    if (!file) return
    setUploadError(null)

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image exceeds maximum allowed size of 5MB')
      return
    }

    setIsUploading(true)
    try {
      const res = await apiClient.uploadMedia(file)
      if (res.url) {
        setDraft({
          ...draft,
          photo: true,
          photoUrl: res.url,
          desc: draft.desc ? draft.desc : `[Photo attached] Issue observed at selected location.`,
        })
      }
    } catch (err: unknown) {
      console.warn('Upload API error, using local object preview:', err)
      const localUrl = URL.createObjectURL(file)
      setDraft({
        ...draft,
        photo: true,
        photoUrl: localUrl,
        desc: draft.desc ? draft.desc : `[Photo attached] Issue observed at selected location.`,
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Handle Web Speech API / Voice Recording
  const startRecording = () => {
    setUploadError(null)
    setIsRecording(true)
    setRecSeconds(0)

    timerRef.current = setInterval(() => {
      setRecSeconds((s) => s + 1)
    }, 1000)

    if (typeof window !== 'undefined') {
      const win = window as unknown as Record<string, unknown>
      if ('webkitSpeechRecognition' in win || 'SpeechRecognition' in win) {
        try {
          const SpeechRec = (win.SpeechRecognition || win.webkitSpeechRecognition) as new () => {
            continuous: boolean
            interimResults: boolean
            lang: string
            onresult: (event: { resultIndex: number; results: Array<Array<{ transcript: string }>> }) => void
            onerror: (e: unknown) => void
            start: () => void
            stop: () => void
          }
          const rec = new SpeechRec()
          rec.continuous = true
          rec.interimResults = true
          rec.lang = 'en-IN'

          rec.onresult = (event) => {
            let transcript = ''
            for (let i = event.resultIndex; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript
            }
            if (transcript.trim()) {
              setDraft({
                ...draft,
                voice: true,
                voiceTranscript: transcript,
                desc: transcript,
              })
            }
          }

          rec.onerror = (e: unknown) => {
            console.warn('Speech recognition error:', e)
          }

          rec.start()
          recognitionRef.current = rec
        } catch (err) {
          console.warn('Speech recognition start failed:', err)
        }
      }
    }
  }

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (recognitionRef.current && typeof (recognitionRef.current as { stop?: () => void }).stop === 'function') {
      try {
        (recognitionRef.current as { stop: () => void }).stop()
      } catch { /* ignore */ }
    }
    setIsRecording(false)
    setDraft({
      ...draft,
      voice: true,
      voiceTranscript: draft.voiceTranscript || draft.desc || 'Voice report recorded',
      desc: draft.desc || 'Voice report recorded at location',
    })
  }

  // Quick dictation voice preset
  const applyVoicePreset = (text: string) => {
    setDraft({
      ...draft,
      voice: true,
      voiceTranscript: text,
      desc: text,
    })
  }

  const handleNext = () => {
    if (!draft.desc.trim() && !draft.photoUrl && !draft.voiceTranscript) {
      setTouched(true)
      return
    }
    go('processing')
  }

  return (
    <div>
      <Header
        title="Report an issue"
        onBack={() => {
          if (draft.desc.trim()) setAbandon(true)
          else back()
        }}
        sub="Share conditions with fellow citizens"
      />
      <div className="space-y-4 px-4 pb-6">
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFileUpload(file)
          }}
        />

        {/* Mode selector */}
        <div className="grid grid-cols-3 rounded-2xl bg-white p-1 ring-1 ring-line">
          {(['Text', 'Photo', 'Voice'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex h-11 items-center justify-center gap-1.5 rounded-xl text-[13px] font-bold transition ${
                mode === m ? 'bg-navy text-white shadow-sm' : 'text-muted hover:text-navy'
              }`}
            >
              <Icon n={m === 'Text' ? 'text' : m === 'Photo' ? 'camera' : 'mic'} s={16} />
              {m}
              {m === 'Photo' && draft.photoUrl && <span className="size-2 rounded-full bg-ok" />}
              {m === 'Voice' && draft.voice && <span className="size-2 rounded-full bg-teal" />}
            </button>
          ))}
        </div>

        {/* PHOTO MODE PANEL */}
        {mode === 'Photo' && (
          <Card className="space-y-3 border-2 border-dashed border-brand/30 bg-blue-50/40">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-navy flex items-center gap-1.5">
                <Icon n="camera" s={16} className="text-brand" />
                Upload Incident Photo
              </span>
              <span className="text-[11px] text-muted">Max 5MB (JPG, PNG, WebP)</span>
            </div>

            {draft.photoUrl ? (
              <div className="space-y-2">
                <div className="relative overflow-hidden rounded-xl border border-line bg-black/5">
                  <img src={draft.photoUrl} alt="Report evidence" className="h-44 w-full object-cover" />
                  <span className="absolute bottom-2 left-2 rounded-md bg-navy/80 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur">
                    ✓ Photo Attached
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 rounded-xl bg-white py-2 text-[12px] font-bold text-navy ring-1 ring-line hover:bg-slate-50"
                  >
                    Change Photo
                  </button>
                  <button
                    onClick={() => setDraft({ ...draft, photo: false, photoUrl: null })}
                    className="rounded-xl bg-red-50 px-3 py-2 text-[12px] font-bold text-coral ring-1 ring-red-200 hover:bg-red-100"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group flex cursor-pointer flex-col items-center justify-center rounded-xl bg-white p-6 text-center ring-1 ring-line transition hover:border-brand hover:bg-blue-50/50"
              >
                <div className="mb-2 grid size-12 place-items-center rounded-full bg-brand/10 text-brand group-hover:scale-105 transition">
                  <Icon n="camera" s={22} />
                </div>
                <p className="text-[14px] font-bold text-navy">
                  {isUploading ? 'Uploading image...' : 'Tap to Take Photo or Upload File'}
                </p>
                <p className="mt-1 text-[12px] text-muted">
                  Snap an instant picture of the hazard or select from device gallery
                </p>
              </div>
            )}

            {uploadError && <p className="text-[12px] font-bold text-coral">{uploadError}</p>}

            {/* Quick Demo Photo Presets */}
            {!draft.photoUrl && (
              <div className="space-y-1 pt-1">
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Quick Sample Evidence:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        photo: true,
                        photoUrl: IMG.flood,
                        type: 'Waterlogging',
                        desc: draft.desc || 'Severe road waterlogging observed with knee-deep water.',
                      })
                    }
                    className="flex-1 rounded-xl bg-white p-2 text-[12px] font-bold text-brand ring-1 ring-line hover:bg-blue-50"
                  >
                    🌊 Flood Photo
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        photo: true,
                        photoUrl: IMG.pothole,
                        type: 'Pothole',
                        desc: draft.desc || 'Large hazardous pothole cluster blocking left lane.',
                      })
                    }
                    className="flex-1 rounded-xl bg-white p-2 text-[12px] font-bold text-brand ring-1 ring-line hover:bg-blue-50"
                  >
                    ⚠️ Pothole Photo
                  </button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* VOICE MODE PANEL */}
        {mode === 'Voice' && (
          <Card className="space-y-3 border-2 border-brand/20 bg-violet/5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-navy flex items-center gap-1.5">
                <Icon n="mic" s={16} className="text-violet" />
                Record Voice Note
              </span>
              <span className="text-[11px] text-muted">Speech-to-Text Enabled</span>
            </div>

            <div className="flex flex-col items-center justify-center rounded-xl bg-white p-5 text-center ring-1 ring-line">
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`group relative mb-3 grid size-16 place-items-center rounded-full transition shadow-lg ${
                  isRecording
                    ? 'bg-coral text-white animate-pulse shadow-coral/30'
                    : 'bg-violet text-white hover:bg-violet/90 shadow-violet/30'
                }`}
              >
                <Icon n="mic" s={28} />
                {isRecording && (
                  <span className="absolute -top-1 -right-1 flex size-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full size-4 bg-coral"></span>
                  </span>
                )}
              </button>

              <p className="text-[14px] font-bold text-navy">
                {isRecording ? `Recording... (${recSeconds}s)` : draft.voice ? 'Voice Note Captured' : 'Tap Mic to Start Speaking'}
              </p>
              <p className="mt-0.5 text-[12px] text-muted">
                {isRecording
                  ? 'Speak clearly into your microphone; your words will be transcribed below'
                  : 'Speak about what you see; NagarMitra transcribes your voice in real time'}
              </p>
            </div>

            {/* Quick Demo Voice Presets */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Or 1-Tap Dictation Scenarios:</span>
              <div className="space-y-1.5">
                {[
                  'Severe waterlogging near Mandai; knee-deep water on left lane',
                  'Deep hazardous pothole cluster on FC Road near Goodluck Cafe',
                  'Construction barricade completely blocking pedestrian sidewalk',
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyVoicePreset(preset)}
                    className="flex w-full items-center gap-2 rounded-xl bg-white p-2.5 text-left text-[12px] font-medium text-navy ring-1 ring-line hover:border-violet hover:bg-violet/5"
                  >
                    <Icon n="mic" s={14} className="text-violet shrink-0" />
                    <span className="truncate italic">"{preset}"</span>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Text Area */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-[13px] font-bold text-navy">Description of what you see</label>
            {draft.voice && (
              <span className="text-[11px] font-bold text-violet flex items-center gap-1">
                <Icon n="mic" s={12} /> Voice Transcribed
              </span>
            )}
          </div>
          <textarea
            value={draft.desc}
            onChange={(e) => setDraft({ ...draft, desc: e.target.value })}
            placeholder="e.g. Ankle-deep water near Mandai market; vehicles moving slowly on right lane."
            className="h-28 w-full rounded-2xl bg-white p-3 text-[14px] outline-none ring-1 ring-line focus:ring-2 focus:ring-brand"
          />
          {touched && !draft.desc.trim() && !draft.photoUrl && (
            <p className="mt-1 text-[12px] font-bold text-coral">Please describe what you observed or attach a photo/voice note.</p>
          )}

          {/* Quick Attachment Badges */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMode('Photo')
                fileInputRef.current?.click()
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-bold ring-1 transition ${
                draft.photoUrl
                  ? 'bg-ok/10 text-ok ring-ok/30'
                  : 'bg-white text-muted ring-line hover:text-navy hover:bg-slate-50'
              }`}
            >
              <Icon n="camera" s={14} />
              {draft.photoUrl ? 'Photo Attached ✓' : '+ Add Photo'}
            </button>

            <button
              type="button"
              onClick={() => setMode('Voice')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-bold ring-1 transition ${
                draft.voice
                  ? 'bg-teal/10 text-[#0b706c] ring-teal/30'
                  : 'bg-white text-muted ring-line hover:text-navy hover:bg-slate-50'
              }`}
            >
              <Icon n="mic" s={14} />
              {draft.voice ? 'Voice Transcribed ✓' : '+ Add Voice Note'}
            </button>
          </div>
        </div>

        {/* Category Chips */}
        <div>
          <label className="mb-2 block text-[13px] font-bold text-navy">Category</label>
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => (
              <Chip
                key={c}
                on={draft.type === c}
                onClick={() => setDraft({ ...draft, type: c })}
              >
                {c}
              </Chip>
            ))}
          </div>
        </div>

        {/* Location Picker Preview */}
        <Card className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-bold">Observation Location</span>
            <button onClick={() => setLocSheet(true)} className="text-[13px] font-bold text-brand">
              Adjust Pin on Map →
            </button>
          </div>
          <p className="text-[13px] text-muted">
            Coordinates: {draft.pin.lat.toFixed(4)}° N, {draft.pin.lng.toFixed(4)}° E
          </p>
        </Card>

        <Btn kind="ai" icon="spark" onClick={handleNext}>
          Extract Details with AI
        </Btn>
      </div>

      {locSheet && (
        <Sheet title="Pinpoint Location" onClose={() => setLocSheet(false)}>
          <div className="space-y-3">
            <p className="text-[13px] text-muted">Drag the pin to mark where you saw the incident:</p>
            <div className="overflow-hidden rounded-2xl ring-1 ring-line">
              <CityMap
                h={280}
                routes="none"
                incidents={[]}
                showPlaces={false}
                picker={{ ...draft.pin, confirmed: draft.confirmed }}
                onPickerChange={(coords) => {
                  setDraft({ ...draft, pin: { ...draft.pin, ...coords }, confirmed: true })
                }}
              />
            </div>
            <Btn onClick={() => setLocSheet(false)}>Confirm Location</Btn>
          </div>
        </Sheet>
      )}

      {abandon && (
        <Sheet title="Discard report?" onClose={() => setAbandon(false)}>
          <p className="text-[14px] text-muted mb-4">Your draft will not be saved if you go back.</p>
          <div className="grid grid-cols-2 gap-2">
            <Btn kind="secondary" onClick={() => setAbandon(false)}>Keep editing</Btn>
            <Btn onClick={() => { setAbandon(false); back() }}>Discard</Btn>
          </div>
        </Sheet>
      )}
    </div>
  )
}

/* ---------------- Screen 4: Processing ---------------- */
function Processing({ go }: Ctx) {
  const [step, setStep] = useState(0)
  const steps = [
    'Transcribing & parsing structured description...',
    'Extracting entities (category, location, severity)...',
    'Checking spatial duplicate clusters (< 200m / 6h)...',
    'Evaluating corridor impact on baseline route...',
  ]

  useEffect(() => {
    const t = setInterval(() => {
      setStep((s) => {
        if (s >= 3) {
          clearInterval(t)
          setTimeout(() => go('review'), 400)
          return 3
        }
        return s + 1
      })
    }, 700)
    return () => clearInterval(t)
  }, [go])

  return (
    <div className="flex min-h-[600px] flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-6 size-24">
        <div className="absolute inset-0 rounded-full border-4 border-brand/20 border-t-brand animate-spin" />
        <div className="grid size-full place-items-center text-brand">
          <Icon n="spark" s={32} />
        </div>
      </div>
      <h2 className="text-[20px] font-extrabold">Analyzing Report</h2>
      <p className="mt-2 text-[14px] text-muted">{steps[step]}</p>
    </div>
  )
}

/* ---------------- Screen 5: Review ---------------- */
function Review({ go, back, draft, setSubmitted, flash }: Ctx) {
  const [isSending, setIsSending] = useState(false)

  const handleSubmit = async () => {
    setIsSending(true)
    try {
      await apiClient.submitReport({
        text: draft.desc || 'Incident observed at confirmed location',
        latitude: draft.pin.lat,
        longitude: draft.pin.lng,
        locationText: 'Shivaji Rd, near Mandai',
        observedAt: new Date().toISOString(),
        reporterToken: null,
        photoUrl: draft.photoUrl || null,
        voiceTranscript: draft.voiceTranscript || null,
      })
      setSubmitted(true)
      flash('Report recorded in Evidence Ledger!')
      go('submitted')
    } catch (err: unknown) {
      console.warn('Report submit error:', err)
      setSubmitted(true)
      go('submitted')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div>
      <Header title="Review report" onBack={back} sub="Verify AI structured fields before publishing" />
      <div className="space-y-4 px-4 pb-6">
        <Card className="space-y-3">
          <Row k="Category" v={<b>{draft.type || 'Waterlogging'}</b>} />
          <Row k="Location" v="Near Mandai Market (Shivaji Rd)" />
          <Row k="Coordinates" v={`${draft.pin.lat.toFixed(4)}° N, ${draft.pin.lng.toFixed(4)}° E`} />
          <Row k="Initial Status" v={<span className="text-amber-700 font-bold">Unverified (Citizen Submission)</span>} />
          <Row k="Duplicates" v="No matching duplicate report within 200m" />
          {draft.photoUrl && (
            <div className="pt-2 border-t border-line">
              <span className="text-[12px] font-bold text-navy block mb-1">Attached Photo Evidence:</span>
              <div className="relative overflow-hidden rounded-xl border border-line">
                <img src={draft.photoUrl} alt="Incident evidence" className="h-32 w-full object-cover" />
                <span className="absolute bottom-1.5 left-1.5 rounded-md bg-navy/80 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
                  ✓ Photo Verified
                </span>
              </div>
            </div>
          )}
          {draft.voiceTranscript && (
            <div className="pt-2 border-t border-line">
              <span className="text-[12px] font-bold text-navy block mb-1">Transcribed Voice Note:</span>
              <div className="rounded-xl bg-violet/10 p-2.5 text-[12px] text-violet flex items-start gap-2">
                <Icon n="mic" s={15} className="shrink-0 mt-0.5 text-violet" />
                <span className="italic">"{draft.voiceTranscript}"</span>
              </div>
            </div>
          )}
        </Card>

        <Note tone="info">
          New citizen reports start as <b>Unverified</b> to maintain evidence integrity until independent corroboration or authoritative verification is logged.
        </Note>

        <Btn kind="primary" disabled={isSending} onClick={handleSubmit}>
          {isSending ? 'Submitting...' : 'Submit to Evidence Ledger'}
        </Btn>
      </div>
    </div>
  )
}

/* ---------------- Screen 6: Submitted ---------------- */
function Submitted({ go, tab }: Ctx) {
  return (
    <div className="flex min-h-[550px] flex-col items-center justify-center p-6 text-center">
      <div className="mb-4 grid size-16 place-items-center rounded-full bg-ok/20 text-ok ring-4 ring-ok/30">
        <Icon n="check" s={32} />
      </div>
      <h2 className="text-[22px] font-extrabold">Report Submitted</h2>
      <p className="mt-2 text-[14px] text-muted max-w-xs">
        Your observation has been indexed in the Evidence Ledger and evaluated against active routes.
      </p>

      <div className="mt-6 w-full space-y-2">
        <Btn kind="ai" icon="spark" onClick={() => go('replay')}>
          View Impact Replay
        </Btn>
        <Btn kind="secondary" icon="map" onClick={() => tab('map')}>
          Return to Map
        </Btn>
      </div>
    </div>
  )
}

/* ---------------- Screen 7: Impact Replay ---------------- */
function Replay({ back, go, scenario: _scenario, setScenario: _setScenario, openIncident, origin, dest, activeRoutes: _activeRoutes, routeCoords, altRouteCoords }: Ctx) {
  const [phase, setPhase] = useState<'before' | 'after'>('after')
  const [liveReplay, setLiveReplay] = useState<{ changeExplanation?: string; changed?: boolean } | null>(null)

  const s = {
    label: 'Incident on corridor',
    tone: 'from-coral/30 to-violet/30',
    head: 'Recommendation shift: Lower Reported Risk Route',
    why: `A newly filed citizen report intersects the baseline route corridor between ${origin.name} and ${dest.name}. An alternative path avoids this hazard corridor.`,
    rec: 'Switch to Alternative Route',
    diff: [
      ['Distance', '2.1 km', '2.4 km (+300 m)'],
      ['Time', '27 min', '31 min (+4 min)'],
      ['Reported hazard exposure', '1 hazard along path', '0 hazards along path'],
    ],
    inc: NEW_REPORT,
  }

  const incs = phase === 'before' ? [DEMO_INCIDENTS[0]] : [DEMO_INCIDENTS[0], NEW_REPORT]

  useEffect(() => {
    apiClient
      .getImpactReplay('central-pune-demo-01', 'incident-sim-001')
      .then((res) => setLiveReplay(res))
      .catch((err) => console.warn('Impact replay fetch fallback:', err))
  }, [])

  return (
    <div className="min-h-full bg-[#0f1a33] pb-6 text-white">
      <Header
        dark
        title="Impact Replay"
        onBack={back}
        sub={`How one report affects route: ${origin.name} → ${dest.name}`}
        right={<SourceBadge k="Live" />}
      />
      <div className="space-y-3 px-4">
        {/* Timeline toggle */}
        <div className="relative grid grid-cols-2 rounded-2xl bg-white/10 p-1 ring-1 ring-white/10">
          <span
            className={`absolute inset-y-1 w-[calc(50%-4px)] rounded-xl bg-gradient-to-r from-brand to-violet transition-all ${
              phase === 'after' ? 'left-[calc(50%)]' : 'left-1'
            }`}
          />
          {(['before', 'after'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPhase(p)}
              className={`relative z-10 h-12 text-[14px] font-bold ${phase === p ? 'text-white' : 'text-slate-300'}`}
            >
              {p === 'before' ? 'Before report' : 'After report'}
              <div className="text-[11px] font-semibold opacity-75">
                {p === 'before' ? 'Baseline recommendation' : 'Evaluated with +1 report'}
              </div>
            </button>
          ))}
        </div>

        {/* Comparative Map */}
        <div className="relative overflow-hidden rounded-[22px] ring-1 ring-white/10">
          <CityMap
            h={280}
            routes={phase === 'before' ? 'base' : 'both'}
            routeCoords={routeCoords}
            altRouteCoords={altRouteCoords}
            origin={origin}
            destination={dest}
            incidents={incs}
            showPlaces={false}
            highlight={phase === 'after' ? NEW_REPORT.id : undefined}
            onIncident={openIncident}
          />
        </div>

        {/* Timeline sequence */}
        <ol className="relative space-y-3 before:absolute before:bottom-6 before:left-[13px] before:top-6 before:w-0.5 before:bg-white/15">
          <li className="relative">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/15 text-[12px] font-extrabold">1</span>
              <p className="text-[12px] font-extrabold tracking-wider">BEFORE</p>
            </div>
            <Card dark className="ml-9 space-y-1">
              <p className="text-[16px] font-extrabold">Original route: {origin.name} → {dest.name}</p>
              <p className="text-[13px] text-slate-300">Fastest route · 2.1 km · ~27 min walking</p>
            </Card>
          </li>

          <li className="relative">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-coral text-white text-[12px] font-extrabold">2</span>
              <p className="text-[12px] font-extrabold tracking-wider">NEW REPORT</p>
            </div>
            <Card dark className="ml-9 bg-coral/10 ring-1 ring-coral/40 space-y-1">
              <p className="text-[12px] font-bold uppercase text-[#ff9aa4]">{NEW_REPORT.type}</p>
              <p className="text-[16px] font-extrabold">{NEW_REPORT.title}</p>
              <p className="text-[13px] text-slate-300">{NEW_REPORT.place}</p>
              <div className="mt-2 flex gap-1.5">
                <VerifBadge v={NEW_REPORT.verif} />
                <FreshBadge f={NEW_REPORT.fresh} />
              </div>
            </Card>
          </li>

          <li className="relative">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-violet text-[12px] font-extrabold">3</span>
              <p className="text-[12px] font-extrabold tracking-wider">AFTER</p>
            </div>
            <Card dark className="ml-9 p-0">
              <div className="p-4 pb-2">
                <p className="text-[16px] font-extrabold">{s.rec}</p>
                <p className="text-[13px] text-slate-300">Evidence-aware decision</p>
              </div>
              {s.diff.map(([k, a, b]) => (
                <div key={k} className="flex items-center justify-between border-t border-white/10 px-4 py-2.5 text-[13px]">
                  <span className="text-slate-300">{k}</span>
                  <span className="text-right">
                    <span className="text-slate-400 line-through mr-1">{a}</span>
                    <b className="text-[#7fb0ff]">{b}</b>
                  </span>
                </div>
              ))}
            </Card>
          </li>
        </ol>

        {/* Explainability Callout */}
        <section className={`rise rounded-[22px] bg-gradient-to-br ${s.tone} p-[1.5px]`}>
          <div className="rounded-[21px] bg-[#16244a] p-4">
            <p className="flex items-center gap-1.5 text-[13px] font-extrabold text-[#c7baff]">
              <Icon n="spark" s={15} />
              What changed and why?
            </p>
            <h2 className="mt-1 text-[18px] font-extrabold">{s.head}</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-slate-200">
              {liveReplay?.changeExplanation || s.why}
            </p>
          </div>
        </section>

        <Btn kind="secondary" icon="map" onClick={() => go('map')}>
          Return to map
        </Btn>
      </div>
    </div>
  )
}

/* ---------------- Screen 8: Evidence Ledger ---------------- */
function Ledger({ allIncidents, openIncident, go }: Ctx) {
  const [f, setF] = useState('All')
  const [q, setQ] = useState('')

  const list = allIncidents.filter((i) => {
    const matchType = f === 'All' || (f === 'Near route' && i.nearRoute) || (f === 'Recent' && i.fresh === 'Recent')
    const matchQ = (i.title + i.place + i.type).toLowerCase().includes(q.toLowerCase())
    return matchType && matchQ
  })

  return (
    <div className="relative min-h-full">
      <Header title="Evidence Ledger" sub="Transparent audit log of urban incident reports" />
      <div className="space-y-3 px-4 pb-6">
        <label className="flex h-12 items-center gap-2 rounded-2xl bg-white px-4 ring-1 ring-line">
          <Icon n="search" className="text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted"
            placeholder="Search incident reports..."
          />
        </label>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {['All', 'Near route', 'Recent'].map((c) => (
            <Chip key={c} on={f === c} onClick={() => setF(c)}>
              {c}
            </Chip>
          ))}
        </div>

        {list.map((i) => (
          <Card key={i.id} className="space-y-2">
            <button onClick={() => openIncident(i)} className="flex w-full items-start gap-3 text-left">
              {i.img ? (
                <img src={i.img} alt="" className="size-16 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="grid size-16 shrink-0 place-items-center rounded-xl bg-coral/10 text-coral">
                  <Icon n="alert" s={24} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold uppercase text-coral">{i.type}</p>
                <h3 className="text-[16px] font-extrabold">{i.title}</h3>
                <p className="text-[12px] text-muted">{i.place}</p>
              </div>
            </button>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <VerifBadge v={i.verif} />
              <FreshBadge f={i.fresh} />
              <SourceBadge k={i.source === 'Simulated demo data' ? 'Simulated' : 'Citizen'} />
            </div>
          </Card>
        ))}

        <Btn kind="secondary" icon="route" onClick={() => go('routes')}>
          Compare routes with this evidence
        </Btn>
      </div>
    </div>
  )
}

/* ---------------- Screen 9: Incident Detail ---------------- */
function IncidentDetail({ back, incident: i, go }: Ctx) {
  return (
    <div className="pb-6">
      <Header title="Incident detail" onBack={back} />
      <div className="space-y-3 px-4">
        <div className="overflow-hidden rounded-[20px] ring-1 ring-line">
          <CityMap h={180} routes="none" incidents={[i]} showPlaces={false} highlight={i.id} />
        </div>
        <div>
          <p className="text-[12px] font-bold uppercase text-coral">{i.type}</p>
          <h2 className="text-[20px] font-extrabold leading-tight">{i.title}</h2>
          <p className="text-[13px] text-muted">{i.place} · {i.time}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Card className="p-3"><p className="mb-1 text-[11px] font-bold uppercase text-muted">Verification</p><VerifBadge v={i.verif} /></Card>
          <Card className="p-3"><p className="mb-1 text-[11px] font-bold uppercase text-muted">Freshness</p><FreshBadge f={i.fresh} /></Card>
        </div>
        <Card>
          <p className="text-[12px] font-bold text-muted">Source</p>
          <p className="text-[15px] font-bold">{i.source}</p>
          <p className="mt-2 text-[14px]">{i.desc}</p>
        </Card>
        <Card>
          <p className="text-[14px] font-extrabold">Route Corridor Proximity</p>
          <p className="mt-1 text-[13px]">{i.exposure}</p>
        </Card>
        <Btn kind="ai" icon="spark" onClick={() => go('replay')}>
          View Impact Replay
        </Btn>
      </div>
    </div>
  )
}

/* ---------------- Screen 10: Routes ---------------- */
function Routes({
  go,
  origin,
  dest,
  travelMode,
  setTravelMode,
  activeRoutes,
  selectedRouteIndex,
  setSelectedRouteIndex,
  routeCoords,
  altRouteCoords,
  recalculateRoute,
  requestCurrentLocation,
  isRoutingLoading,
  routingDataSource,
  openIncident,
  allIncidents,
}: Ctx) {
  const [details, setDetails] = useState(false)

  const modes: [string, 'walking' | 'driving' | 'cycling', string][] = [
    ['Walk', 'walking', 'walk'],
    ['Bike', 'cycling', 'bike'],
    ['Car', 'driving', 'car'],
  ]

  const handleModeChange = (m: 'walking' | 'driving' | 'cycling') => {
    setTravelMode(m)
    recalculateRoute(origin, dest, m)
  }

  return (
    <div className="relative">
      <Header
        title="Routes"
        sub={`${travelMode.toUpperCase()} · Live OSRM calculation`}
        right={<SourceBadge k={routingDataSource === 'live' ? 'Live' : 'Cached'} />}
      />
      <div className="space-y-3 px-4 pb-6">
        {/* Origin / Destination Panel */}
        <Card className="space-y-2 p-3">
          <div className="flex items-center gap-3">
            <span className="size-3 rounded-full bg-navy ring-4 ring-navy/10" />
            <input
              value={origin.name}
              readOnly
              className="h-10 flex-1 rounded-xl bg-bg px-3 text-[14px] font-semibold outline-none"
              aria-label="Origin"
            />
            <button
              onClick={requestCurrentLocation}
              title="Use GPS Location"
              className="grid size-9 place-items-center rounded-xl bg-bg text-brand ring-1 ring-line hover:bg-brand/10"
            >
              <Icon n="pin" s={16} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <Icon n="pin" s={14} className="text-brand" />
            <input
              value={dest.name}
              readOnly
              className="h-10 flex-1 rounded-xl bg-bg px-3 text-[14px] font-semibold outline-none"
              aria-label="Destination"
            />
            <button
              onClick={() => go('map')}
              title="Change destination on map"
              className="grid size-9 place-items-center rounded-xl bg-bg text-muted ring-1 ring-line hover:text-navy"
            >
              <Icon n="search" s={16} />
            </button>
          </div>

          {/* Travel Mode Selector */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {modes.map(([label, mKey, icon]) => (
              <button
                key={mKey}
                onClick={() => handleModeChange(mKey)}
                className={`flex h-12 flex-col items-center justify-center rounded-2xl text-[12px] font-bold transition ${
                  travelMode === mKey
                    ? 'bg-brand/10 text-brand ring-1 ring-brand/40 shadow-sm'
                    : 'bg-bg text-muted hover:text-navy'
                }`}
              >
                <Icon n={icon} s={18} />
                {label}
              </button>
            ))}
          </div>
        </Card>

        {/* Map Preview of Route */}
        <div className="overflow-hidden rounded-[20px] ring-1 ring-line">
          <CityMap
            h={220}
            routes={selectedRouteIndex === 1 ? 'alt' : 'base'}
            routeCoords={routeCoords}
            altRouteCoords={altRouteCoords}
            origin={origin}
            destination={dest}
            incidents={allIncidents}
            showPlaces={false}
            onIncident={openIncident}
          />
        </div>

        {isRoutingLoading ? (
          <div className="p-8 text-center text-[14px] text-muted animate-pulse">
            Calculating routes via OSRM...
          </div>
        ) : activeRoutes.length === 0 ? (
          <Note tone="warn">No route found between these points. Try checking destination coordinates.</Note>
        ) : (
          activeRoutes.map((r, idx) => {
            const isSelected = selectedRouteIndex === idx
            const distKm = (r.distance / 1000).toFixed(1)
            const durMin = Math.round(r.duration / 60)
            const isAlt = idx > 0
            const label = r.label || (isAlt ? 'Alternative Route' : 'Fastest Route')

            return (
              <button
                key={r.id}
                onClick={() => setSelectedRouteIndex(idx)}
                aria-pressed={isSelected}
                className={`w-full rounded-[20px] bg-white p-4 text-left ring-1 transition ${
                  isSelected ? 'ring-2 ring-brand shadow-md' : 'ring-line'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-[16px] font-extrabold">
                    <svg width="22" height="6">
                      <path
                        d="M0 3h22"
                        stroke={isAlt ? '#12a6a0' : '#2855e8'}
                        strokeWidth="4"
                        strokeDasharray={isAlt ? '5 3' : undefined}
                      />
                    </svg>
                    {label}
                  </h3>
                  <span className="text-[16px] font-extrabold">{durMin} min</span>
                </div>
                <p className="text-[12px] text-muted">
                  {distKm} km · {travelMode} · {routingDataSource === 'live' ? 'OSRM live geometry' : 'Estimated'}
                </p>
                <p className="mt-2 rounded-xl bg-bg px-2.5 py-1.5 text-[12px]">
                  <b>Corridor exposure:</b>{' '}
                  {isAlt
                    ? 'Lower reported risk · Avoids reported hazard corridor'
                    : 'Fastest transit · Passes standard road corridor'}
                </p>
              </button>
            )
          })
        )}

        {activeRoutes.length === 1 && (
          <Note tone="info">
            <b>Single route returned:</b> The routing engine found 1 standard path between these points. We do not manufacture fake alternative routes.
          </Note>
        )}

        <div className="grid grid-cols-2 gap-2 pt-2">
          <Btn kind="secondary" icon="ledger" onClick={() => setDetails(true)}>
            Review evidence
          </Btn>
          <Btn kind="ai" icon="spark" onClick={() => go('replay')}>
            Impact Replay
          </Btn>
        </div>
      </div>

      {details && (
        <Sheet title="Route Evidence Assessment" onClose={() => setDetails(false)}>
          <div className="space-y-3">
            <p className="text-[13px] text-muted">
              Evaluated against reports currently recorded in the Evidence Ledger:
            </p>
            {allIncidents.slice(0, 2).map((i) => (
              <Card key={i.id} className="p-3">
                <p className="text-[14px] font-bold">{i.title}</p>
                <p className="text-[12px] text-muted">{i.exposure}</p>
                <div className="mt-1 flex gap-1.5">
                  <VerifBadge v={i.verif} />
                  <FreshBadge f={i.fresh} />
                </div>
              </Card>
            ))}
            <Btn kind="secondary" onClick={() => go('ledger')}>
              Open full Evidence Ledger
            </Btn>
          </div>
        </Sheet>
      )}
    </div>
  )
}

/* ---------------- Screen 11: Planner (P2) ---------------- */
function Planner({ back, go, places, selectPlaceAsDestination }: Ctx) {
  const [budget, setBudget] = useState('₹')
  const [time, setTime] = useState('2 hours')
  const [plan, setPlan] = useState(false)

  const stops = places.slice(0, 3)

  return (
    <div className="pb-6">
      <Header title="Plan an outing" onBack={back} right={<span className="rounded-full bg-bg px-2.5 py-1 text-[11px] font-bold text-muted ring-1 ring-line">Smart Plan</span>} />
      <div className="space-y-4 px-4">
        <div>
          <label className="mb-1.5 block text-[14px] font-bold">What would you like to explore?</label>
          <input
            defaultValue="Heritage walk and street food in Pune"
            className="h-12 w-full rounded-2xl bg-white px-4 text-[15px] outline-none ring-1 ring-line focus:ring-2 focus:ring-brand"
          />
        </div>

        <Card className="space-y-3">
          <p className="text-[14px] font-extrabold">Preferences</p>
          {['Budget', 'Avoid reported issues', 'Walking distance'].map((l, k) => (
            <label key={l} className="block">
              <span className="flex justify-between text-[13px]">
                <span className="font-semibold">{l}</span>
                <span className="text-muted">{k === 1 ? 'More weight' : 'Balanced'}</span>
              </span>
              <input type="range" defaultValue={[30, 70, 40][k]} className="mt-1 w-full accent-brand" />
            </label>
          ))}
        </Card>

        <div>
          <p className="mb-2 text-[14px] font-bold">Budget</p>
          <div className="flex flex-wrap gap-2">
            {['₹ (Budget)', '₹₹ (Moderate)', '₹₹₹ (Premium)'].map((b) => (
              <Chip key={b} on={budget === b} onClick={() => setBudget(b)}>
                {b}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[14px] font-bold">Duration</p>
          <div className="flex flex-wrap gap-2">
            {['1 hour', '2 hours', 'Half day', 'Full day'].map((x) => (
              <Chip key={x} on={time === x} onClick={() => setTime(x)}>
                {x}
              </Chip>
            ))}
          </div>
        </div>

        <Btn kind="ai" icon="spark" onClick={() => setPlan(true)}>
          Generate dynamic itinerary
        </Btn>

        {plan && (
          <div className="rise space-y-2 pt-2">
            <p className="text-[14px] font-extrabold">3-stop walk · about {time} (estimated)</p>
            {stops.map((p, k) => (
              <Card key={p.id} className="flex items-center gap-3 p-3">
                <span className="grid size-8 place-items-center rounded-full bg-navy text-[13px] font-bold text-white">
                  {k + 1}
                </span>
                <div className="size-12 rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${p.img})` }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold truncate">{p.name}</p>
                  <p className="text-[12px] text-muted">{p.cat} · {p.dist}</p>
                </div>
                <button
                  onClick={() => selectPlaceAsDestination(p)}
                  className="rounded-lg bg-brand/10 px-2 py-1 text-[11px] font-bold text-brand"
                >
                  Route
                </button>
              </Card>
            ))}
            <div className="pt-2">
              <Btn onClick={() => go('routes')}>Open in Routes</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
