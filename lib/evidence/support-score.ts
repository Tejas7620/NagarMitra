// ============================================================
// CityPulse AI — Evidence Engine: Support Score & Status
// ============================================================
import { Incident, VerificationStatus } from '../types';
import { freshnessFactor } from './freshness';

/**
 * Calculate evidence support score (heuristic, not a probability).
 * Combines freshness, source type, submission count, and verification.
 */
export function calculateSupportScore(incident: Incident): {
  score: number;
  factors: { name: string; value: number; weight: number; explanation: string }[];
  reasons: string[];
} {
  const factors: { name: string; value: number; weight: number; explanation: string }[] = [];
  const reasons: string[] = [];

  // Freshness factor (weight: 0.3)
  const ff = freshnessFactor(incident.freshnessStatus);
  factors.push({
    name: 'freshness',
    value: ff,
    weight: 0.3,
    explanation: `Freshness status: ${incident.freshnessStatus} (factor: ${ff})`
  });
  if (ff >= 0.8) reasons.push('recent_observation');
  else if (ff >= 0.4) reasons.push('aging_observation');
  else reasons.push('stale_observation');

  // Submission count factor (weight: 0.25)
  const count = incident.distinctSubmissionCount;
  const countFactor = Math.min(count / 5, 1.0); // Cap at 5 submissions
  factors.push({
    name: 'submission_count',
    value: countFactor,
    weight: 0.25,
    explanation: `${count} distinct submission(s) (factor: ${countFactor.toFixed(2)})`
  });
  if (count === 1) reasons.push('single_submission');
  else if (count >= 2) reasons.push('multiple_compatible_submissions');
  if (count >= 4) reasons.push('high_submission_count');

  // Verification weight (weight: 0.25)
  const vw = verificationWeight(incident.verificationStatus);
  factors.push({
    name: 'verification',
    value: vw,
    weight: 0.25,
    explanation: `Verification: ${incident.verificationStatus} (weight: ${vw})`
  });
  if (incident.verificationStatus === 'corroborated') reasons.push('second_compatible_submission');
  if (incident.verificationStatus === 'authority_confirmed') reasons.push('authority_confirmation');

  // Severity factor (weight: 0.2)
  const sev = incident.severity ? Math.min(incident.severity / 5, 1.0) : 0.3;
  factors.push({
    name: 'severity',
    value: sev,
    weight: 0.2,
    explanation: `Severity: ${incident.severity ?? 'unknown'}/5 (factor: ${sev.toFixed(2)})`
  });
  if (sev >= 0.8) reasons.push('high_severity_reported');
  else if (sev <= 0.2) reasons.push('low_severity');

  // Calculate weighted score
  const score = factors.reduce((sum, f) => sum + f.value * f.weight, 0);

  // Add location reasons
  reasons.push('location_confirmed_by_user');

  return { score: Math.round(score * 100) / 100, factors, reasons };
}

/**
 * Get verification weight (0-1).
 */
export function verificationWeight(status: VerificationStatus): number {
  switch (status) {
    case 'authority_confirmed': return 1.0;
    case 'corroborated':        return 0.7;
    case 'unverified':          return 0.3;
    case 'contested':           return 0.15;
  }
}

/**
 * Determine verification status based on submission count and source.
 */
export function determineVerificationStatus(
  currentStatus: VerificationStatus,
  distinctSubmissionCount: number,
  hasAuthoritySource: boolean
): VerificationStatus {
  if (hasAuthoritySource) return 'authority_confirmed';
  if (distinctSubmissionCount >= 2 && currentStatus !== 'contested') return 'corroborated';
  return currentStatus === 'contested' ? 'contested' : 'unverified';
}
