// GET /api/geocode/search?q=...&limit=...
// Standardized geocoding search route using Nominatim and curated landmarks
import { NextRequest, NextResponse } from 'next/server';
import { getAllPlaces } from '@/lib/repositories/store';
import { GeocodeSearchSchema } from '@/lib/validations/schemas';



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
  try {
    const { searchParams } = new URL(request.url);
    const parsed = GeocodeSearchSchema.safeParse({
      q: searchParams.get('q') || '',
      limit: searchParams.get('limit') || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { q, limit } = parsed.data;
    const qLower = q.toLowerCase();
    const curatedPlaces = getAllPlaces();

    // 1. Curated landmark matching
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

    // 2. Query Nominatim across India
    let liveResults: GeocodeResult[] = [];
    try {
      const searchTarget =
        qLower.includes('pune') || qLower.includes('mumbai') || qLower.includes('delhi') || qLower.includes('india')
          ? q
          : `${q}, Pune, India`;

      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchTarget
      )}&addressdetails=1&limit=${limit}`;

      const res = await fetch(nominatimUrl, {
        signal: AbortSignal.timeout(4500),
        headers: {
          'User-Agent': 'NagarMitraAI-GeocodingService/1.0 (DYPCOE Hackathon)',
          Accept: 'application/json',
        },
      });

      if (res.ok) {
        const raw = await res.json();
        if (Array.isArray(raw)) {
          liveResults = raw.map((item: any, idx: number) => {
            const shortName = item.name || item.display_name.split(',')[0].trim();
            const cat = item.type || item.class || 'landmark';
            return {
              id: `osm-${item.osm_id || idx}`,
              name: shortName,
              displayName: item.display_name,
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              category: cat,
              address: item.display_name,
              source: 'live_nominatim' as const,
            };
          });
        }
      }
    } catch (fetchErr) {
      console.warn('Nominatim geocoding fetch error (falling back to curated):', fetchErr);
    }

    // 3. Deduplicate
    const combined: GeocodeResult[] = [...curatedMatches];
    const seen = new Set(combined.map((c) => c.name.toLowerCase()));

    for (const lr of liveResults) {
      if (!seen.has(lr.name.toLowerCase()) && combined.length < limit * 2) {
        seen.add(lr.name.toLowerCase());
        combined.push(lr);
      }
    }

    return NextResponse.json({
      query: q,
      results: combined.slice(0, limit),
      count: combined.length,
      attribution: '© OpenStreetMap contributors',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Geocoding search error:', error);
    return NextResponse.json(
      { error: 'Failed to process geocoding request', results: [] },
      { status: 500 }
    );
  }
}
