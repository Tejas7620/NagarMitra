// ============================================================
// CityPulse AI — Evidence Engine: Freshness Calculator
// ============================================================
import { FreshnessStatus, IncidentType } from '../types';

// Type-specific freshness windows (in hours)
const FRESHNESS_WINDOWS: Record<string, { recent: number; aging: number }> = {
  waterlogging:          { recent: 3,    aging: 12 },
  temporary_obstruction: { recent: 6,    aging: 24 },
  traffic_disruption:    { recent: 3,    aging: 12 },
  road_damage:           { recent: 168,  aging: 720 },  // 7 days, 30 days
  broken_streetlight:    { recent: 168,  aging: 720 },
  pothole:               { recent: 168,  aging: 720 },
  accident_report:       { recent: 2,    aging: 12 },
  cleanliness_issue:     { recent: 12,   aging: 48 },
  other:                 { recent: 6,    aging: 24 },
};

/**
 * Calculate freshness status for an incident based on its type and timestamps.
 */
export function calculateFreshness(
  incidentType: IncidentType,
  lastObservedAt: string | null,
  lastReportedAt: string,
  now?: Date
): FreshnessStatus {
  const referenceTime = lastObservedAt || lastReportedAt;
  if (!referenceTime) return 'unknown';

  const refDate = new Date(referenceTime);
  if (isNaN(refDate.getTime())) return 'unknown';

  const currentTime = now || new Date();
  const ageHours = (currentTime.getTime() - refDate.getTime()) / (1000 * 60 * 60);

  if (ageHours < 0) return 'unknown'; // Future timestamp

  const windows = FRESHNESS_WINDOWS[incidentType] || FRESHNESS_WINDOWS.other;

  if (ageHours <= windows.recent) return 'recent';
  if (ageHours <= windows.aging) return 'aging';
  return 'stale';
}

/**
 * Get freshness factor (0-1) for evidence scoring.
 * Recent = 1.0, Aging = 0.5, Stale = 0.1, Unknown = 0.2
 */
export function freshnessFactor(status: FreshnessStatus): number {
  switch (status) {
    case 'recent':  return 1.0;
    case 'aging':   return 0.5;
    case 'stale':   return 0.1;
    case 'unknown': return 0.2;
  }
}

/**
 * Get the freshness windows for a given incident type (for UI display).
 */
export function getFreshnessWindows(incidentType: IncidentType): { recent: number; aging: number } {
  return FRESHNESS_WINDOWS[incidentType] || FRESHNESS_WINDOWS.other;
}
