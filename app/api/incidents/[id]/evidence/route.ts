// ============================================================
// GET /api/incidents/[id]/evidence — Transparent Evidence Breakdown
// Returns: Support score factors, verification justification,
// freshness windows, linked reports, and heuristic explanations.
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { getIncidentById, getReportsByIncident } from '@/lib/repositories/store';
import { calculateSupportScore, verificationWeight } from '@/lib/evidence/support-score';
import { getFreshnessWindows, freshnessFactor } from '@/lib/evidence/freshness';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const incident = getIncidentById(id);

    if (!incident) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INCIDENT_NOT_FOUND',
            message: `Incident with ID "${id}" was not found`,
          },
        },
        { status: 404 }
      );
    }

    const linkedReports = getReportsByIncident(id);
    const scoreBreakdown = calculateSupportScore(incident);
    const freshnessWindows = getFreshnessWindows(incident.incidentType);

    const evidenceLedger = {
      incidentId: incident.id,
      incidentTitle: incident.title,
      incidentType: incident.incidentType,
      coordinates: {
        latitude: incident.latitude,
        longitude: incident.longitude,
      },
      verification: {
        status: incident.verificationStatus,
        weight: verificationWeight(incident.verificationStatus),
        authorityBacking: incident.verificationStatus === 'authority_confirmed',
        isCorroborated: incident.distinctSubmissionCount >= 2,
        explanation:
          incident.verificationStatus === 'authority_confirmed'
            ? 'Confirmed by official municipal or emergency agency'
            : incident.verificationStatus === 'corroborated'
            ? `Corroborated by ${incident.distinctSubmissionCount} independent submissions`
            : incident.verificationStatus === 'contested'
            ? 'Contested by conflicting citizen or authority reports'
            : 'Unverified initial citizen observation; awaiting corroboration',
      },
      freshness: {
        status: incident.freshnessStatus,
        factor: freshnessFactor(incident.freshnessStatus),
        windowsHours: freshnessWindows,
        firstObservedAt: incident.firstObservedAt,
        lastObservedAt: incident.lastObservedAt,
        lastReportedAt: incident.lastReportedAt,
      },
      supportScore: {
        score: scoreBreakdown.score,
        scale: '0.00 to 1.00 (transparent heuristic, not calibrated probability)',
        factors: scoreBreakdown.factors,
        reasons: scoreBreakdown.reasons,
      },
      reports: linkedReports.map((r) => ({
        id: r.id,
        submittedAt: r.submittedAt,
        observedAt: r.observedAt,
        sourceKind: r.sourceKind,
        sourceLabel: r.sourceLabel,
        locationText: r.locationText,
        hasPhoto: !!r.photoUrl,
        hasVoiceTranscript: !!r.voiceTranscript,
        aiExtraction: r.aiExtractionJson,
      })),
      isSimulated: incident.isSimulated,
    };

    return NextResponse.json({
      success: true,
      data: evidenceLedger,
      dataMode: incident.isSimulated ? 'demo' : 'live',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to retrieve evidence breakdown:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'An internal error occurred while fetching evidence breakdown',
        },
      },
      { status: 500 }
    );
  }
}
