// ============================================================
// CityPulse AI — Evidence Engine: Duplicate Matching
// ============================================================
import { Incident, IncidentType } from '../types';

const MATCH_RADIUS_METERS = 150;

// Time windows for duplicate matching (in hours)
const DUPLICATE_TIME_WINDOWS: Record<string, number> = {
  waterlogging:          12,
  temporary_obstruction: 48,
  traffic_disruption:    6,
  road_damage:           720, // 30 days
  broken_streetlight:    720,
  accident_report:       6,
  cleanliness_issue:     48,
  other:                 24,
};

/**
 * Haversine distance in metres between two lat/lng points.
 */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // Earth radius in metres
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Check if two incident types are compatible for duplicate matching.
 */
function areTypesCompatible(type1: IncidentType, type2: IncidentType): boolean {
  if (type1 === type2) return true;
  // Road damage and pothole are compatible
  const roadGroup = ['road_damage'];
  if (roadGroup.includes(type1) && roadGroup.includes(type2)) return true;
  return false;
}

export interface DuplicateMatch {
  incident: Incident;
  distance: number;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

/**
 * Find potential duplicate incidents for a new report.
 */
export function findPotentialDuplicates(
  incidentType: IncidentType,
  latitude: number,
  longitude: number,
  reportedAt: string,
  existingIncidents: Incident[]
): DuplicateMatch[] {
  const reportTime = new Date(reportedAt);
  const timeWindow = (DUPLICATE_TIME_WINDOWS[incidentType] || 24) * 60 * 60 * 1000;

  const matches: DuplicateMatch[] = [];

  for (const incident of existingIncidents) {
    if (incident.isResolved) continue;
    if (!areTypesCompatible(incidentType, incident.incidentType)) continue;

    const distance = haversineDistance(latitude, longitude, incident.latitude, incident.longitude);
    if (distance > MATCH_RADIUS_METERS) continue;

    const lastTime = new Date(incident.lastReportedAt);
    const timeDiff = Math.abs(reportTime.getTime() - lastTime.getTime());
    if (timeDiff > timeWindow) continue;

    const confidence = distance <= 50 ? 'high' : distance <= 100 ? 'medium' : 'low';
    const reason = `Same type "${incidentType}" within ${Math.round(distance)}m and ${Math.round(timeDiff / 3600000)}h`;

    matches.push({ incident, distance, confidence, reason });
  }

  return matches.sort((a, b) => a.distance - b.distance);
}
