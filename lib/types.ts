// ============================================================
// CityPulse AI — Core Type Definitions
// ============================================================

export type VerificationStatus = 'unverified' | 'corroborated' | 'authority_confirmed' | 'contested';
export type FreshnessStatus = 'recent' | 'aging' | 'stale' | 'unknown';
export type IncidentType =
  | 'waterlogging'
  | 'road_damage'
  | 'temporary_obstruction'
  | 'traffic_disruption'
  | 'broken_streetlight'
  | 'accident_report'
  | 'cleanliness_issue'
  | 'other';
export type SourceKind = 'citizen' | 'authority' | 'seed_demo';
export type AccessibilityStatus = 'known' | 'limited' | 'unknown';
export type RouteSource = 'live' | 'cached_osrm' | 'demo_fixture';

// ============================================================
// Places
// ============================================================
export interface Place {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  shortDescription: string | null;
  priceBand: number | null;
  rating: number | null;
  ratingSource: string | null;
  accessibilityStatus: AccessibilityStatus;
  cleanlinessValue: number | null;
  cleanlinessSource: string | null;
  sourceUrl: string | null;
  isDemo: boolean;
  tags: string[];
}

// ============================================================
// Incidents
// ============================================================
export interface Incident {
  id: string;
  incidentType: IncidentType;
  title: string;
  summary: string;
  latitude: number;
  longitude: number;
  severity: number | null;
  verificationStatus: VerificationStatus;
  freshnessStatus: FreshnessStatus;
  firstObservedAt: string | null;
  lastObservedAt: string | null;
  lastReportedAt: string;
  distinctSubmissionCount: number;
  evidenceSupportScore: number | null;
  evidenceReasons: string[];
  isSimulated: boolean;
  isResolved: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================
// Reports
// ============================================================
export interface Report {
  id: string;
  incidentId: string;
  rawText: string;
  normalizedText: string | null;
  incidentType: IncidentType;
  locationText: string | null;
  latitude: number;
  longitude: number;
  observedAt: string | null;
  submittedAt: string;
  sourceKind: SourceKind;
  sourceLabel: string | null;
  reporterTokenHash: string | null;
  photoUrl: string | null;
  voiceTranscript: string | null;
  aiExtractionJson: AiExtraction | null;
  isSimulated: boolean;
}

// ============================================================
// AI Extraction
// ============================================================
export interface AiExtraction {
  incidentType: IncidentType;
  summary: string;
  locationText: string | null;
  observedAt: string | null;
  severitySuggested: number | null;
  uncertainties: string[];
  needsUserConfirmation: string[];
}

// ============================================================
// Routes
// ============================================================
export interface RouteGeometry {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface RouteCandidate {
  id: string;
  geometry: RouteGeometry;
  distance: number; // metres
  duration: number; // seconds
  source: RouteSource;
  label: string;
  fetchedAt: string;
}

export interface RouteScenario {
  id: string;
  originPlaceId: string;
  destinationPlaceId: string;
  originName: string;
  destinationName: string;
  originCoords: [number, number]; // [lng, lat]
  destinationCoords: [number, number];
  routes: RouteCandidate[];
  isDemo: boolean;
}

// ============================================================
// Evidence / Impact Replay
// ============================================================
export interface RouteExposureResult {
  routeId: string;
  routeLabel: string;
  totalExposureIndex: number;
  affectedIncidents: AffectedIncident[];
}

export interface AffectedIncident {
  incidentId: string;
  incidentTitle: string;
  incidentType: IncidentType;
  distanceToRoute: number; // metres
  proximityFactor: number;
  severityFactor: number;
  freshnessFactor: number;
  verificationWeight: number;
  contributionScore: number;
  explanation: string;
}

export interface ImpactReplayResult {
  scenarioId: string;
  triggerIncidentId: string;
  baseline: {
    recommendedRouteId: string;
    routeLabel: string;
    exposure: RouteExposureResult[];
  };
  updated: {
    recommendedRouteId: string;
    routeLabel: string;
    exposure: RouteExposureResult[];
  };
  changed: boolean;
  changeExplanation: string;
  affectedSegmentDescription: string | null;
  timeDifferenceSeconds: number | null;
  distanceDifferenceMeters: number | null;
  isEstimated: boolean;
  dataMode: string;
}

// ============================================================
// API Response Types
// ============================================================
export interface ApiResponse<T> {
  data: T;
  dataMode: string;
  timestamp: string;
}

export interface ReportSubmission {
  text: string;
  latitude: number;
  longitude: number;
  locationText: string | null;
  observedAt: string | null;
  reporterToken: string | null;
  photoUrl: string | null;
  voiceTranscript?: string | null;
}

export interface ReportResponse {
  report: Report;
  incident: Incident;
  linkedToExistingIncident: boolean;
  evidenceReasons: string[];
  dataMode: string;
}
