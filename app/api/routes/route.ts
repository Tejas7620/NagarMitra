// Route calculation API supporting both POST (Section 8 standard) and GET (query string)
// Integrated with OSRM (foot, driving, bicycle) and Turf.js incident corridor exposure scoring
import { NextRequest, NextResponse } from 'next/server';
import { RouteCandidate, RouteScenario, RouteSource } from '@/lib/types';
import { getActiveIncidents } from '@/lib/repositories/store';
import { calculateRouteExposure } from '@/lib/geo/route-exposure';
import { RouteRequestSchema } from '@/lib/validations/schemas';
import { v4 as uuidv4 } from 'uuid';



const OSRM_HOST = 'https://router.project-osrm.org/route/v1';

const MODE_PROFILES: Record<string, string> = {
  walking: 'foot',
  driving: 'driving',
  cycling: 'bicycle',
};

async function fetchLiveOSRMRoutes(
  originLng: number,
  originLat: number,
  destLng: number,
  destLat: number,
  mode: string,
  alternatives: boolean = true
): Promise<RouteCandidate[]> {
  const profile = MODE_PROFILES[mode] || 'foot';
  const url = `${OSRM_HOST}/${profile}/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson&alternatives=${alternatives}`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(9000),
    headers: {
      'User-Agent': 'NagarMitraAI-UrbanRouter/1.0 (DYPCOE Hackathon)',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`OSRM endpoint returned HTTP ${response.status}`);
  }

  const data = await response.json();
  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error(data.message || 'No route found between given coordinates');
  }

  return data.routes.map(
    (
      r: { geometry: { coordinates: [number, number][] }; legs: Array<{ distance: number; duration: number }> },
      idx: number
    ) => ({
      id: uuidv4(),
      geometry: {
        type: 'LineString' as const,
        coordinates: r.geometry.coordinates,
      },
      distance: Math.round(r.legs[0].distance),
      duration: Math.round(r.legs[0].duration),
      source: 'live' as RouteSource,
      label: idx === 0 ? 'Fastest Route' : `Alternative Route ${idx}`,
      fetchedAt: new Date().toISOString(),
    })
  );
}

interface EvaluatedRouteCandidate extends RouteCandidate {
  totalExposureIndex?: number;
  affectedIncidents?: unknown[];
}

async function executeRouting(params: {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  mode: string;
  alternatives?: boolean;
  originName?: string;
  destName?: string;
}) {
  const { originLat, originLng, destLat, destLng, mode, alternatives = true, originName = 'Origin', destName = 'Destination' } = params;
  const activeIncidents = getActiveIncidents();

  let rawRoutes: RouteCandidate[] = [];
  let source: RouteSource = 'live';

  try {
    rawRoutes = await fetchLiveOSRMRoutes(originLng, originLat, destLng, destLat, mode, alternatives);
  } catch (osrmError: unknown) {
    const errorMsg = osrmError instanceof Error ? osrmError.message : String(osrmError);
    console.warn('OSRM live call failed, using fallback corridor:', errorMsg);

    // Fallback straight corridor representation labeled clearly as cached estimation
    rawRoutes = [
      {
        id: uuidv4(),
        geometry: {
          type: 'LineString',
          coordinates: [
            [originLng, originLat],
            [(originLng + destLng) / 2, (originLat + destLat) / 2],
            [destLng, destLat],
          ],
        },
        distance: Math.round(
          Math.sqrt(
            Math.pow((destLat - originLat) * 111000, 2) + Math.pow((destLng - originLng) * 111000, 2)
          )
        ),
        duration: Math.round(
          Math.sqrt(
            Math.pow((destLat - originLat) * 111000, 2) + Math.pow((destLng - originLng) * 111000, 2)
          ) / 1.4
        ),
        source: 'cached_osrm',
        label: 'Estimated Direct Corridor',
        fetchedAt: new Date().toISOString(),
      },
    ];
    source = 'cached_osrm';
  }

  // Evaluate evidence exposure for each route using Turf.js
  const evaluatedRoutes: EvaluatedRouteCandidate[] = rawRoutes.map((r, index) => {
    const exposure = calculateRouteExposure(r, activeIncidents);
    return {
      ...r,
      totalExposureIndex: exposure.totalExposureIndex,
      affectedIncidents: exposure.affectedIncidents,
      label:
        index === 0
          ? 'Fastest Route'
          : exposure.totalExposureIndex === 0
          ? 'Lower Reported Risk'
          : `Alternative Route ${index}`,
    };
  });

  if (evaluatedRoutes.length > 1) {
    const baseExposure = evaluatedRoutes[0].totalExposureIndex || 0;
    const altExposure = evaluatedRoutes[1].totalExposureIndex || 0;
    if (altExposure < baseExposure) {
      evaluatedRoutes[1].label = 'Lower Reported Risk';
    }
  }

  const scenario: RouteScenario = {
    id: `dyn-${originLat.toFixed(3)}-${destLat.toFixed(3)}`,
    originPlaceId: 'user-origin',
    destinationPlaceId: 'user-dest',
    originName,
    destinationName: destName,
    originCoords: [originLng, originLat],
    destinationCoords: [destLng, destLat],
    routes: evaluatedRoutes,
    isDemo: (source as string) === 'demo_fixture',
  };

  return { scenario, evaluatedRoutes, source };
}

// POST /api/routes — Section 8 Request Body Standard
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RouteRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid route request body', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { origin, destination, travelMode, alternatives } = parsed.data;
    const { scenario, evaluatedRoutes, source } = await executeRouting({
      originLat: origin.latitude,
      originLng: origin.longitude,
      destLat: destination.latitude,
      destLng: destination.longitude,
      mode: travelMode,
      alternatives,
      originName: origin.name,
      destName: destination.name,
    });

    const normalizedRoutes = evaluatedRoutes.map((r: EvaluatedRouteCandidate) => ({
      id: r.id,
      geometry: r.geometry,
      distanceMeters: r.distance,
      durationSeconds: r.duration,
      travelMode,
      source: r.source,
      label: r.label,
      isDemo: r.source === 'demo_fixture',
      exposureScore: r.totalExposureIndex || 0,
      affectedIncidents: r.affectedIncidents || [],
    }));

    return NextResponse.json({
      routes: normalizedRoutes,
      selectedRouteId: normalizedRoutes[0]?.id || null,
      scenario,
      travelMode,
      dataMode: source,
      count: normalizedRoutes.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('POST /api/routes exception:', err);
    return NextResponse.json(
      { error: 'Failed to calculate route', details: message },
      { status: 500 }
    );
  }
}

// GET /api/routes — Query String Support
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  try {
    const originLat = parseFloat(searchParams.get('originLat') || '18.5204');
    const originLng = parseFloat(searchParams.get('originLng') || '73.8420');
    const destLat = parseFloat(searchParams.get('destLat') || '18.5195');
    const destLng = parseFloat(searchParams.get('destLng') || '73.8554');
    const mode = searchParams.get('mode') || 'walking';
    const originName = searchParams.get('originName') || 'Origin';
    const destName = searchParams.get('destName') || 'Destination';

    const { scenario, evaluatedRoutes, source } = await executeRouting({
      originLat,
      originLng,
      destLat,
      destLng,
      mode,
      originName,
      destName,
    });

    return NextResponse.json({
      scenario,
      mode,
      dataMode: source,
      count: evaluatedRoutes.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'digest' in err &&
      typeof (err as { digest?: string }).digest === 'string' &&
      (err as { digest: string }).digest.startsWith('NEXT_')
    ) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('GET /api/routes exception:', err);
    return NextResponse.json(
      { error: 'Failed to calculate route', details: message },
      { status: 500 }
    );
  }
}
