// ============================================================
// GET /api/places — Dynamic Place Discovery API
// Supports: category, bbox, lat, lng, radius, query, limit
// Enforces standard category taxonomy and transparent attribution
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { getAllPlaces } from '@/lib/repositories/store';
import { PlaceQuerySchema } from '@/lib/validations/schemas';



function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Normalize internal place category to standard taxonomy
function normalizeCategory(cat: string): string {
  const c = cat.toLowerCase();
  if (c === 'toilets') return 'public_toilet';
  if (c === 'stays') return 'hotel';
  if (c === 'water') return 'drinking_water';
  return c;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryObj = {
      category: searchParams.get('category') || 'all',
      query: searchParams.get('query') || searchParams.get('q') || '',
      latitude: searchParams.get('latitude') || searchParams.get('lat') || undefined,
      longitude: searchParams.get('longitude') || searchParams.get('lng') || undefined,
      radius: searchParams.get('radius') || undefined,
      bbox: searchParams.get('bbox') || undefined,
      limit: searchParams.get('limit') || undefined,
    };

    const parsed = PlaceQuerySchema.safeParse(queryObj);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters for places',
            details: parsed.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const { category, query, latitude, longitude, radius, bbox, limit } = parsed.data;
    const catLower = category.toLowerCase();
    const qLower = query.toLowerCase();

    // Default reference coordinates to Central Pune if not supplied
    const refLat = latitude ?? 18.5204;
    const refLng = longitude ?? 73.8420;

    let minLng: number | null = null;
    let minLat: number | null = null;
    let maxLng: number | null = null;
    let maxLat: number | null = null;

    if (bbox) {
      const parts = bbox.split(',').map((p) => parseFloat(p.trim()));
      if (parts.length === 4 && parts.every((num) => !isNaN(num))) {
        [minLng, minLat, maxLng, maxLat] = parts;
      }
    }

    const allPlaces = getAllPlaces();

    // 1. Filter places by category, query, and bounding box
    const filtered = allPlaces.filter((p) => {
      // Bounding box filter
      if (minLng !== null && minLat !== null && maxLng !== null && maxLat !== null) {
        if (
          p.latitude < minLat ||
          p.latitude > maxLat ||
          p.longitude < minLng ||
          p.longitude > maxLng
        ) {
          return false;
        }
      }

      const normalizedCat = normalizeCategory(p.category);

      // Category filter
      if (catLower !== 'all' && catLower !== 'reports') {
        let matchesCat = false;
        if (catLower === 'food' || catLower === 'restaurant' || catLower === 'cafe') {
          matchesCat = normalizedCat === 'food';
        } else if (catLower === 'heritage' || catLower === 'history' || catLower === 'culture') {
          matchesCat = normalizedCat === 'heritage' || normalizedCat === 'tourist_attraction';
        } else if (catLower === 'tourist_attraction' || catLower === 'attractions') {
          matchesCat = normalizedCat === 'tourist_attraction' || normalizedCat === 'heritage';
        } else if (catLower === 'hotel' || catLower === 'hotels' || catLower === 'stays') {
          matchesCat = normalizedCat === 'hotel';
        } else if (
          catLower === 'public_toilet' ||
          catLower === 'toilets' ||
          catLower === 'toilet' ||
          catLower === 'public toilets'
        ) {
          matchesCat = normalizedCat === 'public_toilet';
        } else if (
          catLower === 'drinking_water' ||
          catLower === 'water' ||
          catLower === 'drinking water'
        ) {
          matchesCat = normalizedCat === 'drinking_water';
        } else if (catLower === 'transport' || catLower === 'transit') {
          matchesCat = normalizedCat === 'transport';
        } else if (catLower === 'health' || catLower === 'hospital' || catLower === 'hospitals') {
          matchesCat = normalizedCat === 'health';
        } else if (catLower === 'park' || catLower === 'parks') {
          matchesCat = normalizedCat === 'park';
        } else if (catLower === 'shopping' || catLower === 'market') {
          matchesCat = normalizedCat === 'shopping';
        } else {
          matchesCat = normalizedCat === catLower || p.category.toLowerCase() === catLower;
        }

        if (!matchesCat) return false;
      }

      // Query filter
      if (qLower) {
        const nameMatch = p.name.toLowerCase().includes(qLower);
        const descMatch = (p.shortDescription || '').toLowerCase().includes(qLower);
        const tagMatch = (p.tags || []).some((t) => t.toLowerCase().includes(qLower));
        if (!nameMatch && !descMatch && !tagMatch) return false;
      }

      return true;
    });

    // 2. Compute Haversine distances from reference point and normalize categories
    const enriched = filtered.map((p) => {
      const distKm = haversineDistance(refLat, refLng, p.latitude, p.longitude);
      return {
        ...p,
        category: normalizeCategory(p.category),
        distanceKm: Math.round(distKm * 10) / 10,
        distanceFormatted: distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`,
        provider: 'openstreetmap',
        source: 'curated_pune',
      };
    });

    // 3. Proximity sorting
    enriched.sort((a, b) => a.distanceKm - b.distanceKm);

    // 4. Radius and limit cutoffs
    const results = enriched.filter((p) => p.distanceKm <= radius).slice(0, limit);

    return NextResponse.json({
      success: true,
      places: results,
      category,
      count: results.length,
      dataMode: 'live_curated',
      referenceCoords: { latitude: refLat, longitude: refLng },
      attribution: '© OpenStreetMap contributors, Pune Municipal Corporation Open Data',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Failed to query places:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PLACES_QUERY_ERROR',
          message: 'Failed to process place discovery request',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
