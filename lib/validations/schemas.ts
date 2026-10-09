// ============================================================
// NagarMitra AI — Request & Response Zod Validation Schemas
// Enforces strict data contracts across all backend endpoints
// ============================================================

import { z } from 'zod';

// Coordinate bounds validator (Global WGS84 range)
export const CoordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// Travel modes supported by OSRM
export const TravelModeSchema = z.enum(['walking', 'driving', 'cycling']);

// 1. Place Query Schema
export const PlaceQuerySchema = z.object({
  category: z.string().optional().default('all'),
  query: z.string().optional().default(''),
  q: z.string().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().positive().max(100).optional().default(25), // km
  bbox: z.string().regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/).optional(), // minLng,minLat,maxLng,maxLat
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});

// 2. Geocode Search & Reverse Schemas
export const GeocodeSearchSchema = z.object({
  q: z.string().min(1, 'Search query cannot be empty'),
  limit: z.coerce.number().int().positive().max(20).optional().default(8),
});

export const GeocodeReverseSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

// 3. Route Calculation Request Schema (POST /api/routes)
export const RouteRequestSchema = z.object({
  origin: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    name: z.string().optional(),
  }),
  destination: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    name: z.string().optional(),
  }),
  travelMode: TravelModeSchema.optional().default('walking'),
  alternatives: z.boolean().optional().default(true),
});

// 4. Incident Report Submission Schema (POST /api/reports)
export const ReportSubmissionSchema = z.object({
  text: z.string().min(3, 'Description must be at least 3 characters').max(1000, 'Description exceeds 1000 characters'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  locationText: z.string().max(255).nullable().optional(),
  observedAt: z.string().datetime().nullable().optional(),
  reporterToken: z.string().max(128).nullable().optional(),
  photoUrl: z.string().url().nullable().optional(),
  voiceTranscript: z.string().max(1000).nullable().optional(),
});

// 5. Impact Replay Schema (POST /api/impact-replay)
export const ImpactReplaySchema = z.object({
  scenarioId: z.string().optional(),
  incidentId: z.string().min(1, 'incidentId is required'),
  origin: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).optional(),
  destination: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).optional(),
  travelMode: TravelModeSchema.optional().default('walking'),
  baselineRouteId: z.string().optional(),
});

// 6. Place Comparison Schema (POST /api/places/compare)
export const PlaceCompareSchema = z.object({
  placeIds: z.array(z.string()).min(2, 'At least 2 places required for comparison').max(5),
  preferences: z.object({
    budgetWeight: z.number().min(0).max(1).optional().default(0.5),
    distanceWeight: z.number().min(0).max(1).optional().default(0.5),
    reportWeight: z.number().min(0).max(1).optional().default(0.5),
  }).optional(),
  origin: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).optional(),
});

// 7. Itinerary Generation Schema (POST /api/itinerary)
export const ItinerarySchema = z.object({
  origin: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).optional(),
  interests: z.array(z.string()).optional().default(['Food', 'Heritage']),
  budget: z.enum(['₹', '₹₹', '₹₹₹']).optional().default('₹'),
  duration: z.string().optional().default('2 hours'),
  travelMode: TravelModeSchema.optional().default('walking'),
});

// 8. Weather Query Schema (GET /api/weather)
export const WeatherQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

// 9. Incidents Query Filter Schema (GET /api/incidents)
export const IncidentsQuerySchema = z.object({
  incidentType: z.string().optional(),
  verificationStatus: z.enum(['unverified', 'corroborated', 'authority_confirmed', 'contested']).optional(),
  freshnessStatus: z.enum(['recent', 'aging', 'stale', 'unknown']).optional(),
  lifecycleStatus: z.enum(['active', 'resolved', 'all']).optional().default('active'),
  isSimulated: z.enum(['true', 'false']).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().positive().max(100).optional(), // km
  bbox: z.string().regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/).optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});

