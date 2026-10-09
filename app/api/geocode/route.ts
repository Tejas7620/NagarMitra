// GET /api/geocode?q=...&limit=...
// Dynamic geocoding service using OpenStreetMap Nominatim with curated landmark fallback
import { NextRequest, NextResponse } from 'next/server';
import { getAllPlaces } from '@/lib/repositories/store';



export interface GeocodeResult {
  id: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  category: string;
  address?: string | null;
  source: 'live_nominatim' | 'curated';
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  try {
    const query = searchParams.get('q')?.trim() || '';
    const limit = parseInt(searchParams.get('limit') || '8', 10);

    if (!query) {
      return NextResponse.json({ results: [], query: '' });
    }

    const qLower = query.toLowerCase();
    const curatedPlaces = getAllPlaces();

    // 1. Check curated places first
    const curatedMatches: GeocodeResult[] = curatedPlaces
      .filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(qLower);
        const tagMatch = p.tags?.some((t) => t.toLowerCase().includes(qLower));
        const catMatch = p.category.toLowerCase().includes(qLower);
        return nameMatch || tagMatch || catMatch;
      })
      .slice(0, limit)
      .map((p) => ({
        id: p.id,
        name: p.name,
        displayName: `${p.name}, Pune, Maharashtra, India`,
        lat: p.latitude,
        lng: p.longitude,
        category: p.category,
        address: p.shortDescription || null,
        source: 'curated' as const,
      }));

    // 2. Fetch live Nominatim results
    let liveResults: GeocodeResult[] = [];
    try {
      const searchTarget =
        query.toLowerCase().includes('pune') ||
        query.toLowerCase().includes('mumbai') ||
        query.toLowerCase().includes('delhi')
          ? query
          : `${query}, Pune`;

      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchTarget
      )}&addressdetails=1&limit=${limit}`;

      const res = await fetch(nominatimUrl, {
        signal: AbortSignal.timeout(4000),
        headers: {
          'User-Agent': 'NagarMitraAI-App/1.0 (DYPCOE Hackathon Urban Decision System)',
          Accept: 'application/json',
        },
      });

      if (res.ok) {
        const raw = await res.json();
        if (Array.isArray(raw)) {
          liveResults = raw.map((item: Record<string, unknown>, idx: number) => {
            const shortName = String(item.name || String(item.display_name || '').split(',')[0].trim());
            const cat = String(item.type || item.class || 'landmark');
            return {
              id: `osm-${item.osm_id || idx}`,
              name: shortName,
              displayName: String(item.display_name || ''),
              lat: parseFloat(String(item.lat)),
              lng: parseFloat(String(item.lon)),
              category: cat,
              address: String(item.display_name || ''),
              source: 'live_nominatim' as const,
            };
          });
        }
      }
    } catch (fetchErr) {
      console.warn('Nominatim geocoding fetch error (falling back to curated):', fetchErr);
    }

    // 3. Deduplicate and merge results (curated first, then live)
    const combined: GeocodeResult[] = [...curatedMatches];
    const seen = new Set(combined.map((c) => c.name.toLowerCase()));

    for (const lr of liveResults) {
      if (!seen.has(lr.name.toLowerCase()) && combined.length < limit * 2) {
        seen.add(lr.name.toLowerCase());
        combined.push(lr);
      }
    }

    return NextResponse.json({
      query,
      results: combined.slice(0, limit),
      timestamp: new Date().toISOString(),
      count: combined.length,
    });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'digest' in error &&
      typeof (error as { digest?: string }).digest === 'string' &&
      (error as { digest: string }).digest.startsWith('NEXT_')
    ) {
      throw error;
    }
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: 'Failed to process geocoding request', results: [] },
      { status: 500 }
    );
  }
}
