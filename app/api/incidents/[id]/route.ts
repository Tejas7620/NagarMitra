// ============================================================
// GET /api/incidents/[id] — Retrieve single incident by ID
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { getIncidentById, getReportsByIncident } from '@/lib/repositories/store';

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

    return NextResponse.json({
      success: true,
      incident,
      linkedReportsCount: linkedReports.length,
      dataMode: incident.isSimulated ? 'demo' : 'live',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to retrieve incident:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'An internal error occurred while fetching the incident',
        },
      },
      { status: 500 }
    );
  }
}
