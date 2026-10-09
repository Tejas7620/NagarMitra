// ============================================================
// GET /api/incidents — Filterable Incidents API
// Supports: bbox, lat/lng/radius, incidentType, verificationStatus,
// freshnessStatus, lifecycleStatus, isSimulated, limit.
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { getAllIncidents, getDataMode } from '@/lib/repositories/store';
import { IncidentsQuerySchema } from '@/lib/validations/schemas';
import { haversineDistance } from '@/lib/evidence/duplicate-matching';
import { Incident } from '@/lib/types';



export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  try {
    const queryObj = Object.fromEntries(searchParams.entries());

    const parseResult = IncidentsQuerySchema.safeParse(queryObj);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid incident query parameters',
            details: parseResult.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const {
      incidentType,
      verificationStatus,
      freshnessStatus,
      lifecycleStatus,
      isSimulated,
      latitude,
      longitude,
      radius,
      bbox,
      limit,
    } = parseResult.data;

    let incidents: Incident[] = getAllIncidents();

    // 1. Lifecycle filter (active vs resolved)
    if (lifecycleStatus === 'active') {
      incidents = incidents.filter((i) => !i.isResolved);
    } else if (lifecycleStatus === 'resolved') {
      incidents = incidents.filter((i) => i.isResolved);
    }

    // 2. Incident Type filter
    if (incidentType && incidentType !== 'all') {
      incidents = incidents.filter((i) => i.incidentType.toLowerCase() === incidentType.toLowerCase());
    }

    // 3. Verification Status filter
    if (verificationStatus) {
      incidents = incidents.filter((i) => i.verificationStatus === verificationStatus);
    }

    // 4. Freshness Status filter
    if (freshnessStatus) {
      incidents = incidents.filter((i) => i.freshnessStatus === freshnessStatus);
    }

    // 5. Simulated data filter
    if (isSimulated !== undefined) {
      const simBool = isSimulated === 'true';
      incidents = incidents.filter((i) => i.isSimulated === simBool);
    }

    // 6. Bounding box filter [minLng, minLat, maxLng, maxLat]
    if (bbox) {
      const parts = bbox.split(',').map(Number);
      if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
        const [minLng, minLat, maxLng, maxLat] = parts;
        incidents = incidents.filter(
          (i) =>
            i.latitude >= minLat &&
            i.latitude <= maxLat &&
            i.longitude >= minLng &&
            i.longitude <= maxLng
        );
      }
    }

    // 7. Radial proximity filter (radius in km)
    if (latitude !== undefined && longitude !== undefined && radius !== undefined) {
      const radiusMeters = radius * 1000;
      incidents = incidents.filter((i) => {
        const dist = haversineDistance(latitude, longitude, i.latitude, i.longitude);
        return dist <= radiusMeters;
      });
    }

    // Apply limit
    const totalCount = incidents.length;
    const paginatedIncidents = incidents.slice(0, limit);

    const hasSimulated = paginatedIncidents.some((i) => i.isSimulated);
    const hasReal = paginatedIncidents.some((i) => !i.isSimulated);
    const dataMode = getDataMode();

    return NextResponse.json({
      success: true,
      incidents: paginatedIncidents,
      count: paginatedIncidents.length,
      total: totalCount,
      dataMode: hasSimulated && hasReal ? 'mixed' : hasSimulated ? 'demo' : dataMode,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    if (error?.digest?.startsWith?.('NEXT_')) {
      throw error;
    }
    console.error('Failed to load incidents:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INCIDENTS_FETCH_ERROR',
          message: 'Failed to retrieve incidents',
        },
      },
      { status: 500 }
    );
  }
}
