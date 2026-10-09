// ============================================================
// POST /api/places/compare — Place Comparison Backend
// Evaluates places across affordability, ratings, accessibility,
// cleanliness, and proximity to reported incidents with transparent weights.
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { PlaceCompareSchema } from '@/lib/validations/schemas';
import { getAllPlaces, getActiveIncidents } from '@/lib/repositories/store';
import { haversineDistance } from '@/lib/evidence/duplicate-matching';
import { Place } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = PlaceCompareSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid comparison parameters',
            details: parseResult.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const { placeIds, preferences, origin } = parseResult.data;
    const allPlaces = getAllPlaces();
    const activeIncidents = getActiveIncidents();

    const matchedPlaces: Place[] = [];
    const missingIds: string[] = [];

    for (const pid of placeIds) {
      const found = allPlaces.find((p) => p.id === pid);
      if (found) {
        matchedPlaces.push(found);
      } else {
        missingIds.push(pid);
      }
    }

    if (matchedPlaces.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INSUFFICIENT_PLACES',
            message: `At least 2 valid places required. Found ${matchedPlaces.length}. Missing: ${missingIds.join(', ')}`,
          },
        },
        { status: 400 }
      );
    }

    const budgetWeight = preferences?.budgetWeight ?? 0.5;
    const distanceWeight = preferences?.distanceWeight ?? 0.5;
    const reportWeight = preferences?.reportWeight ?? 0.5;

    // Evaluate each place
    const evaluatedPlaces = matchedPlaces.map((place) => {
      // Proximity to origin
      let distanceMeters: number | null = null;
      if (origin) {
        distanceMeters = Math.round(
          haversineDistance(origin.latitude, origin.longitude, place.latitude, place.longitude)
        );
      }

      // Nearby incidents within 500m
      const nearbyIncidents = activeIncidents.filter((inc) => {
        const d = haversineDistance(place.latitude, place.longitude, inc.latitude, inc.longitude);
        return d <= 500;
      });

      // Calculate composite score (0-100)
      let score = 50; // base score
      const explanations: string[] = [];
      const missingDisclosures: string[] = [];

      // Rating (if available)
      if (place.rating !== null) {
        const ratingNorm = (place.rating / 5) * 20; // up to 20 pts
        score += ratingNorm;
        explanations.push(`Rating ${place.rating}/5 adds +${ratingNorm.toFixed(1)} pts`);
      } else {
        missingDisclosures.push('Rating not available in current dataset');
      }

      // Affordability (priceBand: 1 = cheaper/higher score)
      if (place.priceBand !== null) {
        const budgetNorm = (4 - place.priceBand) * 5 * budgetWeight;
        score += budgetNorm;
        explanations.push(`Price tier ${place.priceBand}/3 adds +${budgetNorm.toFixed(1)} pts`);
      } else {
        missingDisclosures.push('Price band not reported');
      }

      // Distance penalty (if origin provided)
      if (distanceMeters !== null) {
        const km = distanceMeters / 1000;
        const distPenalty = Math.min(km * 2 * distanceWeight, 20);
        score -= distPenalty;
        explanations.push(`${km.toFixed(1)} km distance penalty: -${distPenalty.toFixed(1)} pts`);
      }

      // Incident impact
      if (nearbyIncidents.length > 0) {
        const incidentPenalty = Math.min(nearbyIncidents.length * 8 * reportWeight, 25);
        score -= incidentPenalty;
        explanations.push(
          `${nearbyIncidents.length} nearby active incident(s) within 500m: -${incidentPenalty.toFixed(1)} pts`
        );
      } else {
        explanations.push('No nearby active citizen reports within 500m');
      }

      // Accessibility
      if (place.accessibilityStatus === 'known') {
        score += 5;
        explanations.push('Verified wheelchair accessible (+5 pts)');
      } else if (place.accessibilityStatus === 'unknown') {
        missingDisclosures.push('Accessibility status unknown');
      }

      // Cleanliness
      if (place.cleanlinessValue !== null) {
        const cleanNorm = (place.cleanlinessValue / 5) * 5;
        score += cleanNorm;
        explanations.push(`Cleanliness rating ${place.cleanlinessValue}/5 (+${cleanNorm.toFixed(1)} pts)`);
      } else {
        missingDisclosures.push('Cleanliness rating not recorded');
      }

      const finalScore = Math.max(0, Math.min(100, Math.round(score)));

      return {
        placeId: place.id,
        name: place.name,
        category: place.category,
        coordinates: {
          latitude: place.latitude,
          longitude: place.longitude,
        },
        criteria: {
          rating: place.rating,
          ratingSource: place.ratingSource,
          priceBand: place.priceBand,
          accessibilityStatus: place.accessibilityStatus,
          cleanlinessValue: place.cleanlinessValue,
          cleanlinessSource: place.cleanlinessSource,
          distanceMeters,
          nearbyIncidentCount: nearbyIncidents.length,
          nearbyIncidentIds: nearbyIncidents.map((i) => i.id),
        },
        score: finalScore,
        explanations,
        missingDisclosures,
      };
    });

    // Rank from highest to lowest score
    evaluatedPlaces.sort((a, b) => b.score - a.score);

    const rankings = evaluatedPlaces.map((ep, idx) => ({
      rank: idx + 1,
      ...ep,
    }));

    return NextResponse.json({
      success: true,
      rankings,
      comparisonCount: rankings.length,
      weightsUsed: { budgetWeight, distanceWeight, reportWeight },
      meta: {
        note: 'Scores are comparative decision-support heuristics based on available data. Missing criteria are disclosed rather than assumed.',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error comparing places:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'An internal error occurred during place comparison',
        },
      },
      { status: 500 }
    );
  }
}
