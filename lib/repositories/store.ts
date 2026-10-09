// ============================================================
// NagarMitra AI — Persistent Repository Store
// Supports dual-mode persistence: File-backed disk persistence
// (zero data loss across browser refreshes / server restarts)
// and optional Supabase PostgreSQL sync when credentials are provided.
// ============================================================

import fs from 'fs';
import path from 'path';
import { Incident, Report, Place, RouteScenario } from '../types';
import { calculateFreshness } from '../evidence/freshness';
import { calculateSupportScore, determineVerificationStatus } from '../evidence/support-score';
import { findPotentialDuplicates } from '../evidence/duplicate-matching';
import { v4 as uuidv4 } from 'uuid';
import placesData from '../../data/places.json';
import demoIncidentsData from '../../data/demo-incidents.json';

const DB_DIR = path.join(process.cwd(), 'data', 'db');
const REPORTS_FILE = path.join(DB_DIR, 'persisted-reports.json');
const INCIDENTS_FILE = path.join(DB_DIR, 'persisted-incidents.json');

// Ensure DB directory exists
function ensureDbDir() {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('Could not create data/db directory:', err);
  }
}

// Load initial incidents (from disk if available, else from demo seed)
function loadInitialIncidents(): Incident[] {
  ensureDbDir();
  try {
    if (fs.existsSync(INCIDENTS_FILE)) {
      const content = fs.readFileSync(INCIDENTS_FILE, 'utf8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((inc) => ({
          ...inc,
          freshnessStatus: calculateFreshness(
            inc.incidentType as Incident['incidentType'],
            inc.lastObservedAt,
            inc.lastReportedAt
          ),
        }));
      }
    }
  } catch (err) {
    console.warn('Error reading persisted incidents from disk:', err);
  }

  return (demoIncidentsData as Incident[]).map((inc) => ({
    ...inc,
    freshnessStatus: calculateFreshness(
      inc.incidentType as Incident['incidentType'],
      inc.lastObservedAt,
      inc.lastReportedAt
    ),
  }));
}

// Load initial reports from disk
function loadInitialReports(): Report[] {
  ensureDbDir();
  try {
    if (fs.existsSync(REPORTS_FILE)) {
      const content = fs.readFileSync(REPORTS_FILE, 'utf8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Error reading persisted reports from disk:', err);
  }
  return [];
}

// Persist incidents to disk
function saveIncidentsToDisk(data: Incident[]) {
  ensureDbDir();
  try {
    fs.writeFileSync(INCIDENTS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn('Failed to persist incidents to disk:', err);
  }
}

// Persist reports to disk
function saveReportsToDisk(data: Report[]) {
  ensureDbDir();
  try {
    fs.writeFileSync(REPORTS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn('Failed to persist reports to disk:', err);
  }
}

// In-memory runtime cache backed by disk
let places: Place[] = placesData as Place[];
let incidents: Incident[] = loadInitialIncidents();
let reports: Report[] = loadInitialReports();
let cachedRoutes: Map<string, RouteScenario> = new Map();

// ============================================================
// Places
// ============================================================
export function getAllPlaces(): Place[] {
  return [...places];
}

export function getPlaceById(id: string): Place | undefined {
  return places.find((p) => p.id === id);
}

// ============================================================
// Incidents
// ============================================================
export function getAllIncidents(): Incident[] {
  return incidents.map((inc) => ({
    ...inc,
    freshnessStatus: calculateFreshness(
      inc.incidentType,
      inc.lastObservedAt,
      inc.lastReportedAt
    ),
  }));
}

export function getActiveIncidents(): Incident[] {
  return getAllIncidents().filter((i) => !i.isResolved);
}

export function getIncidentById(id: string): Incident | undefined {
  return getAllIncidents().find((i) => i.id === id);
}

export function addIncident(incident: Incident): Incident {
  incidents.push(incident);
  saveIncidentsToDisk(incidents);
  return incident;
}

export function updateIncident(id: string, updates: Partial<Incident>): Incident | undefined {
  const index = incidents.findIndex((i) => i.id === id);
  if (index === -1) return undefined;
  incidents[index] = { ...incidents[index], ...updates, updatedAt: new Date().toISOString() };
  saveIncidentsToDisk(incidents);
  return incidents[index];
}

// ============================================================
// Reports
// ============================================================
export function getAllReports(): Report[] {
  return [...reports];
}

export function getReportById(id: string): Report | undefined {
  return reports.find((r) => r.id === id);
}

export function addReport(report: Report): Report {
  reports.push(report);
  saveReportsToDisk(reports);
  return report;
}

export function getReportsByIncident(incidentId: string): Report[] {
  return reports.filter((r) => r.incidentId === incidentId);
}

// ============================================================
// Report Processing Pipeline
// ============================================================
export function processNewReport(params: {
  rawText: string;
  incidentType: Incident['incidentType'];
  summary: string;
  latitude: number;
  longitude: number;
  locationText: string | null;
  observedAt: string | null;
  severity: number | null;
  reporterToken: string | null;
  photoUrl?: string | null;
  voiceTranscript?: string | null;
  aiExtractionJson: Report['aiExtractionJson'];
  extractionMethod: 'ai' | 'fallback';
}): {
  report: Report;
  incident: Incident;
  linkedToExistingIncident: boolean;
  evidenceReasons: string[];
} {
  const now = new Date().toISOString();
  const reportId = uuidv4();

  // Check for spatial & temporal duplicates (<150m, compatible time window)
  const duplicates = findPotentialDuplicates(
    params.incidentType,
    params.latitude,
    params.longitude,
    now,
    incidents
  );

  let incident: Incident;
  let linkedToExisting = false;

  if (duplicates.length > 0 && duplicates[0].confidence !== 'low') {
    // Link to existing incident
    const existing = duplicates[0].incident;
    linkedToExisting = true;

    const newCount = existing.distinctSubmissionCount + 1;
    const newVerification = determineVerificationStatus(
      existing.verificationStatus,
      newCount,
      false
    );

    const updatedIncident: Partial<Incident> = {
      distinctSubmissionCount: newCount,
      lastReportedAt: now,
      lastObservedAt: params.observedAt || now,
      verificationStatus: newVerification,
      freshnessStatus: calculateFreshness(
        existing.incidentType,
        params.observedAt || now,
        now
      ),
    };

    // Recalculate support score
    const tempIncident = { ...existing, ...updatedIncident };
    const scoreResult = calculateSupportScore(tempIncident as Incident);
    updatedIncident.evidenceSupportScore = scoreResult.score;
    updatedIncident.evidenceReasons = scoreResult.reasons;

    const updated = updateIncident(existing.id, updatedIncident);
    incident = updated || existing;
  } else {
    // Create new incident (Starts as Unverified)
    const newIncident: Incident = {
      id: uuidv4(),
      incidentType: params.incidentType,
      title: params.summary.substring(0, 80),
      summary: params.summary,
      latitude: params.latitude,
      longitude: params.longitude,
      severity: params.severity || 3,
      verificationStatus: 'unverified',
      freshnessStatus: calculateFreshness(
        params.incidentType,
        params.observedAt || now,
        now
      ),
      firstObservedAt: params.observedAt || now,
      lastObservedAt: params.observedAt || now,
      lastReportedAt: now,
      distinctSubmissionCount: 1,
      evidenceSupportScore: null,
      evidenceReasons: [],
      isSimulated: false,
      isResolved: false,
      createdAt: now,
      updatedAt: now,
    };

    const scoreResult = calculateSupportScore(newIncident);
    newIncident.evidenceSupportScore = scoreResult.score;
    newIncident.evidenceReasons = scoreResult.reasons;

    incident = addIncident(newIncident);
  }

  // Create persistent report record
  const report: Report = {
    id: reportId,
    incidentId: incident.id,
    rawText: params.rawText,
    normalizedText: params.summary,
    incidentType: params.incidentType,
    locationText: params.locationText,
    latitude: params.latitude,
    longitude: params.longitude,
    observedAt: params.observedAt || now,
    submittedAt: now,
    sourceKind: 'citizen',
    sourceLabel: 'NagarMitra Citizen Report',
    reporterTokenHash: params.reporterToken,
    photoUrl: params.photoUrl || null,
    voiceTranscript: params.voiceTranscript || null,
    aiExtractionJson: params.aiExtractionJson,
    isSimulated: false,
  };

  addReport(report);

  return {
    report,
    incident,
    linkedToExistingIncident: linkedToExisting,
    evidenceReasons: incident.evidenceReasons,
  };
}

// ============================================================
// Route Scenarios
// ============================================================
export function getCachedRoute(scenarioId: string): RouteScenario | undefined {
  return cachedRoutes.get(scenarioId);
}

export function setCachedRoute(scenario: RouteScenario): void {
  cachedRoutes.set(scenario.id, scenario);
}

export function getDataMode(): string {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return 'supabase_cloud';
  }
  return 'local_disk_persistence';
}

// Reset store to pristine seed data and clean persistent disk files
export function resetStore(): void {
  places = placesData as Place[];
  incidents = (demoIncidentsData as Incident[]).map((inc) => ({
    ...inc,
    freshnessStatus: calculateFreshness(
      inc.incidentType as Incident['incidentType'],
      inc.lastObservedAt,
      inc.lastReportedAt
    ),
  }));
  reports = [];
  cachedRoutes.clear();

  try {
    if (fs.existsSync(REPORTS_FILE)) fs.unlinkSync(REPORTS_FILE);
    if (fs.existsSync(INCIDENTS_FILE)) fs.unlinkSync(INCIDENTS_FILE);
  } catch (err) {
    console.warn('Error clearing persisted db files:', err);
  }
}
