// ============================================================
// CityPulse AI — AI Extraction: Schema & Validation
// ============================================================
import { z } from 'zod';

export const INCIDENT_TYPES = [
  'waterlogging',
  'road_damage',
  'temporary_obstruction',
  'traffic_disruption',
  'broken_streetlight',
  'accident_report',
  'cleanliness_issue',
  'other',
] as const;

export const AiExtractionSchema = z.object({
  incidentType: z.enum(INCIDENT_TYPES),
  summary: z.string().min(5).max(500),
  locationText: z.string().nullable(),
  observedAt: z.string().nullable(),
  severitySuggested: z.number().min(1).max(5).nullable(),
  uncertainties: z.array(z.string()),
  needsUserConfirmation: z.array(z.string()),
});

export const ReportSubmissionSchema = z.object({
  text: z.string().min(3, 'Report must be at least 3 characters').max(1000, 'Description exceeds 1000 characters'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  locationText: z.string().nullable().optional(),
  observedAt: z.string().nullable().optional(),
  reporterToken: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
});

export type AiExtractionInput = z.infer<typeof AiExtractionSchema>;
export type ReportSubmissionInput = z.infer<typeof ReportSubmissionSchema>;
