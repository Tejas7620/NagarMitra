import { useEffect, useState, type ReactNode } from 'react'

/* ---------------- Types & demo data (all illustrative / simulated) ---------------- */
type Screen =
  | 'map' | 'explore' | 'compare' | 'report' | 'processing' | 'review' | 'submitted'
  | 'replay' | 'ledger' | 'incident' | 'routes' | 'planner'
type Verif = 'Unverified' | 'Corroborated' | 'Authority-confirmed' | 'Contested'
type Fresh = 'Recent' | 'Aging' | 'Stale' | 'Unknown'
type Source = 'Citizen submission' | 'Simulated demo data'
type Incident = {
  id: string; type: string; title: string; place: string; time: string; source: Source
  verif: Verif; fresh: Fresh; x: number; y: number; img?: string; nearRoute: boolean; desc: string
  exposure: string; duplicates: string[]; independent: string
}
type Scenario = 'changes' | 'noChange' | 'noIntersect' | 'fallback' | 'contested'

const IMG = {
  wada: 'https://images.unsplash.com/photo-1760034588108-987757454c18?auto=format&fit=crop&w=400&q=70', food: 'https://images.unsplash.com/photo-1738291422837-85761f82a10e?auto=format&fit=crop&w=400&q=70', museum: 'https://images.unsplash.com/photo-1631713215053-cc2df30dc6e9?auto=format&fit=crop&w=400&q=70',
  chai: 'https://images.unsplash.com/photo-1536514888772-a269c6a8a198?auto=format&fit=crop&w=400&q=70', flood: 'https://images.unsplash.com/photo-1661868678317-13067cfbb00d?auto=format&fit=crop&w=400&q=70', pothole: 'https://images.unsplash.com/photo-1658223684971-f262da87168f?auto=format&fit=crop&w=400&q=70',
}
const DEMO_INCIDENTS: Incident[] = [
  { id: 'D-104', type: 'Pothole', title: 'Pothole on Bajirao Road', place: 'Bajirao Rd, near Vishrambaug Wada', time: 'Today, 08:40', source: 'Simulated demo data', verif: 'Corroborated', fresh: 'Recent', x: 252, y: 196, img: IMG.pothole, nearRoute: true, desc: 'Demo incident: a large pothole partially blocking the left lane.', exposure: 'Lies 9 m from the baseline route centreline (measured on route geometry).', duplicates: ['D-108 (same block, 40 min apart)'], independent: 'Two demo reports from different simulated contributors.' },
  { id: 'D-211', type: 'Streetlight outage', title: 'Streetlight outage', place: 'Tilak Rd, Sadashiv Peth', time: 'Yesterday, 21:10', source: 'Simulated demo data', verif: 'Unverified', fresh: 'Aging', x: 120, y: 150, nearRoute: false, desc: 'Demo incident: three streetlights reported dark after 9 pm.', exposure: 'Lies 410 m from both candidate routes. Not counted as exposure.', duplicates: [], independent: 'Single source. Independence cannot be established.' },
  { id: 'D-317', type: 'Obstruction', title: 'Construction barricade', place: 'Laxmi Rd, Budhwar Peth', time: '4 days ago', source: 'Simulated demo data', verif: 'Contested', fresh: 'Stale', x: 300, y: 250, nearRoute: false, desc: 'Demo incident: one report says the barricade remains; a later report says it was removed.', exposure: 'Lies 120 m from the alternative route. Low relevance.', duplicates: ['D-322 (conflicting: "removed")'], independent: 'Two demo sources disagree.' },
  { id: 'D-405', type: 'Road closure', title: 'Scheduled road works', place: 'Kumthekar Rd, Sadashiv Peth', time: 'Today, 07:00', source: 'Simulated demo data', verif: 'Authority-confirmed', fresh: 'Recent', x: 150, y: 330, nearRoute: false, desc: 'Demo incident: a simulated municipal notice of lane closure for drainage work until 6 pm. Represents how an authority source would appear.', exposure: 'Lies 160 m from the baseline route. Not counted as exposure.', duplicates: [], independent: 'Simulated authority notice (demo stand-in for an official source).' },
]
const NEW_REPORT: Incident = { id: 'U-001', type: 'Waterlogging', title: 'Waterlogging near Mandai', place: 'Shivaji Rd, near Mandai', time: 'Just now', source: 'Citizen submission', verif: 'Unverified', fresh: 'Recent', x: 196, y: 262, img: IMG.flood, nearRoute: true, desc: 'Ankle-deep water across the road after rain; pedestrians walking on the divider.', exposure: 'Intersects 140 m of the baseline route (segment B–C, measured on route geometry).', duplicates: ['No likely duplicates found within 200 m / 6 h'], independent: 'Single new report. Awaiting supporting evidence.' }

const PLACES = [
  { id: 'p1', name: 'Shaniwar Wada', cat: 'Heritage', dist: '1.9 km', price: 'Entry fee: check on site', rating: null as string | null, access: 'Unknown', clean: 'No verified data', desc: '18th-century fortification and former Peshwa seat in Kasba Peth.', x: 236, y: 98, hue: 'from-amber/80 to-coral/70', img: IMG.wada },
  { id: 'p2', name: 'Peth Misal House', cat: 'Food', dist: '1.2 km', price: '₹ (demo)', rating: '4.3 · demo source', access: 'Not available', clean: 'No verified data', desc: 'Demo listing: local misal pav spot, used for illustration only.', x: 168, y: 210, hue: 'from-coral/70 to-violet/60', img: IMG.food },
  { id: 'p3', name: 'Kelkar Museum', cat: 'Heritage', dist: '2.4 km', price: 'Entry fee: check on site', rating: null, access: 'Unknown', clean: 'No verified data', desc: 'Museum of everyday Indian objects collected by Dinkar Kelkar.', x: 108, y: 238, hue: 'from-teal/80 to-brand/70', img: IMG.museum },
  { id: 'p4', name: 'Tulsi Baug Chai Stop', cat: 'Food', dist: '1.5 km', price: '₹ (demo)', rating: null, access: 'Unknown', clean: 'No verified data', desc: 'Demo listing: tea stall near the market lanes.', x: 286, y: 150, hue: 'from-violet/70 to-brand/70', img: IMG.chai },
]

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
}
function Icon({ n, s = 20, className = '' }: { n: string; s?: number; className?: string }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={P[n]} />
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
function Expand({ title, children, open: o = false }: { title: string; children: ReactNode; open?: boolean }) {
  const [open, setOpen] = useState(o)
  return (
    <div className="border-t border-line pt-2">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-11 w-full items-center justify-between text-left text-[14px] font-bold text-brand">
        {title}<Icon n="chev" s={18} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="rise pb-2 text-[14px] text-navy">{children}</div>}
    </div>
  )
}
function Row({ k, v }: { k: string; v: ReactNode }) {
  return <div className="flex justify-between gap-4 border-b border-line/70 py-2 text-[13px] last:border-0"><span className="text-muted">{k}</span><span className="text-right font-semibold">{v}</span></div>
}

/* ---------------- Map ---------------- */
const BASE = 'M70 360 L130 318 L196 262 L252 196 L236 98'
const ALT = 'M70 360 L96 270 L150 190 L196 140 L236 98'
function CityMap({ h = 360, routes = 'base', incidents = DEMO_INCIDENTS, showPlaces = true, highlight, onIncident, onPlace, selected, picker, placeCat }: {
  placeCat?: string; h?: number; routes?: 'none' | 'base' | 'both' | 'alt'; incidents?: Incident[]; showPlaces?: boolean; highlight?: string
  onIncident?: (i: Incident) => void; onPlace?: (id: string) => void; selected?: string; picker?: { x: number; y: number; confirmed: boolean }
}) {
  return (
    <svg viewBox="0 0 390 420" style={{ height: h }} className="w-full" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Map of central Pune demo area showing routes, places and reports">
      <rect width="390" height="420" fill="#eef2f7" />
      <path d="M-10 40 C80 70 140 20 220 50 S360 30 400 60 L400 0 L-10 0Z" fill="#cfe3f5" />
      <path d="M-10 52 C80 82 140 32 220 62 S360 42 400 72" stroke="#b7d4ee" strokeWidth="3" fill="none" />
      {[[20, 300, 70, 60], [280, 300, 90, 80], [40, 120, 50, 50], [300, 110, 70, 50]].map(([x, y, w, hh], i) => <rect key={i} x={x} y={y} width={w} height={hh} rx="10" fill="#dcefe2" />)}
      <g stroke="#fff" strokeLinecap="round">
        {['M0 180 L390 230', 'M0 300 L390 260', 'M90 80 L140 420', 'M300 70 L250 420', 'M0 380 L390 340', 'M180 80 L210 420'].map((d) => <path key={d} d={d} strokeWidth="10" />)}
        {['M0 130 L390 150', 'M40 420 L360 80', 'M0 250 L200 320'].map((d) => <path key={d} d={d} strokeWidth="5" />)}
      </g>
      {(routes === 'both' || routes === 'alt') && <>
        <path d={ALT} stroke="#fff" strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={ALT} stroke="#12a6a0" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={routes === 'both' ? '10 7' : undefined} className={routes === 'both' ? 'flow' : ''} />
      </>}
      {(routes === 'base' || routes === 'both') && <>
        <path d={BASE} stroke="#fff" strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={BASE} stroke="#2855e8" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={routes === 'both' ? 0.55 : 1} />
        {highlight && <path d="M168 286 L222 232" stroke="#e65362" strokeWidth="7" strokeLinecap="round" />}
      </>}
      {routes !== 'none' && <>
        <circle cx="70" cy="360" r="8" fill="#14213d" stroke="#fff" strokeWidth="3" />
        <text x="84" y="380" fontSize="11" fontWeight="700" fill="#14213d">Deccan</text>
      </>}
      {showPlaces && PLACES.filter((p) => !placeCat || p.cat === placeCat).map((p) => (
        <g key={p.id} onClick={() => onPlace?.(p.id)} className="cursor-pointer" role="button" aria-label={`Place: ${p.name}`}>
          <path d={`M${p.x} ${p.y} l-11 -15 a14 14 0 1 1 22 0z`} fill={selected === p.id ? '#14213d' : '#2855e8'} stroke="#fff" strokeWidth="2.5" />
          <circle cx={p.x} cy={p.y - 25} r="4.5" fill="#fff" />
          {(selected === p.id || p.id === 'p1') && <text x={p.x + 14} y={p.y - 22} fontSize="11" fontWeight="800" fill="#14213d" stroke="#fff" strokeWidth="3" paintOrder="stroke">{p.name}</text>}
        </g>
      ))}
      {incidents.map((i) => {
        const hot = highlight === i.id
        return (
          <g key={i.id} onClick={() => onIncident?.(i)} className="cursor-pointer" role="button" tabIndex={0} aria-label={`Report: ${i.title}. ${i.verif}. ${i.fresh}. ${i.source}`} opacity={i.fresh === 'Stale' ? 0.6 : 1}>
            {hot && <circle cx={i.x} cy={i.y} r="10" fill="#e65362" className="pulse" />}
            <circle cx={i.x} cy={i.y} r="20" fill="transparent" />
            <DiamondMark x={i.x} y={i.y} v={i.verif} sim={i.source === 'Simulated demo data'} />
          </g>
        )
      })}
      {picker && (
        <g>
          <ellipse cx={picker.x} cy={picker.y + 2} rx="8" ry="3" fill="#14213d" opacity=".25" />
          <path d={`M${picker.x} ${picker.y} l-13 -18 a16 16 0 1 1 26 0z`} fill={picker.confirmed ? '#1f9d68' : '#e65362'} stroke="#fff" strokeWidth="3" />
          <circle cx={picker.x} cy={picker.y - 29} r="5" fill="#fff" />
        </g>
      )}
      <text x="384" y="414" textAnchor="end" fontSize="9" fill="#65728a">Illustrative map · © OpenStreetMap contributors</text>
    </svg>
  )
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
  const rows: [ReactNode, string][] = [
    [<svg width="18" height="20" viewBox="0 0 24 28"><path d="M12 26 1 11a11 11 0 1 1 22 0z" fill="#2855e8" /><circle cx="12" cy="11" r="4" fill="#fff" /></svg>, 'Place (pin)'],
    [mk('Unverified'), 'Unverified report (hollow, !)'],
    [mk('Corroborated'), 'Corroborated (filled, ✓)'],
    [mk('Authority-confirmed'), 'Authority-confirmed (dark, ★)'],
    [mk('Contested'), 'Contested (violet, ?)'],
    [mk('Unverified', true), 'Simulated demo (dashed edge)'],
    [<svg width="24" height="8"><path d="M0 4h24" stroke="#2855e8" strokeWidth="4" /></svg>, 'Baseline route (solid)'],
    [<svg width="24" height="8"><path d="M0 4h24" stroke="#12a6a0" strokeWidth="4" strokeDasharray="6 4" /></svg>, 'Alternative route (dashed)'],
  ]
  return (
    <div className="rise absolute right-16 top-3 z-20 w-64 rounded-2xl bg-white p-3 text-[13px] shadow-xl ring-1 ring-line" role="dialog" aria-label="Map legend">
      <div className="mb-1 flex items-center justify-between font-bold">Map legend<button onClick={onClose} aria-label="Close legend" className="grid size-9 place-items-center rounded-full bg-bg"><Icon n="x" s={16} /></button></div>
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">Verification</p>
      {rows.map(([i, l], k) => <div key={k} className="flex items-center gap-2 py-0.5"><span className="grid w-6 place-items-center">{i}</span>{l}</div>)}
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

/* ================= App ================= */
export default function App() {
  const [screen, setScreen] = useState<Screen>('map')
  const [history, setHistory] = useState<Screen[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [incident, setIncident] = useState<Incident>(DEMO_INCIDENTS[0])
  const [scenario, setScenario] = useState<Scenario>('changes')
  const [toast, setToast] = useState<string | null>(null)
  const [compareSel, setCompareSel] = useState<string[]>(['p1', 'p3'])
  const [dest, setDest] = useState('p1')
  // report draft persists across failures
  const [draft, setDraft] = useState({ desc: '', type: '', time: 'Just now', photo: false, voice: false, confirmed: false, pin: { x: 196, y: 262 } })

  const go = (s: Screen) => { setHistory((h) => [...h, screen]); setScreen(s) }
  const back = () => { setHistory((h) => { const p = h[h.length - 1] ?? 'map'; setScreen(p); return h.slice(0, -1) }) }
  const tab = (s: Screen) => { setHistory([]); setScreen(s) }
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2400) }
  const allIncidents = submitted ? [NEW_REPORT, ...DEMO_INCIDENTS] : DEMO_INCIDENTS
  const openIncident = (i: Incident) => { setIncident(i); go('incident') }
  const ctx = { go, back, tab, flash, submitted, setSubmitted, incident, openIncident, scenario, setScenario, allIncidents, compareSel, setCompareSel, dest, setDest, draft, setDraft }

  const showNav = ['map', 'explore', 'routes', 'ledger', 'replay', 'incident', 'compare', 'planner', 'submitted'].includes(screen)
  const navActive: Screen = (['replay', 'incident'].includes(screen) ? 'ledger' : screen === 'compare' || screen === 'planner' ? 'explore' : screen === 'submitted' ? 'report' : screen) as Screen

  return (
    <div className="flex min-h-screen items-center justify-center gap-10 p-0 sm:p-6">
      <aside className="hidden max-w-xs lg:block">
        <Logo big />
        <p className="mt-4 text-[15px] text-muted">Explore. Report. Decide with evidence.</p>
        <div className="mt-6 space-y-4">
          {[['explore', 'Explore Places', 'Food, heritage, stays & more', 'from-[#f7a23b] to-[#ec4f73]'], ['route', 'Evidence-aware Routes', 'Lower reported risk routes, with evidence', 'from-teal to-ok'], ['plus', 'Report & Contribute', 'Text, photo or voice note', 'from-[#2fb3e6] to-teal'], ['spark', 'Impact Replay', 'See how new reports change plans', 'from-violet to-[#c25ec9]'], ['ledger', 'Evidence Ledger', 'Transparent sources and status', 'from-brand to-[#2fb3e6]']].map(([i, t, d, g]) => (
            <div key={t} className="flex items-center gap-3"><span className={`grid size-11 place-items-center rounded-full bg-gradient-to-br ${g} text-white shadow`}><Icon n={i} /></span><div><p className="text-[15px] font-extrabold">{t}</p><p className="text-[13px] text-muted">{d}</p></div></div>
          ))}
        </div>
        <div className="mt-6 space-y-2 text-[13px]">
          <p className="font-bold text-navy">Prototype shortcuts</p>
          {([['Main journey: start a report', 'report'], ['Impact Replay', 'replay'], ['Evidence Ledger', 'ledger'], ['Route comparison', 'routes'], ['Place comparison', 'compare'], ['Outing planner (P2)', 'planner']] as [string, Screen][]).map(([l, s]) => (
            <button key={s} onClick={() => tab(s)} className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-2.5 text-left font-semibold ring-1 ring-line hover:ring-brand">{l}<Icon n="back" s={14} className="rotate-180" /></button>
          ))}
          <p className="pt-3 text-muted">All places, ratings and incidents shown are illustrative demo content for central Pune.</p>
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
type Ctx = {
  go: (s: Screen) => void; back: () => void; tab: (s: Screen) => void; flash: (m: string) => void
  submitted: boolean; setSubmitted: (b: boolean) => void; incident: Incident; openIncident: (i: Incident) => void
  scenario: Scenario; setScenario: (s: Scenario) => void; allIncidents: Incident[]
  compareSel: string[]; setCompareSel: (s: string[]) => void; dest: string; setDest: (s: string) => void
  draft: { desc: string; type: string; time: string; photo: boolean; voice: boolean; confirmed: boolean; pin: { x: number; y: number } }
  setDraft: (d: Ctx['draft']) => void
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
function MapScreen({ go, openIncident, allIncidents, dest, setDest, flash, setScenario }: Ctx) {
  const [cat, setCat] = useState('All')
  const [legend, setLegend] = useState(false)
  const [help, setHelp] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [sel, setSel] = useState<Incident | null>(null)
  const place = PLACES.find((p) => p.id === dest)!
  const shown = cat === 'All' || cat === 'Reports' ? allIncidents : []
  const affecting = allIncidents.filter((i) => i.nearRoute)
  const sim = sel?.source === 'Simulated demo data'
  return (
    <div className="relative">
      <div className="space-y-3 px-4 pt-2">
        <div className="flex items-center justify-between gap-2">
          <Logo />
          <button className="flex h-11 min-w-0 items-center gap-1 rounded-full bg-white px-3 text-[13px] font-bold ring-1 ring-line" onClick={() => flash('Pune is the only city in this demo')} aria-label="City: Pune, Maharashtra"><Icon n="pin" s={14} className="shrink-0 text-brand" /><span className="truncate">Pune</span><Icon n="chev" s={14} className="shrink-0" /></button>
        </div>
        <button onClick={() => go('explore')} className="flex h-12 w-full items-center gap-2 rounded-2xl bg-white px-4 text-left text-[15px] text-muted ring-1 ring-line">
          <Icon n="search" />Search places, areas, or reports
        </button>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {['All', 'Food', 'Heritage', 'Stays', 'Activities', 'Reports'].map((c) => <Chip key={c} on={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}
        </div>
      </div>
      <div className="relative mt-3 overflow-hidden">
        <div className="absolute left-3 top-3 z-10 flex max-w-[60%] flex-col items-start gap-1.5">
          <span className="rounded-full bg-navy px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-white shadow">DEMO DATA: Simulated incidents</span>
          <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold shadow ring-1 ring-line">Central Pune demo area</span>
        </div>
        <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
          {[
            ['layers', 'Map legend and layers', () => setLegend(!legend)],
            ['pin', 'My location', () => { setZoom(1); flash('Location permission unavailable in demo. Using Deccan Gymkhana.') }],
            ['explore', 'Recenter map', () => setZoom(1)],
          ].map(([i, l, f]) => <button key={l as string} onClick={f as () => void} aria-label={l as string} className="grid size-11 place-items-center rounded-full bg-white shadow ring-1 ring-line"><Icon n={i as string} /></button>)}
          <div className="flex flex-col overflow-hidden rounded-full bg-white shadow ring-1 ring-line">
            <button onClick={() => setZoom(Math.min(1.8, zoom + 0.2))} aria-label="Zoom in" className="grid size-11 place-items-center text-[20px] font-bold">+</button>
            <span className="mx-2 h-px bg-line" />
            <button onClick={() => setZoom(Math.max(1, zoom - 0.2))} aria-label="Zoom out" disabled={zoom <= 1} className="grid size-11 place-items-center text-[20px] font-bold disabled:text-slate-300">−</button>
          </div>
        </div>
        {legend && <Legend onClose={() => setLegend(false)} />}
        <div style={{ transform: `scale(${zoom})`, transformOrigin: '60% 55%' }} className="transition-transform">
          <CityMap h={400} incidents={shown} showPlaces={cat !== 'Reports'} placeCat={['Food', 'Heritage', 'Stays', 'Activities'].includes(cat) ? cat : undefined} selected={dest} onIncident={(i) => setSel(i)} onPlace={(id) => { setDest(id); setSel(null) }} />
        </div>
        <div className="absolute bottom-6 left-3 z-10">
          {help ? (
            <div className="rise flex max-w-[250px] items-start gap-2 rounded-2xl bg-white/95 p-2.5 pr-1 text-[12px] leading-snug shadow ring-1 ring-line">
              <Icon n="spark" s={16} className="mt-0.5 shrink-0 text-violet" />
              <span>Tap a pin or report. Report what you see to check its route impact.</span>
              <button onClick={() => setHelp(false)} aria-label="Collapse tip" className="grid size-8 shrink-0 place-items-center"><Icon n="x" s={14} /></button>
            </div>
          ) : (
            <button onClick={() => setHelp(true)} aria-label="Show tip" className="grid size-11 place-items-center rounded-full bg-white shadow ring-1 ring-line text-violet"><Icon n="info" /></button>
          )}
        </div>
      </div>
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
            <section aria-label="Baseline route" className="rounded-[20px] ring-1 ring-line">
              <div className="flex items-center gap-3 p-3">
                <img src={place.img} alt="" className="size-14 shrink-0 rounded-2xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-extrabold tracking-wider text-brand">BASELINE ROUTE · WALKING</p>
                  <h3 className="truncate text-[17px] font-extrabold">Deccan → {place.name}</h3>
                </div>
              </div>
              <div className="grid grid-cols-3 border-t border-line text-center">
                <div className="p-2.5"><p className="text-[17px] font-extrabold">27 min</p><p className="text-[11px] text-muted">Estimated time</p></div>
                <div className="border-x border-line p-2.5"><p className="text-[17px] font-extrabold">2.1 km</p><p className="text-[11px] text-muted">Distance</p></div>
                <div className="p-2.5"><p className="text-[13px] font-extrabold leading-tight text-[#8a5a0c]">Cached demo route</p><p className="text-[11px] text-muted">Not live data</p></div>
              </div>
            </section>
            <Btn icon="route" onClick={() => go('routes')}>Compare Routes</Btn>
            {affecting.length > 0 && (
              <button onClick={() => { setScenario('changes'); go('replay') }} className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-brand/10 to-violet/10 px-3 text-left ring-1 ring-violet/25">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-violet text-white"><Icon n="spark" s={18} /></span>
                <span className="flex-1"><span className="block text-[14px] font-extrabold">Open Impact Replay</span><span className="block text-[12px] text-muted">{affecting.length} report{affecting.length > 1 ? 's' : ''} could affect this route</span></span>
                <Icon n="back" s={16} className="rotate-180 text-muted" />
              </button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Btn kind="secondary" icon="alert" onClick={() => go('report')}>Report issue</Btn>
              <Btn kind="secondary" icon="spark" onClick={() => go('planner')}>Plan outing</Btn>
            </div>
            <div className="flex items-center justify-between pt-1"><p className="text-[15px] font-extrabold">Smart suggestions for you</p><button onClick={() => go('explore')} className="min-h-11 text-[13px] font-bold text-brand">See all</button></div>
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {[[IMG.wada, 'Heritage walk in Pune', '3 stops · ~2.1 km · Walking'], [IMG.food, 'Local food trail', '2 stops · ~1.8 km · Walking'], [IMG.museum, 'Museum afternoon', '2 stops · ~2.4 km · Walking']].map(([img, t, d]) => (
                <button key={t} onClick={() => go('planner')} className="flex w-60 shrink-0 gap-3 rounded-2xl bg-white p-2 text-left ring-1 ring-line">
                  <img src={img} alt="" className="size-16 rounded-xl object-cover" />
                  <span className="min-w-0"><span className="block truncate text-[14px] font-bold">{t}</span><span className="block text-[12px] text-muted">{d}</span><span className="block text-[11px] text-muted">Rating: Not available · demo</span></span>
                </button>))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------------- Screen 2: Explore ---------------- */
function Explore({ go, compareSel, setCompareSel, setDest, flash }: Ctx) {
  const [cat, setCat] = useState('All')
  const [q, setQ] = useState('')
  const [view, setView] = useState<'list' | 'map'>('list')
  const [filter, setFilter] = useState(false)
  const list = PLACES.filter((p) => (cat === 'All' || p.cat === cat) && (p.name + p.cat + p.desc).toLowerCase().includes(q.toLowerCase()))
  const toggle = (id: string) => setCompareSel(compareSel.includes(id) ? compareSel.filter((x) => x !== id) : [...compareSel, id].slice(-3))
  return (
    <div className="relative min-h-full">
      <Header title="Explore places" sub="Curated central Pune · demo listings" right={
        <div className="flex rounded-full bg-white p-1 ring-1 ring-line">
          {(['list', 'map'] as const).map((v) => <button key={v} onClick={() => setView(v)} className={`h-9 rounded-full px-3 text-[13px] font-bold capitalize ${view === v ? 'bg-navy text-white' : 'text-muted'}`}>{v}</button>)}
        </div>} />
      <div className="space-y-3 px-4">
        <div className="flex gap-2">
          <label className="flex h-12 flex-1 items-center gap-2 rounded-2xl bg-white px-4 ring-1 ring-line"><Icon n="search" className="text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search places" className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted" placeholder="Search places" /></label>
          <button onClick={() => setFilter(true)} className="h-12 rounded-2xl bg-white px-4 text-[14px] font-bold ring-1 ring-line">Filter</button>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">{['All', 'Food', 'Heritage', 'Stays', 'Activities'].map((c) => <Chip key={c} on={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}</div>
        {view === 'map' ? <div className="overflow-hidden rounded-[20px] ring-1 ring-line"><CityMap h={420} routes="none" incidents={[]} onPlace={(id) => { setDest(id); flash('Destination set on map') }} /></div> : list.length === 0 ? (
          <Card className="py-10 text-center"><p className="font-bold">No places match</p><p className="text-[13px] text-muted">The demo area currently covers Food and Heritage.</p></Card>
        ) : list.map((p) => (
          <Card key={p.id} className="flex gap-3 p-3">
            <div className={`relative size-24 shrink-0 rounded-2xl bg-cover bg-center`} style={{ backgroundImage: `url(${p.img})` }}><span className="absolute bottom-1.5 left-1.5 rounded-md bg-white/90 px-1.5 text-[10px] font-bold">{p.cat}</span></div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[16px] font-extrabold">{p.name}</h3>
              <p className="text-[12px] text-muted">{p.dist} · {p.price}</p>
              <p className="mt-1 line-clamp-2 text-[13px]">{p.desc}</p>
              <p className="mt-1 text-[12px]"><span className="text-muted">Rating: </span><b>{p.rating ?? 'Not available'}</b> <span className="text-muted">· Access: </span><b>{p.access}</b></p>
              <div className="mt-2 flex gap-2">
                <button onClick={() => toggle(p.id)} aria-pressed={compareSel.includes(p.id)} className={`h-9 rounded-xl px-3 text-[13px] font-bold ring-1 ${compareSel.includes(p.id) ? 'bg-brand/10 text-brand ring-brand/40' : 'ring-line'}`}>{compareSel.includes(p.id) ? '✓ Comparing' : 'Compare'}</button>
                <button onClick={() => { setDest(p.id); go('routes') }} className="h-9 rounded-xl px-3 text-[13px] font-bold text-brand">Route here</button>
              </div>
            </div>
          </Card>
        ))}
        <p className="pb-2 text-center text-[12px] text-muted">Listings and any ratings are mock demo content.</p>
      </div>
      {compareSel.length >= 2 && view === 'list' && (
        <div className="sticky bottom-3 z-10 px-4"><Btn kind="primary" onClick={() => go('compare')}>Compare {compareSel.length} places</Btn></div>
      )}
      {filter && (
        <Sheet title="Filter places" onClose={() => setFilter(false)}>
          {[['Distance', ['< 1 km', '< 2 km', 'Any']], ['Price band', ['₹', '₹₹', 'Any']], ['Ratings', ['With rating only', 'Any']], ['Accessibility info', ['Known only', 'Any']]].map(([t, opts]) => (
            <div key={t as string} className="mb-4"><p className="mb-2 text-[14px] font-bold">{t}</p><ChipGroup opts={opts as string[]} /></div>
          ))}
          <Note>Most demo places have no verified accessibility data yet; filtering by it shows fewer results.</Note>
          <div className="mt-4"><Btn onClick={() => setFilter(false)}>Show results</Btn></div>
        </Sheet>
      )}
    </div>
  )
}

/* ---------------- Screen 10: Compare ---------------- */
function Compare({ back, compareSel, setDest, go }: Ctx) {
  const [pref, setPref] = useState('Low budget')
  const sel = PLACES.filter((p) => compareSel.includes(p.id))
  const reports: Record<string, string> = { p1: '1 demo report within 300 m', p2: '1 new unverified report nearby', p3: 'None in available data', p4: '1 contested, stale demo report' }
  const crit: [string, (p: (typeof PLACES)[0]) => string, string, boolean][] = [
    ['Price band', (p) => p.price, 'Demo listing', true],
    ['Rating', (p) => p.rating ?? 'Not available', 'Demo source', false],
    ['Cleanliness', (p) => p.clean, 'No source', false],
    ['Accessibility', (p) => p.access, 'No source', false],
    ['Distance', (p) => p.dist, 'Estimated from demo route', true],
    ['Nearby reports', (p) => reports[p.id], 'Evidence Ledger', true],
  ]
  return (
    <div>
      <Header title="Compare places" onBack={back} sub={`${sel.length} selected`} />
      <div className="space-y-3 px-4">
        <div><p className="mb-2 text-[13px] font-bold text-muted">Your preference</p><div className="flex gap-2">{['Low budget', 'Shortest walk', 'Fewer reports'].map((p) => <Chip key={p} on={pref === p} onClick={() => setPref(p)}>{p}</Chip>)}</div></div>
        <div className="space-y-2">
          {crit.map(([k, f, src, used]) => (
            <Card key={k} className="p-3">
              <div className="mb-1 flex items-center justify-between gap-2"><p className="text-[14px] font-extrabold">{k}</p>{used ? <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-brand">Used in match</span> : <span className="text-[11px] font-semibold text-muted">Not scored</span>}</div>
              <p className="mb-1 text-[11px] text-muted">Source: {src}</p>
              {sel.map((p) => { const v = f(p); const unk = /Unknown|Not available|No verified/.test(v); return <Row key={p.id} k={p.name} v={<span className={unk ? 'font-normal italic text-muted' : ''}>{v}</span>} /> })}
            </Card>))}
        </div>
        <Card className="bg-gradient-to-br from-brand/5 to-violet/5">
          <p className="text-[12px] font-bold uppercase tracking-wide text-brand">Best match for your selected preferences</p>
          <h3 className="text-[18px] font-extrabold">{sel[pref === 'Fewer reports' ? sel.length - 1 : 0]?.name}</h3>
          <p className="text-[13px] text-muted">Based only on {pref.toLowerCase()} using available criteria. Missing ratings, cleanliness and accessibility were not scored. Fewer reports does not mean an area is safe.</p>
        </Card>
        <div className="grid grid-cols-2 gap-2 pb-4">
          <Btn kind="secondary" icon="map" onClick={() => go('map')}>View on map</Btn>
          <Btn onClick={() => { setDest(sel[0]?.id ?? 'p1'); go('routes') }}>Route to it</Btn>
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
  const [upload, setUpload] = useState<'idle' | 'progress' | 'done' | 'fail'>(draft.photo ? 'done' : 'idle')
  const [rec, setRec] = useState<'idle' | 'rec' | 'done'>(draft.voice ? 'done' : 'idle')
  const err = touched && draft.desc.trim().length < 10
  const canSubmit = draft.desc.trim().length >= 10 && draft.confirmed
  const set = (p: Partial<Ctx['draft']>) => setDraft({ ...draft, ...p })
  const startUpload = (fail = false) => { setUpload('progress'); setTimeout(() => { setUpload(fail ? 'fail' : 'done'); if (!fail) set({ photo: true }) }, 1200) }
  return (
    <div className="relative min-h-full">
      <Header title="Report an issue" onBack={() => (draft.desc ? setAbandon(true) : back())} sub="Share what you observed. New reports start unverified." />
      <div className="space-y-4 px-4">
        <div className="grid grid-cols-3 rounded-2xl bg-white p-1 ring-1 ring-line" role="tablist">
          {(['Text', 'Photo', 'Voice'] as const).map((m) => (
            <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`flex h-11 items-center justify-center gap-1.5 rounded-xl text-[14px] font-bold ${mode === m ? 'bg-navy text-white' : 'text-muted'}`}>
              <Icon n={m === 'Text' ? 'text' : m === 'Photo' ? 'camera' : 'mic'} s={16} />{m}{m !== 'Text' && <span className="text-[10px] font-semibold opacity-70">opt.</span>}
            </button>
          ))}
        </div>
        <div>
          <label htmlFor="desc" className="mb-1.5 flex justify-between text-[14px] font-bold">What did you observe? <span className="text-coral">Required</span></label>
          <textarea id="desc" value={draft.desc} onBlur={() => setTouched(true)} onChange={(e) => set({ desc: e.target.value })} rows={4} placeholder="Describe what you observed…" aria-invalid={err} className={`w-full rounded-2xl bg-white p-3.5 text-[15px] outline-none ring-1 focus:ring-2 ${err ? 'ring-coral focus:ring-coral' : 'ring-line focus:ring-brand'}`} />
          <div className="mt-1 flex justify-between text-[12px]">
            {err ? <span className="font-semibold text-coral">Add at least 10 characters so others can understand the issue.</span> : <span className="text-muted">e.g. "Water across Shivaji Rd near Mandai after rain"</span>}
            <button className="font-bold text-brand" onClick={() => set({ desc: 'Ankle-deep water across Shivaji Road near Mandai after the rain. People are walking on the divider.' })}>Use demo text</button>
          </div>
        </div>
        {mode === 'Photo' && (
          <Card className="rise">
            <p className="mb-2 text-[14px] font-bold">Photo <span className="font-normal text-muted">(optional)</span></p>
            {upload === 'idle' && <div className="grid gap-2"><button onClick={() => startUpload()} className="grid h-28 place-items-center rounded-2xl border-2 border-dashed border-line text-[14px] font-bold text-brand"><span className="flex items-center gap-2"><Icon n="camera" />Add a photo</span></button><button onClick={() => startUpload(true)} className="text-[12px] text-muted underline">Preview failed-upload state</button></div>}
            {upload === 'progress' && <div className="space-y-2"><div className="h-28 animate-pulse rounded-2xl bg-bg" /><div className="h-2 overflow-hidden rounded-full bg-bg"><div className="h-full w-2/3 rounded-full bg-brand transition-all" /></div><p className="text-[12px] text-muted">Uploading… 64%</p></div>}
            {upload === 'done' && <div className="relative"><img src={IMG.flood} alt="Your photo: flooded street" className="h-44 w-full rounded-2xl object-cover" /><span className="absolute left-2 top-2 rounded-lg bg-white/90 px-2 py-0.5 text-[11px] font-bold">photo_0412.jpg</span><div className="mt-2 flex gap-2"><Btn kind="secondary" full={false} onClick={() => startUpload()}>Replace</Btn><Btn kind="ghost" full={false} onClick={() => { setUpload('idle'); set({ photo: false }) }}>Remove</Btn></div></div>}
            {upload === 'fail' && <div className="space-y-2"><Note tone="warn">Upload failed. Your text is saved. You can retry or submit without a photo.</Note><Btn kind="secondary" onClick={() => startUpload()}>Retry upload</Btn></div>}
          </Card>
        )}
        {mode === 'Voice' && (
          <Card className="rise">
            <p className="mb-2 text-[14px] font-bold">Voice note <span className="font-normal text-muted">(optional, not required to submit)</span></p>
            <div className="flex items-center gap-3">
              <button onClick={() => { if (rec === 'rec') { setRec('done'); set({ voice: true }) } else setRec('rec') }} aria-label={rec === 'rec' ? 'Stop recording' : 'Start recording'} className={`grid size-14 place-items-center rounded-full text-white ${rec === 'rec' ? 'animate-pulse bg-coral' : 'bg-navy'}`}><Icon n={rec === 'rec' ? 'x' : 'mic'} /></button>
              <div className="flex-1">
                <div className="flex h-8 items-end gap-0.5">{Array.from({ length: 28 }).map((_, i) => <span key={i} className={`w-1 rounded-full ${rec === 'idle' ? 'bg-line' : 'bg-brand'}`} style={{ height: `${20 + ((i * 37) % 80)}%` }} />)}</div>
                <p className="text-[12px] text-muted">{rec === 'idle' ? 'Tap to record' : rec === 'rec' ? 'Recording… 0:07' : '0:12 · Tap play to review'}</p>
              </div>
              {rec === 'done' && <button className="h-10 rounded-xl px-3 text-[13px] font-bold ring-1 ring-line">Play</button>}
            </div>
          </Card>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div><label className="mb-1.5 block text-[14px] font-bold">Type <span className="font-normal text-muted">(opt.)</span></label>
            <select value={draft.type} onChange={(e) => set({ type: e.target.value })} className="h-12 w-full rounded-2xl bg-white px-3 text-[14px] ring-1 ring-line">
              <option value="">Let AI suggest</option>{['Waterlogging', 'Pothole', 'Obstruction', 'Streetlight outage', 'Other'].map((t) => <option key={t}>{t}</option>)}
            </select></div>
          <div><label className="mb-1.5 block text-[14px] font-bold">Observed</label>
            <select value={draft.time} onChange={(e) => set({ time: e.target.value })} className="h-12 w-full rounded-2xl bg-white px-3 text-[14px] ring-1 ring-line">
              {['Just now', 'Within 1 hour', 'Earlier today', 'Unknown'].map((t) => <option key={t}>{t}</option>)}
            </select></div>
        </div>
        <Card className="p-0 overflow-hidden">
          <div className="relative"><CityMap h={140} routes="none" incidents={[]} showPlaces={false} picker={{ ...draft.pin, confirmed: draft.confirmed }} /></div>
          <div className="space-y-2 p-3">
            <div className="flex items-start justify-between gap-2">
              <div><p className="text-[14px] font-bold">Shivaji Rd, near Mandai</p><p className="text-[12px] text-muted">18.5129° N, 73.8562° E · from device location</p></div>
              {draft.confirmed ? <Pill cls="bg-ok/10 text-ok ring-ok/30" icon="check">Confirmed</Pill> : <Pill cls="bg-amber/15 text-[#8a5a0c] ring-amber/40" icon="alert">Not confirmed</Pill>}
            </div>
            <Btn kind="secondary" icon="pin" onClick={() => setLocSheet(true)}>{draft.confirmed ? 'Adjust location' : 'Confirm location'}</Btn>
          </div>
        </Card>
        <p className="text-center text-[12px] text-muted">AI helps organize your report; it does not verify whether an incident is true.</p>
      </div>
      <div className="sticky bottom-0 z-20 mt-4 border-t border-line bg-white/95 p-4 pb-[max(24px,env(safe-area-inset-bottom))] backdrop-blur">
        {!canSubmit && <p className="mb-2 text-center text-[12px] font-semibold text-muted">{draft.desc.trim().length < 10 ? 'Add a description' : ''}{draft.desc.trim().length < 10 && !draft.confirmed ? ' and ' : ''}{!draft.confirmed ? 'confirm the location' : ''} to submit</p>}
        <Btn kind="ai" icon="spark" disabled={!canSubmit} onClick={() => go('processing')}>Submit report</Btn>
      </div>
      {locSheet && (
        <Sheet title="Confirm report location" onClose={() => setLocSheet(false)}>
          <p className="mb-2 text-[13px] text-muted">Tap the map to move the pin to where you saw the issue.</p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-line" onClick={(e) => { const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect(); set({ pin: { x: Math.round(((e.clientX - r.left) / r.width) * 390), y: Math.round(((e.clientY - r.top) / r.height) * 420) + 14 }, confirmed: false }) }}>
            <CityMap h={260} routes="none" incidents={[]} showPlaces={false} picker={{ ...draft.pin, confirmed: false }} />
          </div>
          <div className="mt-3 rounded-2xl bg-bg p-3 text-[13px]"><b>Shivaji Rd, near Mandai</b><div className="text-muted">Pin at {draft.pin.x}, {draft.pin.y} on the demo map · accuracy about 15 m</div></div>
          <div className="mt-4"><Btn icon="check" onClick={() => { set({ confirmed: true }); setLocSheet(false) }}>Confirm location</Btn></div>
        </Sheet>
      )}
      {abandon && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy/40 p-6">
          <div className="rise w-full rounded-3xl bg-white p-5" role="alertdialog">
            <h2 className="text-[18px] font-extrabold">Leave this report?</h2>
            <p className="mt-1 text-[14px] text-muted">Your draft stays saved on this device until you submit or discard it.</p>
            <div className="mt-4 grid gap-2"><Btn onClick={() => setAbandon(false)}>Keep editing</Btn><Btn kind="secondary" onClick={back}>Leave, keep draft</Btn><Btn kind="ghost" onClick={() => { setDraft({ desc: '', type: '', time: 'Just now', photo: false, voice: false, confirmed: false, pin: { x: 196, y: 262 } }); back() }}>Discard draft</Btn></div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------------- Screen 4: Processing + Review ---------------- */
function Processing({ go, back }: Ctx) {
  const stages = ['Reading report content', 'Extracting incident details', 'Checking the provided location', 'Checking for possible duplicates']
  const [step, setStep] = useState(0)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (failed || step >= stages.length) return
    const t = setTimeout(() => setStep(step + 1), 700)
    return () => clearTimeout(t)
  }, [step, failed])
  const done = step >= stages.length
  return (
    <div className="flex min-h-full flex-col">
      <Header title="Organizing your report" onBack={back} />
      <div className="flex-1 space-y-4 px-4">
        <p className="text-center text-[17px] font-extrabold text-brand">{done ? 'Your report is organized' : 'AI is organizing your report'}</p>
        <div className="relative mx-auto grid size-36 place-items-center">
          <span className={`absolute inset-0 rounded-full border-4 border-dotted border-brand/40 ${done ? '' : 'animate-spin'}`} style={{ animationDuration: '6s' }} />
          <span className="absolute inset-3 rounded-full bg-gradient-to-br from-brand/10 to-violet/20 blur-sm" />
          <span className="relative grid size-20 place-items-center rounded-full bg-white text-[30px] font-extrabold shadow-[0_8px_30px_-6px_rgba(40,85,232,.5)]"><span className="bg-gradient-to-br from-brand to-violet bg-clip-text text-transparent">{done ? <Icon n="check" s={34} className="text-ok" /> : 'AI'}</span></span>
        </div>
        {failed ? (
          <div className="rise space-y-3">
            <Note tone="warn"><b>AI is unavailable right now.</b> Your report is saved. We can submit it as written with default fields (type: "Other", time as you entered). You can edit them first.</Note>
            <Btn onClick={() => go('review')}>Continue with default fields</Btn>
            <Btn kind="secondary" onClick={() => { setFailed(false); setStep(0) }}>Try AI again</Btn>
          </div>
        ) : (
          <Card>
            <ol className="space-y-3">{stages.map((s, i) => (
              <li key={s} className="flex items-center gap-3 text-[15px]">
                <span className={`grid size-7 place-items-center rounded-full ${i < step ? 'bg-ok text-white' : i === step ? 'bg-brand/10 text-brand' : 'bg-bg text-muted'}`}>{i < step ? <Icon n="check" s={14} /> : i === step ? <span className="size-2.5 animate-ping rounded-full bg-brand" /> : i + 1}</span>
                <span className={`flex-1 ${i <= step ? 'font-semibold' : 'text-muted'}`}>{s}</span>
                <span className={`text-[12px] font-bold ${i < step ? 'text-ok' : 'text-muted'}`}>{i < step ? 'Done' : i === step ? 'Processing…' : ''}</span>
              </li>))}</ol>
          </Card>
        )}
        <div className="flex items-center gap-3 rounded-2xl bg-brand/5 p-3.5 ring-1 ring-brand/15"><span className="grid size-10 place-items-center rounded-full bg-white text-coral shadow">♥</span><div className="text-[13px]"><b>Thank you!</b><br /><span className="text-muted">This organizes your words into fields. It does not check whether the incident is true.</span></div></div>
      </div>
      {!failed && <div className="space-y-2 p-4 pb-8"><Btn disabled={!done} onClick={() => go('review')}>Review extracted details</Btn><button onClick={() => setFailed(true)} className="w-full text-[12px] text-muted underline">Preview AI-unavailable state</button></div>}
    </div>
  )
}

function Review({ back, go, setSubmitted, draft }: Ctx) {
  const [err, setErr] = useState(false)
  const [busy, setBusy] = useState(false)
  const submit = (fail = false) => { setBusy(true); setTimeout(() => { setBusy(false); if (fail) setErr(true); else { setSubmitted(true); go('submitted') } }, 900) }
  return (
    <div className="min-h-full pb-6">
      <Header title="Review details" onBack={back} sub="Check what AI extracted. Edit anything that is wrong." />
      <div className="space-y-3 px-4">
        {err && <Note tone="warn"><b>We could not reach the server.</b> Nothing was lost. Your report is still here. <button className="font-bold underline" onClick={() => { setErr(false); submit() }}>Retry</button></Note>}
        <Card className="space-y-1">
          <Row k="Potential type" v={<span className="flex items-center gap-1">{draft.type || 'Waterlogging'}<span className="text-[11px] font-normal text-muted">(AI suggestion)</span></span>} />
          <Row k="Summary" v={<span className="block max-w-[200px]">Water across Shivaji Rd; pedestrians using the divider</span>} />
          <Row k="Observed" v={draft.time === 'Unknown' ? 'Unknown' : 'Today, just now'} />
          <Row k="Location phrase" v='"near Mandai"' />
          <Row k="Status" v={<VerifBadge v="Unverified" />} />
        </Card>
        <Note tone="warn">Location phrase "near Mandai" covers a wide area. Your confirmed pin will be used instead.</Note>
        <div className="overflow-hidden rounded-[20px] ring-1 ring-line"><CityMap h={150} routes="none" incidents={[]} showPlaces={false} picker={{ ...draft.pin, confirmed: true }} /></div>
        <Card className="bg-slate-50"><p className="text-[14px] font-bold">Unverified — awaiting supporting evidence</p><p className="text-[13px] text-muted">Every new citizen report starts here. It may become Corroborated if independent reports or sources support it.</p></Card>
        <Btn kind="ai" icon="check" disabled={busy} onClick={() => submit()}>{busy ? 'Submitting…' : 'Confirm and submit'}</Btn>
        <Btn kind="secondary" onClick={back}>Edit details</Btn>
        <button onClick={() => submit(true)} className="w-full text-[12px] text-muted underline">Preview server-error state</button>
      </div>
    </div>
  )
}

/* ---------------- Screen 5: Submitted ---------------- */
function Submitted({ go }: Ctx) {
  return (
    <div className="space-y-4 px-4 pt-10">
      <div className="text-center">
        <div className="relative mx-auto size-40">
          {Array.from({ length: 22 }).map((_, k) => { const a = (k / 22) * Math.PI * 2; const r = 58 + (k % 3) * 12; return <span key={k} className="rise absolute size-2 rounded-sm" style={{ left: 76 + Math.cos(a) * r, top: 76 + Math.sin(a) * r, transform: `rotate(${k * 33}deg)`, background: ['#f2a93b', '#e65362', '#2855e8', '#12a6a0', '#7857f7'][k % 5] }} /> })}
          <div className="rise absolute inset-8 grid place-items-center rounded-full bg-ok text-white shadow-[0_10px_30px_-8px_rgba(31,157,104,.7)] ring-8 ring-ok/15"><Icon n="check" s={48} /></div>
        </div>
        <h1 className="mt-2 text-[24px] font-extrabold">Thanks for contributing.</h1>
        <p className="mt-1 text-[14px] text-muted">Your report was received. Received is not the same as confirmed.</p>
      </div>
      <Card className="space-y-3">
        <div><p className="text-[12px] font-bold uppercase tracking-wide text-coral">{NEW_REPORT.type}</p><h3 className="text-[17px] font-extrabold">{NEW_REPORT.title}</h3><p className="text-[13px] text-muted">Report U-001 · {NEW_REPORT.place} · Just now</p></div>
        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <div className="rounded-2xl bg-bg p-2.5"><p className="mb-1 text-muted">Verification</p><VerifBadge v="Unverified" /></div>
          <div className="rounded-2xl bg-bg p-2.5"><p className="mb-1 text-muted">Freshness</p><FreshBadge f="Recent" /></div>
        </div>
        <div className="overflow-hidden rounded-2xl"><CityMap h={130} routes="base" incidents={[NEW_REPORT]} showPlaces={false} highlight="U-001" /></div>
      </Card>
      <button onClick={() => go('replay')} className="flex w-full items-center gap-3 rounded-[20px] bg-gradient-to-r from-brand to-violet p-4 text-left text-white shadow-lg">
        <Icon n="spark" s={24} />
        <div className="flex-1"><p className="text-[15px] font-extrabold">View Impact Replay</p><p className="text-[12px] opacity-90">Your report was checked against your baseline route to Shaniwar Wada</p></div>
        <Icon n="back" className="rotate-180" />
      </button>
      <div className="grid grid-cols-2 gap-2"><Btn kind="secondary" icon="map" onClick={() => go('map')}>View on map</Btn><Btn kind="secondary" icon="ledger" onClick={() => go('ledger')}>Evidence Ledger</Btn></div>
    </div>
  )
}

/* ---------------- Screen 9: Impact Replay ---------------- */
const SCEN: Record<Scenario, { label: string; head: string; why: string; tone: string; after: 'alt' | 'base' | 'none'; diff: [string, string, string][]; inc: Incident; rec: string }> = {
  changes: { label: 'Route changes', head: 'Recommendation changed: review the alternative', tone: 'from-brand to-violet', after: 'alt', inc: NEW_REPORT, rec: 'Alternative via Bajirao Rd',
    why: 'Your new report (Unverified, Recent) intersects 140 m of the baseline route between Mandai and Tulsi Baug. An alternative route avoids that segment, adds about 4 minutes, and has 1 fewer report along it.',
    diff: [['Reports along route', '2', '1'], ['Walking time (est.)', '27 min', '31 min'], ['Distance (est.)', '2.1 km', '2.4 km']] },
  noChange: { label: 'Affects, no change', head: 'Segment affected: recommendation unchanged', tone: 'from-amber to-coral', after: 'base', inc: { ...NEW_REPORT, exposure: 'Touches 20 m at the edge of the baseline route.' }, rec: 'Baseline route kept',
    why: 'The report touches 20 m at the edge of the baseline route. The only alternative adds 14 minutes and passes a corroborated demo report, so it has no less exposure. Keep the baseline and watch this spot.',
    diff: [['Reports along route', '1', '2 (incl. new)'], ['Walking time (est.)', '27 min', '27 min'], ['Recommendation', 'Baseline', 'Baseline']] },
  noIntersect: { label: 'No route change', head: 'No route change', tone: 'from-teal to-ok', after: 'base', inc: DEMO_INCIDENTS[1], rec: 'Baseline route kept',
    why: 'The report is 410 m from your route and does not intersect any segment you will walk. No change is justified. It stays visible in the Evidence Ledger.',
    diff: [['Reports along route', '1', '1'], ['Walking time (est.)', '27 min', '27 min']] },
  fallback: { label: 'Comparison unavailable', head: 'Live comparison unavailable: using cached demo route', tone: 'from-slate-500 to-slate-700', after: 'alt', inc: NEW_REPORT, rec: 'Cached alternative (labelled)',
    why: 'The routing provider returned no second live route. The alternative shown is a cached demo route from an earlier session. Its time and distance are estimates and may not match current conditions.',
    diff: [['Reports along route', '2', '1 (cached geometry)'], ['Walking time', '27 min (est.)', 'Not available live']] },
  contested: { label: 'Contested / stale', head: 'Evidence conflicts: no strong recommendation', tone: 'from-violet to-slate-600', after: 'base', inc: DEMO_INCIDENTS[2], rec: 'Review evidence before deciding',
    why: 'Two demo reports disagree about the Laxmi Rd barricade (one says it was removed), and the newest is 4 days old (Stale). We do not change your route based on conflicting, stale evidence. Open the ledger to see both sides.',
    diff: [['Reports along route', '1', '1 (contested)'], ['Freshness', 'Aging', 'Stale']] },
}
function Replay({ back, go, scenario, setScenario, openIncident }: Ctx) {
  const [phase, setPhase] = useState<'before' | 'after'>('after')
  const s = SCEN[scenario]
  const incs = phase === 'before' ? [DEMO_INCIDENTS[0]] : [DEMO_INCIDENTS[0], s.inc]
  return (
    <div className="min-h-full bg-[#0f1a33] pb-6 text-white">
      <Header dark title="Impact Replay" onBack={back} sub="How one report affects your route to Shaniwar Wada" right={<SourceBadge k={scenario === 'fallback' ? 'Cached' : 'Demo route'} />} />
      <div className="space-y-3 px-4">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" aria-label="Replay scenario">
          {(Object.keys(SCEN) as Scenario[]).map((k) => <Chip key={k} on={scenario === k} onClick={() => setScenario(k)}>{SCEN[k].label}</Chip>)}
        </div>
        {/* Timeline toggle */}
        <div className="relative grid grid-cols-2 rounded-2xl bg-white/10 p-1 ring-1 ring-white/10">
          <span className={`absolute inset-y-1 w-[calc(50%-4px)] rounded-xl bg-gradient-to-r from-brand to-violet transition-all ${phase === 'after' ? 'left-[calc(50%)]' : 'left-1'}`} />
          {(['before', 'after'] as const).map((p) => (
            <button key={p} onClick={() => setPhase(p)} className={`relative z-10 h-12 text-[14px] font-bold ${phase === p ? 'text-white' : 'text-slate-300'}`}>
              {p === 'before' ? 'Before report' : 'After report'}<div className="text-[11px] font-semibold opacity-75">{p === 'before' ? '08:40 · baseline' : 'Just now · +1 report'}</div>
            </button>
          ))}
        </div>
        <div className="relative overflow-hidden rounded-[22px] ring-1 ring-white/10">
          <CityMap h={280} routes={phase === 'before' || s.after === 'base' ? 'base' : 'both'} incidents={incs} showPlaces={false} highlight={phase === 'after' ? s.inc.id : undefined} onIncident={openIncident} />
          <div className="absolute bottom-6 left-2 flex flex-col gap-1 rounded-xl bg-white/95 p-2 text-[11px] font-bold shadow ring-1 ring-line">
            <span className="flex items-center gap-1.5"><svg width="22" height="6"><path d="M0 3h22" stroke="#2855e8" strokeWidth="4" /></svg>Baseline (solid)</span>
            {phase === 'after' && s.after === 'alt' && <span className="flex items-center gap-1.5"><svg width="22" height="6"><path d="M0 3h22" stroke="#12a6a0" strokeWidth="4" strokeDasharray="5 3" /></svg>Alternative (dashed)</span>}
            {phase === 'after' && <span className="flex items-center gap-1.5"><svg width="22" height="12" viewBox="0 0 24 24"><DiamondMark x={12} y={12} v={s.inc.verif} size={7} /></svg>New report</span>}
            {phase === 'after' && scenario !== 'noIntersect' && scenario !== 'contested' && <span className="flex items-center gap-1.5"><svg width="22" height="6"><path d="M0 3h22" stroke="#e65362" strokeWidth="6" /></svg>Affected segment</span>}
          </div>
        </div>
        <p className="sr-only">Text summary: {s.why}</p>
        <ol className="relative space-y-3 before:absolute before:bottom-6 before:left-[13px] before:top-6 before:w-0.5 before:bg-white/15" aria-label="Replay timeline">
          <li className="relative">
            <div className="mb-1.5 flex items-center gap-2"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/15 text-[12px] font-extrabold">1</span><p className="text-[12px] font-extrabold tracking-wider">BEFORE</p><span className="ml-auto text-[12px] text-slate-300">08:40</span></div>
            <Card dark className="ml-9 space-y-2">
              <p className="text-[16px] font-extrabold">Original route: Deccan → Shaniwar Wada</p>
              <p className="text-[13px] text-slate-300">Fastest route · 2.1 km · ~27 min walking (estimated)</p>
              <p className="text-[13px]"><span className="text-slate-300">Recommendation: </span><b>Fastest route</b></p>
              <button onClick={() => openIncident(DEMO_INCIDENTS[0])} className="flex min-h-11 w-full items-center gap-2 rounded-xl bg-white/[.06] p-2.5 text-left text-[13px]"><span className="flex-1"><b>Existing evidence:</b> {DEMO_INCIDENTS[0].title} <span className="text-slate-300">(Corroborated · Recent · demo)</span></span><Icon n="back" s={14} className="rotate-180" /></button>
            </Card>
          </li>
          <li className="relative">
            <div className="mb-1.5 flex items-center gap-2"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-coral text-white text-[12px] font-extrabold">2</span><p className="text-[12px] font-extrabold tracking-wider">NEW INFORMATION</p><span className="ml-auto text-[12px] text-slate-300">{s.inc.time}</span></div>
            <button onClick={() => openIncident(s.inc)} className="ml-9 block w-[calc(100%-2.25rem)] rounded-[20px] bg-coral/10 p-4 text-left ring-1 ring-coral/40">
              {s.inc.source === 'Simulated demo data' && <span className="mb-2 inline-block rounded-md bg-white/15 px-2 py-0.5 text-[11px] font-extrabold tracking-wide">DEMO DATA · simulated</span>}
              <p className="text-[12px] font-bold uppercase tracking-wide text-[#ff9aa4]">{s.inc.type} · {s.inc.id}</p>
              <p className="text-[16px] font-extrabold">{s.inc.title}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[13px] text-slate-300"><Icon n="pin" s={13} />{s.inc.place}</p>
              <div className="mt-2 flex flex-wrap gap-1.5"><VerifBadge v={s.inc.verif} /><FreshBadge f={s.inc.fresh} /></div>
              {s.inc.verif === 'Unverified' && <p className="mt-2 text-[12px] text-slate-300">Treated as a caution signal, not a confirmed hazard.</p>}
            </button>
          </li>
          <li className="relative">
            <div className="mb-1.5 flex items-center gap-2"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-violet text-[12px] font-extrabold">3</span><p className="text-[12px] font-extrabold tracking-wider">AFTER</p><span className="ml-auto text-[12px] text-slate-300">Now</span></div>
            <Card dark className="ml-9 p-0">
              <div className="p-4 pb-2"><p className="text-[16px] font-extrabold">{s.rec}</p><p className="text-[13px] text-slate-300">Updated route assessment</p></div>
              {s.diff.map(([k, a, b]) => (
                <div key={k} className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-2.5 text-[13px]">
                  <span className="text-slate-300">{k}</span>
                  <span className="text-right"><span className="text-slate-400 line-through decoration-white/30">{a !== b ? a : ''}</span>{a !== b && ' → '}<b className={a !== b ? 'text-[#7fb0ff]' : ''}>{b}</b></span>
                </div>))}
            </Card>
          </li>
        </ol>
        <section className={`rise rounded-[22px] bg-gradient-to-br ${s.tone} p-[1.5px]`} aria-labelledby="wcw">
          <div className="rounded-[21px] bg-[#16244a] p-4">
            <p id="wcw" className="flex items-center gap-1.5 text-[13px] font-extrabold text-[#c7baff]"><Icon n="spark" s={15} />What changed and why?</p>
            <h2 className="mt-1 text-[19px] font-extrabold leading-tight">{s.head}</h2>
            <p className="mt-2 text-[14px] leading-relaxed">{s.why}</p>
            {s.after === 'base' && <p className="mt-2 rounded-xl bg-white/[.06] p-2.5 text-[13px]"><b>Why unchanged:</b> the evidence does not justify moving you to a different route.</p>}
          </div>
        </section>
        <Card dark>
          <p className="text-[14px] font-extrabold">Evidence behind this result</p>
          {[s.inc, DEMO_INCIDENTS[0]].filter((v, i, a) => a.findIndex((x) => x.id === v.id) === i).map((i) => (
            <button key={i.id} onClick={() => openIncident(i)} className="mt-2 flex w-full items-center gap-3 rounded-2xl bg-white/[.06] p-3 text-left">
              <span className="rounded-lg bg-white/10 px-2 py-1 text-[11px] font-extrabold">{i.id}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-bold">{i.title}</span><span className="text-[12px] text-slate-300">{i.verif} · {i.fresh}{i.source === 'Simulated demo data' ? ' · Demo incident' : ''}</span></span>
              <Icon n="back" s={16} className="rotate-180 text-slate-300" />
            </button>))}
          <div className="mt-3"><Btn kind="secondary" icon="ledger" onClick={() => go('ledger')}>Open in Evidence Ledger</Btn></div>
        </Card>
        <Btn kind="secondary" icon="map" onClick={() => go('map')}>Back to map</Btn>
        <Note tone="demo">This replay uses a {scenario === 'fallback' ? 'cached' : 'demo'} route and simulated demo incidents alongside your report. Times are estimates. Not a guarantee of current conditions.</Note>
      </div>
    </div>
  )
}

/* ---------------- Screen 6: Evidence Ledger ---------------- */
function Ledger({ allIncidents, openIncident, go }: Ctx) {
  const [f, setF] = useState('All')
  const [vf, setVf] = useState('Any status')
  const [cf, setCf] = useState('Any category')
  const [q, setQ] = useState('')
  const [heur, setHeur] = useState(false)
  const list = allIncidents.filter((i) =>
    (f === 'All' || (f === 'Near route' && i.nearRoute) || (f === 'Recent' && i.fresh === 'Recent') || (f === 'Simulated demo data' && i.source === 'Simulated demo data')) &&
    (vf === 'Any status' || i.verif === vf) && (cf === 'Any category' || i.type === cf) &&
    (i.title + i.place + i.type).toLowerCase().includes(q.toLowerCase()))
  const cats = Array.from(new Set(allIncidents.map((i) => i.type)))
  return (
    <div className="relative min-h-full">
      <Header title="Evidence Ledger" sub="Why each report is treated the way it is" right={<button onClick={() => setHeur(true)} aria-label="How evidence is assessed" className="grid size-11 place-items-center rounded-full bg-white ring-1 ring-line"><Icon n="info" /></button>} />
      <div className="space-y-3 px-4">
        <label className="flex h-12 items-center gap-2 rounded-2xl bg-white px-4 ring-1 ring-line"><Icon n="search" className="text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted" placeholder="Search reports" /></label>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">{['All', 'Near route', 'Recent', 'Simulated demo data'].map((c) => <Chip key={c} on={f === c} onClick={() => setF(c)}>{c}</Chip>)}</div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[12px] font-bold text-muted">Status<select value={vf} onChange={(e) => setVf(e.target.value)} className="mt-1 h-11 w-full rounded-xl bg-white px-2 text-[14px] font-semibold text-navy ring-1 ring-line">{['Any status', 'Unverified', 'Corroborated', 'Authority-confirmed', 'Contested'].map((o) => <option key={o}>{o}</option>)}</select></label>
          <label className="text-[12px] font-bold text-muted">Category<select value={cf} onChange={(e) => setCf(e.target.value)} className="mt-1 h-11 w-full rounded-xl bg-white px-2 text-[14px] font-semibold text-navy ring-1 ring-line">{['Any category', ...cats].map((o) => <option key={o}>{o}</option>)}</select></label>
        </div>
        <p className="text-[12px] font-semibold text-muted" aria-live="polite">{list.length} of {allIncidents.length} reports</p>
        <Note>Evidence status is not a guarantee of current conditions.</Note>
        {list.length === 0 && <Card className="py-10 text-center"><Icon n="search" s={28} className="mx-auto text-muted" /><p className="mt-2 font-bold">No reports match these filters.</p><button className="mt-2 text-[14px] font-bold text-brand" onClick={() => { setF('All'); setQ(''); setVf('Any status'); setCf('Any category') }}>Clear filters</button></Card>}
        {list.map((i) => (
          <Card key={i.id} className="space-y-2">
            <button onClick={() => openIncident(i)} className="flex w-full items-start gap-3 text-left" aria-label={`Open details: ${i.title}`}>
              {i.img ? <img src={i.img} alt="" className="size-16 shrink-0 rounded-xl object-cover" /> : <span className="grid size-16 shrink-0 place-items-center rounded-xl bg-coral/10 text-coral"><Icon n="alert" s={24} /></span>}
              <div className="min-w-0 flex-1"><p className="text-[12px] font-bold uppercase tracking-wide text-coral">{i.type} · {i.id}</p><h3 className="text-[16px] font-extrabold leading-tight">{i.title}</h3><p className="text-[13px] text-muted">{i.place}</p><p className="text-[12px] text-muted">{i.time} · {i.source === 'Simulated demo data' ? 'Simulated (demo)' : 'Real citizen report'}</p></div>
              <Icon n="back" s={16} className="mt-1 shrink-0 rotate-180 text-muted" />
            </button>
            <div className="flex flex-wrap gap-1.5"><VerifBadge v={i.verif} /><FreshBadge f={i.fresh} /><SourceBadge k={i.source === 'Simulated demo data' ? 'Simulated' : 'Citizen'} /></div>
            <Expand title="Evidence details">
              <Row k="Source" v={i.source} />
              <Row k="Observed" v={i.time} />
              <Row k="Location" v={i.place} />
              <Row k="Possible duplicates" v={i.duplicates.length ? i.duplicates.join(', ') : 'None found'} />
              <Row k="Independence" v={i.independent} />
              <Row k="Route effect" v={<span className="block max-w-[190px]">{i.exposure}</span>} />
              <button onClick={() => openIncident(i)} className="mt-2 text-[14px] font-bold text-brand">Open incident detail →</button>
            </Expand>
          </Card>
        ))}
        <Btn kind="secondary" icon="route" onClick={() => go('routes')}>Compare routes with this evidence</Btn>
      </div>
      {heur && (
        <Sheet title="How evidence is assessed" onClose={() => setHeur(false)}>
          <p className="mb-3 text-[14px] text-muted">An <b>evidence heuristic</b> (rule-based, not a probability) decides how a report is treated:</p>
          {[['Verification', 'Unverified until independent reports or an authoritative source support it. Conflicts are shown as Contested.'], ['Freshness', 'Recent < 6 h · Aging 6–48 h · Stale > 48 h · Unknown if no time given. Separate from verification.'], ['Route exposure', 'Measured distance from route geometry. Within 25 m counts as along the route.'], ['Duplicates', 'Same type within 200 m and 6 h are linked, not double-counted.']].map(([t, d]) => <div key={t} className="mb-3 rounded-2xl bg-bg p-3"><p className="text-[14px] font-bold">{t}</p><p className="text-[13px] text-muted">{d}</p></div>)}
        </Sheet>
      )}
    </div>
  )
}

/* ---------------- Screen 7: Incident Detail ---------------- */
function IncidentDetail({ back, incident: i, go, setScenario }: Ctx) {
  const sim = i.source === 'Simulated demo data'
  return (
    <div className="pb-6">
      <Header title="Incident detail" onBack={back} />
      <div className="space-y-3 px-4">
        {sim && <div className="rounded-2xl bg-violet/10 px-3 py-2 text-[13px] font-bold text-violet ring-1 ring-violet/30">Simulated demo data: not a real incident at this location</div>}
        <div className="overflow-hidden rounded-[20px] ring-1 ring-line"><CityMap h={170} routes="base" incidents={[i]} showPlaces={false} highlight={i.id} /></div>
        <div><p className="text-[12px] font-bold uppercase tracking-wide text-coral">{i.type}</p><h2 className="text-[22px] font-extrabold leading-tight">{i.title}</h2><p className="text-[13px] text-muted">{i.place} · {i.time} · {i.id}</p></div>
        <div className="grid grid-cols-2 gap-2">
          <Card className="p-3"><p className="mb-1.5 text-[12px] font-bold text-muted">Verification</p><VerifBadge v={i.verif} /></Card>
          <Card className="p-3"><p className="mb-1.5 text-[12px] font-bold text-muted">Freshness</p><FreshBadge f={i.fresh} /></Card>
        </div>
        <Card><p className="text-[12px] font-bold text-muted">Source</p><p className="text-[15px] font-bold">{i.source}</p><p className="mt-2 text-[14px]">{i.desc}</p><p className="mt-2 text-[12px] text-muted">Attachments: none</p></Card>
        {i.verif === 'Contested' && <Card className="ring-violet/40"><p className="text-[14px] font-extrabold text-violet">Evidence disagrees</p><div className="mt-2 grid grid-cols-2 gap-2 text-[13px]"><div className="rounded-xl bg-bg p-2.5"><b>D-317 · 4 days ago</b><br />Barricade blocking lane</div><div className="rounded-xl bg-bg p-2.5"><b>D-322 · 3 days ago</b><br />Says it was removed</div></div></Card>}
        <Card>
          <p className="text-[14px] font-extrabold">Related reports</p>
          <p className="mt-1 text-[13px] text-muted">{i.duplicates.length ? i.duplicates.join(' · ') : 'No related reports found.'}</p>
          <Expand title="Why this status?"><p>{i.independent} {i.verif === 'Unverified' ? 'Status changes only when independent evidence or an authoritative source is added.' : ''}</p></Expand>
          <Expand title="Why it matters to this route" open><p>{i.exposure}</p><p className="mt-1 text-[12px] text-muted">Measured against the baseline route geometry (Deccan → Shaniwar Wada).</p></Expand>
        </Card>
        <Btn kind="ai" icon="spark" onClick={() => { setScenario(i.verif === 'Contested' ? 'contested' : i.nearRoute ? 'changes' : 'noIntersect'); go('replay') }}>View Impact Replay</Btn>
      </div>
    </div>
  )
}

/* ---------------- Screen 8: Routes ---------------- */
function Routes({ go, dest, setScenario, openIncident, submitted }: Ctx) {
  const [sel, setSel] = useState<'fast' | 'lower'>('fast')
  const [noAlt, setNoAlt] = useState(false)
  const [details, setDetails] = useState(false)
  const place = PLACES.find((p) => p.id === dest)!
  const routes = [
    { id: 'fast' as const, name: 'Fastest route', time: '27 min', dist: '2.1 km', incs: submitted ? [NEW_REPORT, DEMO_INCIDENTS[0]] : [DEMO_INCIDENTS[0]], trade: 'Shortest walk. Passes the reported segment near Mandai.', exposure: submitted ? '2 reports within 25 m · 160 m of route exposed' : '1 report within 25 m · 20 m of route exposed' },
    { id: 'lower' as const, name: 'Lower reported risk', time: '31 min', dist: '2.4 km', incs: [] as Incident[], trade: 'Takes about 4 min longer but has less exposure to currently available reports.', exposure: 'No reports within 25 m in available data' },
  ]
  const visible = noAlt ? routes.slice(0, 1) : routes
  return (
    <div className="relative">
      <Header title="Routes" sub="Walking · route evidence" right={<SourceBadge k="Cached" />} />
      <div className="space-y-3 px-4">
        <Card className="space-y-2 p-3">
          <div className="flex items-center gap-3"><span className="size-3 rounded-full bg-navy ring-4 ring-navy/10" /><input value="Deccan Gymkhana" readOnly className="h-10 flex-1 rounded-xl bg-bg px-3 text-[14px] font-semibold outline-none" aria-label="Origin" /></div>
          <div className="flex items-center gap-3"><Icon n="pin" s={14} className="text-brand" /><input value={place.name} readOnly className="h-10 flex-1 rounded-xl bg-bg px-3 text-[14px] font-semibold outline-none" aria-label="Destination" /></div>
          <div className="grid grid-cols-4 gap-2 pt-1">{['Walk', 'Bike', 'Car', 'Transit'].map((m, k) => <button key={m} disabled={k > 0} title={k ? 'Not supported by the demo route provider' : undefined} className={`flex h-14 flex-col items-center justify-center rounded-2xl text-[12px] font-bold ${k ? 'bg-bg text-slate-400' : 'bg-brand/10 text-brand ring-1 ring-brand/30'}`}><Icon n={k ? 'route' : 'walk'} s={18} />{m}</button>)}</div>
          <p className="text-[11px] text-muted">Only walking is supported by the demo route provider.</p>
        </Card>
        <div className="overflow-hidden rounded-[20px] ring-1 ring-line"><CityMap h={220} routes={noAlt ? 'base' : sel === 'fast' ? 'base' : 'alt'} incidents={submitted ? [NEW_REPORT, ...DEMO_INCIDENTS] : DEMO_INCIDENTS} showPlaces={false} onIncident={openIncident} /></div>
        {noAlt && <Note tone="warn"><b>A second live route is unavailable.</b> The provider returned only one route. We will not draw an alternative unless it is a clearly labelled cached route. <button className="font-bold underline" onClick={() => setNoAlt(false)}>Show cached alternative</button></Note>}
        {visible.map((r) => (
          <button key={r.id} onClick={() => setSel(r.id)} aria-pressed={sel === r.id} className={`w-full rounded-[20px] bg-white p-4 text-left ring-1 transition ${sel === r.id ? 'ring-2 ring-brand' : 'ring-line'}`}>
            <div className="flex items-center justify-between"><h3 className="flex items-center gap-2 text-[16px] font-extrabold"><svg width="22" height="6"><path d="M0 3h22" stroke={r.id === 'fast' ? '#2855e8' : '#12a6a0'} strokeWidth="4" strokeDasharray={r.id === 'fast' ? undefined : '5 3'} /></svg>{r.name}</h3><span className="text-[15px] font-extrabold">{r.time}</span></div>
            <p className="text-[12px] text-muted">{r.dist} · estimated · cached demo geometry</p>
            <p className="mt-2 rounded-xl bg-bg px-2.5 py-1.5 text-[12px]"><b>Route exposure:</b> {r.exposure}</p>
            <p className="mt-2 text-[13px]"><b>Trade-off:</b> {r.trade}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[12px] font-bold">{r.incs.length} report{r.incs.length === 1 ? '' : 's'} along route</span>
              {r.incs.map((i) => <span key={i.id} className="flex gap-1"><VerifBadge v={i.verif} /><FreshBadge f={i.fresh} /></span>)}
            </div>
          </button>
        ))}
        <div className="grid grid-cols-2 gap-2"><Btn kind="secondary" icon="ledger" onClick={() => setDetails(true)}>Review evidence</Btn><Btn kind="ai" icon="spark" onClick={() => { setScenario('changes'); go('replay') }}>Impact Replay</Btn></div>
        <button onClick={() => setNoAlt(!noAlt)} className="w-full pb-2 text-[12px] text-muted underline">Preview no-alternative fallback</button>
      </div>
      {details && (
        <Sheet title={`Evidence on ${visible.find((r) => r.id === sel)?.name ?? 'route'}`} onClose={() => setDetails(false)}>
          {(visible.find((r) => r.id === sel)?.incs ?? []).length === 0 ? <Note>No reports in available data along this route. That does not mean the route is free of issues.</Note> :
            visible.find((r) => r.id === sel)!.incs.map((i) => (
              <button key={i.id} onClick={() => openIncident(i)} className="mb-2 w-full rounded-2xl bg-bg p-3 text-left">
                <p className="text-[14px] font-bold">{i.title}</p><p className="text-[12px] text-muted">{i.exposure}</p>
                <div className="mt-1.5 flex gap-1.5"><VerifBadge v={i.verif} /><FreshBadge f={i.fresh} /></div>
              </button>))}
          <div className="mt-2"><Btn kind="secondary" onClick={() => go('ledger')}>Open full Evidence Ledger</Btn></div>
        </Sheet>
      )}
    </div>
  )
}

/* ---------------- Screen 11: Planner (P2) ---------------- */
function Planner({ back, go, setScenario, submitted }: Ctx) {
  const [budget, setBudget] = useState('₹')
  const [time, setTime] = useState('2 hours')
  const [ints, setInts] = useState(['Food', 'Heritage'])
  const [plan, setPlan] = useState(false)
  const stops = [PLACES[1], PLACES[0], PLACES[2]]
  return (
    <div className="pb-6">
      <Header title="Plan an outing" onBack={back} right={<span className="rounded-full bg-bg px-2.5 py-1 text-[11px] font-bold text-muted ring-1 ring-line">P2 · Optional</span>} />
      <div className="space-y-4 px-4">
        <div><label className="mb-1.5 block text-[14px] font-bold">What would you like to explore?</label><input defaultValue="Misal and a heritage walk" className="h-12 w-full rounded-2xl bg-white px-4 text-[15px] outline-none ring-1 ring-line focus:ring-2 focus:ring-brand" /></div>
        <Card className="space-y-3"><p className="text-[14px] font-extrabold">Preferences</p>
          {['Budget', 'Avoid reported issues', 'Walking distance'].map((l, k) => <label key={l} className="block"><span className="flex justify-between text-[13px]"><span className="font-semibold">{l}</span><span className="text-muted">{k === 1 ? 'More weight' : 'Higher'}</span></span><input type="range" defaultValue={[30, 60, 40][k]} className="mt-1 w-full accent-brand" /></label>)}
          <p className="text-[11px] text-muted">"Avoid reported issues" weighs available reports only; it does not make a route safe.</p>
        </Card>
        {[['Budget band', ['₹', '₹₹', '₹₹₹'], budget, setBudget], ['Duration', ['1 hour', '2 hours', '3 hours', 'Half day', 'Full day'], time, setTime]].map(([l, o, v, s]) => (
          <div key={l as string}><p className="mb-2 text-[14px] font-bold">{l as string}</p><div className="flex flex-wrap gap-2">{(o as string[]).map((x) => <Chip key={x} on={v === x} onClick={() => (s as (x: string) => void)(x)}>{x}</Chip>)}</div></div>
        ))}
        <div><p className="mb-2 text-[14px] font-bold">Interests</p><div className="flex flex-wrap gap-2">{['Food', 'Heritage', 'Nature', 'Activities'].map((x) => <Chip key={x} on={ints.includes(x)} onClick={() => setInts(ints.includes(x) ? ints.filter((y) => y !== x) : [...ints, x])}>{x}</Chip>)}</div></div>
        <Card className="flex items-center gap-3 p-3"><Icon n="cloud" s={28} className="text-muted" /><div className="flex-1"><p className="text-[14px] font-bold">Weather unavailable</p><p className="text-[12px] text-muted">Could not load forecast. You can still plan.</p></div></Card>
        <Btn kind="ai" icon="spark" onClick={() => setPlan(true)}>Generate plan</Btn>
        {plan && (
          <div className="rise space-y-2">
            <p className="text-[14px] font-extrabold">3-stop walk · about 1 h 50 min (estimated)</p>
            {stops.map((p, k) => (
              <div key={p.id}>
                <Card className="flex items-center gap-3 p-3"><span className="grid size-8 place-items-center rounded-full bg-navy text-[13px] font-bold text-white">{k + 1}</span><div className={`size-12 rounded-xl bg-cover bg-center`} style={{ backgroundImage: `url(${p.img})` }} /><div className="flex-1"><p className="text-[15px] font-bold">{p.name}</p><p className="text-[12px] text-muted">{p.cat} · {p.price}</p></div></Card>
                {k < 2 && <div className="ml-7 flex items-center gap-2 border-l-2 border-dashed border-line py-2 pl-5 text-[12px] text-muted"><Icon n="walk" s={14} />{k === 0 ? '12 min walk (est.)' : '18 min walk (est.)'}{k === 0 && submitted && <button onClick={() => { setScenario('changes'); go('replay') }} className="ml-1 rounded-full bg-coral/10 px-2 py-0.5 font-bold text-coral">New report on this segment →</button>}</div>}
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2"><Btn kind="secondary" onClick={() => setPlan(false)}>Edit plan</Btn><Btn onClick={() => go('routes')}>Open in Routes</Btn></div>
            <Note tone="demo">Places are demo listings. Walking times are estimates from cached demo routes. Report notes come from the Evidence Ledger.</Note>
          </div>
        )}
      </div>
    </div>
  )
}
