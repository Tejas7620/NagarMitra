// ============================================================
// POST /api/reports — Citizen Incident Report Submission Backend
// Validates text, enforces WGS84 coordinates, performs AI / NLP extraction,
// detects spatial/temporal duplicates, and commits to persistent store.
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { ReportSubmissionSchema } from '@/lib/validations/schemas';
import { extractIncidentData } from '@/lib/ai/extractor';
import { processNewReport } from '@/lib/repositories/store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input via strict Zod schema (3-1000 chars, WGS84 coordinates)
    const parseResult = ReportSubmissionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid report submission parameters',
            details: parseResult.error.flatten().fieldErrors,
          },
          dataMode: 'error',
        },
        { status: 400 }
      );
    }

    const input = parseResult.data;

    // Extract incident data using AI (Gemini) or deterministic heuristic fallback
    const { extraction, method } = await extractIncidentData(input.text);

    // Process the report (User-confirmed coordinates ALWAYS take precedence over text guesses)
    const result = processNewReport({
      rawText: input.text,
      incidentType: extraction.incidentType,
      summary: extraction.summary,
      latitude: input.latitude,      // User-confirmed
      longitude: input.longitude,    // User-confirmed
      locationText: input.locationText || extraction.locationText || null,
      observedAt: extraction.observedAt || input.observedAt || null,
      severity: extraction.severitySuggested,
      reporterToken: input.reporterToken || null,
      photoUrl: input.photoUrl || null,
      voiceTranscript: input.voiceTranscript || null,
      aiExtractionJson: extraction,
      extractionMethod: method,
    });

    return NextResponse.json({
      success: true,
      ...result,
      extractionMethod: method,
      dataMode: 'demo_local_storage',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Report submission failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'REPORT_SUBMISSION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error processing report',
        },
        dataMode: 'error',
      },
      { status: 500 }
    );
  }
}
