// ============================================================
// NagarMitra AI — Evidence Engine: Verification Logic
// ============================================================
import { VerificationStatus } from '../types';

export const VERIFICATION_STATES: VerificationStatus[] = [
  'unverified',
  'corroborated',
  'authority_confirmed',
  'contested',
];

/**
 * Determine verification status based on submission count and authority backing.
 * All citizen submissions start as unverified.
 * When distinct compatible submissions >= 2, status transitions to corroborated.
 * Only recognized official/authority sources can promote to authority_confirmed.
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

/**
 * Verification weighting factor used in route exposure and evidence support (0.0 to 1.0).
 */
export function verificationWeight(status: VerificationStatus): number {
  switch (status) {
    case 'authority_confirmed': return 1.0;
    case 'corroborated':        return 0.7;
    case 'unverified':          return 0.3;
    case 'contested':           return 0.15;
    default:                    return 0.3;
  }
}
