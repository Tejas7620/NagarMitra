// ============================================================
// GET /api/reports/[id] — Retrieve single report by ID
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { getReportById, getIncidentById } from '@/lib/repositories/store';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const report = getReportById(id);

    if (!report) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'REPORT_NOT_FOUND',
            message: `Report with ID "${id}" was not found`,
          },
        },
        { status: 404 }
      );
    }

    const linkedIncident = getIncidentById(report.incidentId);

    return NextResponse.json({
      success: true,
      report,
      incident: linkedIncident || null,
      dataMode: report.isSimulated ? 'demo' : 'live',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to retrieve report:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'An internal error occurred while fetching the report',
        },
      },
      { status: 500 }
    );
  }
}
