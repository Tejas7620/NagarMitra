// ============================================================
// CityPulse AI — Geo: Route Exposure Calculator
// ============================================================
import * as turf from '@turf/turf';
import { Incident, RouteCandidate, RouteExposureResult, AffectedIncident } from '../types';
import { freshnessFactor } from '../evidence/freshness';
import { verificationWeight } from '../evidence/support-score';

const BUFFER_DISTANCE_METERS = 100;

/**
 * Calculate proximity factor based on distance to route.
 * ≤25m: 1.0, 25–50m: 0.7, 50–100m: 0.3, >100m: 0
 */
function proximityFactor(distanceMeters: number): number {
  if (distanceMeters <= 25) return 1.0;
  if (distanceMeters <= 50) return 0.7;
  if (distanceMeters <= 100) return 0.3;
  return 0;
}

/**
 * Severity factor (1-5 scale → 0-1)
 */
function severityFactor(severity: number | null): number {
  if (!severity) return 0.3; // unknown
  return Math.min(severity / 5, 1.0);
}

/**
 * Calculate the shortest distance in metres from a point to a route geometry.
 */
function pointToRouteDistance(
  lat: number, lng: number,
  routeCoordinates: [number, number][]
): number {
  const point = turf.point([lng, lat]);
  const line = turf.lineString(routeCoordinates);
  const distance = turf.pointToLineDistance(point, line, { units: 'meters' });
  return distance;
}

/**
 * Calculate route exposure for a single route against all incidents.
 */
export function calculateRouteExposure(
  route: RouteCandidate,
  incidents: Incident[]
): RouteExposureResult {
  const affectedIncidents: AffectedIncident[] = [];

  for (const incident of incidents) {
    if (incident.isResolved) continue;

    const distance = pointToRouteDistance(
      incident.latitude,
      incident.longitude,
      route.geometry.coordinates
    );

    if (distance > BUFFER_DISTANCE_METERS) continue;

    const pf = proximityFactor(distance);
    const sf = severityFactor(incident.severity);
    const ff = freshnessFactor(incident.freshnessStatus);
    const vw = verificationWeight(incident.verificationStatus);

    // Conservative multiplication
    const contribution = pf * sf * ff * vw;

    const parts: string[] = [];
    if (distance <= 25) parts.push(`very close (${Math.round(distance)}m)`);
    else if (distance <= 50) parts.push(`close (${Math.round(distance)}m)`);
    else parts.push(`nearby (${Math.round(distance)}m)`);

    parts.push(`${incident.freshnessStatus} ${incident.incidentType}`);
    parts.push(`verification: ${incident.verificationStatus}`);

    affectedIncidents.push({
      incidentId: incident.id,
      incidentTitle: incident.title,
      incidentType: incident.incidentType,
      distanceToRoute: Math.round(distance),
      proximityFactor: pf,
      severityFactor: sf,
      freshnessFactor: ff,
      verificationWeight: vw,
      contributionScore: Math.round(contribution * 100) / 100,
      explanation: parts.join('; '),
    });
  }

  const totalExposureIndex = affectedIncidents.reduce(
    (sum, ai) => sum + ai.contributionScore,
    0
  );

  return {
    routeId: route.id,
    routeLabel: route.label,
    totalExposureIndex: Math.round(totalExposureIndex * 100) / 100,
    affectedIncidents: affectedIncidents.sort((a, b) => b.contributionScore - a.contributionScore),
  };
}

/**
 * Calculate and compare route exposures for all candidates.
 */
export function compareRouteExposures(
  routes: RouteCandidate[],
  incidents: Incident[]
): RouteExposureResult[] {
  return routes.map(route => calculateRouteExposure(route, incidents));
}

/**
 * Determine which route has lower reported risk.
 */
export function selectRecommendedRoute(
  exposures: RouteExposureResult[],
  routes: RouteCandidate[]
): { routeId: string; reason: string } {
  if (exposures.length === 0) {
    return { routeId: '', reason: 'No routes available' };
  }

  if (exposures.length === 1) {
    return {
      routeId: exposures[0].routeId,
      reason: 'Only one route available',
    };
  }

  // Sort by exposure (lower is better)
  const sorted = [...exposures].sort((a, b) => a.totalExposureIndex - b.totalExposureIndex);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  const bestRoute = routes.find(r => r.id === best.routeId);
  const worstRoute = routes.find(r => r.id === worst.routeId);

  if (best.totalExposureIndex === worst.totalExposureIndex) {
    // Same exposure — prefer faster route
    const fastest = routes.reduce((a, b) => a.duration < b.duration ? a : b);
    return {
      routeId: fastest.id,
      reason: 'Similar reported exposure; selecting the fastest route',
    };
  }

  const timeDiff = bestRoute && worstRoute
    ? Math.round(bestRoute.duration - worstRoute.duration)
    : null;

  let reason = `Lower reported exposure (${best.totalExposureIndex} vs ${worst.totalExposureIndex})`;
  if (timeDiff && timeDiff > 0) {
    reason += ` with ~${Math.round(timeDiff / 60)} min additional travel time`;
  }

  return { routeId: best.routeId, reason };
}
