// ============================================================
// POST /api/impact-replay — Dynamic Incident Impact Replay Backend
// Evaluates before/after exposure, route recommendation shifts,
// and transparent explanations using Turf.js route-corridor geometry.
// Supports both Section 13 contract and existing frontend schema.
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { getActiveIncidents, getIncidentById, getCachedRoute, setCachedRoute } from '@/lib/repositories/store';
import { calculateRouteExposure, compareRouteExposures, selectRecommendedRoute } from '@/lib/geo/route-exposure';
import { ImpactReplaySchema } from '@/lib/validations/schemas';
import { RouteCandidate, RouteScenario, RouteSource } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

const OSRM_HOST = 'https://router.project-osrm.org/route/v1';

async function fetchRoutes(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  travelMode: string
): Promise<RouteCandidate[]> {
  const profile = travelMode === 'driving' ? 'driving' : travelMode === 'cycling' ? 'bicycle' : 'foot';
  const url = `${OSRM_HOST}/${profile}/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson&alternatives=true`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'NagarMitraAI-ImpactReplay/1.0', Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && data.routes?.length > 0) {
        return data.routes.map((r: any, idx: number) => ({
          id: uuidv4(),
          geometry: {
            type: 'LineString' as const,
            coordinates: r.geometry.coordinates as [number, number][],
          },
          distance: Math.round(r.legs[0].distance),
          duration: Math.round(r.legs[0].duration),
          source: 'live' as RouteSource,
          label: idx === 0 ? 'Fastest Route' : `Alternative Route ${idx}`,
          fetchedAt: new Date().toISOString(),
        }));
      }
    }
  } catch (err) {
    console.warn('Live OSRM fetch in impact replay failed, using fallback corridor:', err);
  }

  // Fallback direct geometry
  return [
    {
      id: uuidv4(),
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [originLng, originLat],
          [(originLng + destLng) / 2, (originLat + destLat) / 2],
          [destLng, destLat],
        ],
      },
      distance: Math.round(Math.hypot((destLat - originLat) * 111000, (destLng - originLng) * 111000)),
      duration: Math.round(Math.hypot((destLat - originLat) * 111000, (destLng - originLng) * 111000) / 1.4),
      source: 'cached_osrm' as RouteSource,
      label: 'Direct Corridor',
      fetchedAt: new Date().toISOString(),
    },
  ];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = ImpactReplaySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid impact replay parameters',
            details: parseResult.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const { scenarioId, incidentId, origin, destination, travelMode = 'walking', baselineRouteId } =
      parseResult.data;

    // 1. Retrieve the trigger incident
    const triggerIncident = getIncidentById(incidentId);
    if (!triggerIncident) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INCIDENT_NOT_FOUND',
            message: `Incident with ID "${incidentId}" was not found`,
          },
        },
        { status: 404 }
      );
    }

    // 2. Retrieve or calculate the route scenario
    let routes: RouteCandidate[] = [];
    let scenario: RouteScenario | undefined = scenarioId ? getCachedRoute(scenarioId) : undefined;

    if (scenario && scenario.routes.length > 0) {
      routes = scenario.routes;
    } else if (origin && destination) {
      routes = await fetchRoutes(
        origin.latitude,
        origin.longitude,
        destination.latitude,
        destination.longitude,
        travelMode
      );
      scenario = {
        id: scenarioId || `scenario-${Date.now()}`,
        originPlaceId: 'origin',
        destinationPlaceId: 'destination',
        originName: 'Selected Origin',
        destinationName: 'Selected Destination',
        originCoords: [origin.longitude, origin.latitude],
        destinationCoords: [destination.longitude, destination.latitude],
        routes,
        isDemo: routes[0]?.source !== 'live',
      };
      setCachedRoute(scenario);
    } else {
      // Default fallback scenario using Pune core landmarks
      routes = await fetchRoutes(18.5204, 73.8567, 18.5162, 73.8568, 'walking');
      scenario = {
        id: scenarioId || 'scenario-default',
        originPlaceId: 'origin-core',
        destinationPlaceId: 'dest-core',
        originName: 'City Center',
        destinationName: 'Dagdusheth Temple',
        originCoords: [73.8567, 18.5204],
        destinationCoords: [73.8568, 18.5162],
        routes,
        isDemo: false,
      };
      setCachedRoute(scenario);
    }

    const allIncidents = getActiveIncidents();

    // Baseline: without the trigger incident
    const baselineIncidents = allIncidents.filter((i) => i.id !== incidentId);
    // Updated: with the trigger incident
    const updatedIncidents = allIncidents;

    // Calculate exposures
    const baselineExposures = compareRouteExposures(routes, baselineIncidents);
    const updatedExposures = compareRouteExposures(routes, updatedIncidents);

    // Selected routes
    const baselineRec = selectRecommendedRoute(baselineExposures, routes);
    const updatedRec = selectRecommendedRoute(updatedExposures, routes);

    const changed = baselineRec.routeId !== updatedRec.routeId;

    const baselineRouteObj = routes.find((r) => r.id === (baselineRouteId || baselineRec.routeId)) || routes[0];
    const updatedRouteObj = routes.find((r) => r.id === updatedRec.routeId) || routes[0];

    const baselineExposureScore =
      baselineExposures.find((e) => e.routeId === baselineRouteObj.id)?.totalExposureIndex ?? 0;
    const updatedExposureScore =
      updatedExposures.find((e) => e.routeId === updatedRouteObj.id)?.totalExposureIndex ?? 0;

    // Explanations
    let changeExplanation: string;
    let affectedSegmentDescription: string | null = null;

    if (changed) {
      changeExplanation = `The newly reported "${triggerIncident.incidentType.replace(/_/g, ' ')}" ` +
        `(${triggerIncident.title}) affects the previously recommended route. ` +
        `The recommendation changed from "${baselineRouteObj.label}" to "${updatedRouteObj.label}". ` +
        `Reason: ${updatedRec.reason}. ` +
        `This recommendation is based on reported observations and indicates lower reported risk, not guaranteed safety.`;

      const affectedInUpdated = updatedExposures.find((e) => e.routeId === baselineRouteObj.id);
      const affectedIncident = affectedInUpdated?.affectedIncidents.find((ai) => ai.incidentId === incidentId);
      if (affectedIncident) {
        affectedSegmentDescription = `Incident is ~${affectedIncident.distanceToRoute}m from the baseline route corridor`;
      }
    } else {
      const affectedOnAnyRoute = updatedExposures.some((e) =>
        e.affectedIncidents.some((ai) => ai.incidentId === incidentId)
      );

      if (!affectedOnAnyRoute) {
        changeExplanation = `The reported "${triggerIncident.incidentType.replace(/_/g, ' ')}" ` +
          `is located outside the route buffer (100m). Route recommendation remains unchanged.`;
      } else {
        changeExplanation = `The reported "${triggerIncident.incidentType.replace(/_/g, ' ')}" ` +
          `was evaluated against candidate routes but does not warrant changing recommendation. ` +
          `The existing route recommendation remains: ${updatedRec.reason}.`;

        const anyAffected = updatedExposures
          .flatMap((e) => e.affectedIncidents)
          .find((ai) => ai.incidentId === incidentId);
        if (anyAffected) {
          affectedSegmentDescription = `Incident is ${anyAffected.distanceToRoute}m from route corridor`;
        }
      }
    }

    const supportingIncidentIds = updatedExposures
      .flatMap((e) => e.affectedIncidents.map((ai) => ai.incidentId))
      .filter((val, idx, self) => self.indexOf(val) === idx);

    return NextResponse.json({
      success: true,
      // Section 13 Standard Envelope
      before: {
        routeId: baselineRouteObj.id,
        routeLabel: baselineRouteObj.label,
        distanceMeters: baselineRouteObj.distance,
        durationSeconds: baselineRouteObj.duration,
        reportedExposure: baselineExposureScore,
      },
      after: {
        routeId: updatedRouteObj.id,
        routeLabel: updatedRouteObj.label,
        distanceMeters: updatedRouteObj.distance,
        durationSeconds: updatedRouteObj.duration,
        reportedExposure: updatedExposureScore,
      },
      changed,
      reason: changeExplanation,
      supportingIncidentIds,
      dataMode: routes[0]?.source === 'live' ? 'live' : 'cached_osrm',

      // Frontend compatibility fields
      scenarioId: scenario?.id,
      triggerIncidentId: incidentId,
      baseline: {
        recommendedRouteId: baselineRec.routeId,
        routeLabel: baselineRouteObj.label,
        exposure: baselineExposures,
      },
      updated: {
        recommendedRouteId: updatedRec.routeId,
        routeLabel: updatedRouteObj.label,
        exposure: updatedExposures,
      },
      changeExplanation,
      affectedSegmentDescription,
      timeDifferenceSeconds: updatedRouteObj.duration - baselineRouteObj.duration,
      distanceDifferenceMeters: updatedRouteObj.distance - baselineRouteObj.distance,
      isEstimated: routes[0]?.source !== 'live',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Impact replay failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'IMPACT_REPLAY_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error during impact replay',
        },
      },
      { status: 500 }
    );
  }
}
