// ============================================================
// POST /api/itinerary — Lightweight Itinerary Generation
// Builds realistic 2–3 stop city exploration plans with genuine places,
// realistic route estimates, and incident awareness.
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { ItinerarySchema } from '@/lib/validations/schemas';
import { getAllPlaces, getActiveIncidents } from '@/lib/repositories/store';
import { haversineDistance } from '@/lib/evidence/duplicate-matching';
import { Place } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = ItinerarySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid itinerary request parameters',
            details: parseResult.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const { origin, interests, budget, duration, travelMode } = parseResult.data;
    const allPlaces = getAllPlaces();
    const activeIncidents = getActiveIncidents();

    // Default origin: Pune City Center if not provided
    const startCoord = origin || { latitude: 18.5204, longitude: 73.8567 };

    // Filter places by interest categories and budget
    const categoryMap: Record<string, string[]> = {
      Food: ['food'],
      Heritage: ['heritage', 'tourist_attraction'],
      Culture: ['heritage', 'tourist_attraction'],
      Parks: ['park'],
      Shopping: ['shopping'],
      Health: ['health'],
    };

    const targetCategories = new Set<string>();
    for (const interest of interests || ['Food', 'Heritage']) {
      const mapped = categoryMap[interest] || [interest.toLowerCase()];
      mapped.forEach((c) => targetCategories.add(c));
    }

    const budgetMaxBand = budget === '₹' ? 1 : budget === '₹₹' ? 2 : 3;

    // Filter candidate places
    let candidatePlaces = allPlaces.filter((p) => {
      const catMatch = targetCategories.size === 0 || targetCategories.has(p.category.toLowerCase());
      const budgetMatch = p.priceBand === null || p.priceBand <= budgetMaxBand;
      return catMatch && budgetMatch;
    });

    if (candidatePlaces.length < 2) {
      // Relax budget filter if candidates are scarce
      candidatePlaces = allPlaces.filter((p) =>
        targetCategories.size === 0 || targetCategories.has(p.category.toLowerCase())
      );
    }

    // Sort by distance from start coordinate
    const sortedCandidates = [...candidatePlaces].sort((a, b) => {
      const distA = haversineDistance(startCoord.latitude, startCoord.longitude, a.latitude, a.longitude);
      const distB = haversineDistance(startCoord.latitude, startCoord.longitude, b.latitude, b.longitude);
      return distA - distB;
    });

    // Select 2–3 distinct stops ensuring category variety where possible
    const selectedStops: Place[] = [];
    const usedCategories = new Set<string>();

    for (const place of sortedCandidates) {
      if (selectedStops.length >= 3) break;
      if (!usedCategories.has(place.category) || selectedStops.length >= 2) {
        selectedStops.push(place);
        usedCategories.add(place.category);
      }
    }

    // Fallback if still under 2 stops
    if (selectedStops.length < 2) {
      for (const place of allPlaces) {
        if (selectedStops.length >= 2) break;
        if (!selectedStops.some((s) => s.id === place.id)) {
          selectedStops.push(place);
        }
      }
    }

    // Calculate leg distances and transit estimates
    // Walking: ~4.5 km/h (1.25 m/s); Driving: ~25 km/h in city (6.9 m/s); Cycling: ~12 km/h (3.3 m/s)
    const speedMps = travelMode === 'driving' ? 6.9 : travelMode === 'cycling' ? 3.3 : 1.25;

    let currentPoint = startCoord;
    let totalDistanceMeters = 0;
    let totalTransitSeconds = 0;

    const stopsWithDetails = selectedStops.map((stop, index) => {
      const legDistance = Math.round(
        haversineDistance(currentPoint.latitude, currentPoint.longitude, stop.latitude, stop.longitude)
      );
      const transitTime = Math.round(legDistance / speedMps);

      totalDistanceMeters += legDistance;
      totalTransitSeconds += transitTime;
      currentPoint = { latitude: stop.latitude, longitude: stop.longitude };

      // Check nearby incidents for this stop (<300m)
      const nearbyIncidents = activeIncidents.filter((inc) => {
        const d = haversineDistance(stop.latitude, stop.longitude, inc.latitude, inc.longitude);
        return d <= 300;
      });

      return {
        stopNumber: index + 1,
        placeId: stop.id,
        name: stop.name,
        category: stop.category,
        coordinates: {
          latitude: stop.latitude,
          longitude: stop.longitude,
        },
        legDistanceMeters: legDistance,
        estimatedTransitSeconds: transitTime,
        recommendedDwellMinutes: stop.category === 'food' ? 45 : 30,
        rating: stop.rating,
        priceBand: stop.priceBand,
        nearbyAlerts: nearbyIncidents.map((i) => ({
          id: i.id,
          title: i.title,
          type: i.incidentType,
          status: i.verificationStatus,
        })),
      };
    });

    const totalDwellMinutes = stopsWithDetails.reduce((sum, s) => sum + s.recommendedDwellMinutes, 0);
    const totalEstimatedMinutes = Math.round(totalTransitSeconds / 60) + totalDwellMinutes;

    return NextResponse.json({
      success: true,
      itinerary: {
        title: `Curated ${interests?.join(' & ') || 'City'} Tour`,
        targetDuration: duration,
        travelMode,
        stopsCount: stopsWithDetails.length,
        totalDistanceMeters,
        totalEstimatedDurationMinutes: totalEstimatedMinutes,
        stops: stopsWithDetails,
        summary: `A balanced ${stopsWithDetails.length}-stop route covering ${interests?.join(', ') || 'highlights'} with ~${(totalDistanceMeters / 1000).toFixed(1)} km total transit.`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating itinerary:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'An internal error occurred during itinerary generation',
        },
      },
      { status: 500 }
    );
  }
}
