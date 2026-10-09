// ============================================================
// NagarMitra AI — Frontend Typed API Client Service
// Clean boundary between frontend components and backend API
// ============================================================

import {
  Place,
  Incident,
  RouteScenario,
  ReportSubmission,
  ReportResponse,
  ImpactReplayResult,
} from '@/lib/types';

export interface ApiClientConfig {
  baseUrl?: string;
  timeoutMs?: number;
}

export interface GeocodeItem {
  id: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  category: string;
  address?: string;
  source: 'live_nominatim' | 'curated';
}

export class NagarMitraApiClient {
  private baseUrl: string;

  constructor(config?: ApiClientConfig) {
    this.baseUrl = config?.baseUrl || '';
  }

  /**
   * Searches for places or addresses via Nominatim / curated landmarks.
   */
  async geocode(query: string, limit: number = 8): Promise<GeocodeItem[]> {
    if (!query || !query.trim()) return [];
    const res = await fetch(
      `${this.baseUrl}/api/geocode?q=${encodeURIComponent(query.trim())}&limit=${limit}`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      }
    );
    if (!res.ok) {
      throw new Error(`Geocoding failed: ${res.status}`);
    }
    const data = await res.json();
    return data.results || [];
  }

  /**
   * Fetches places filtered by category, search term, and proximity.
   */
  async getPlaces(options?: {
    category?: string;
    q?: string;
    lat?: number;
    lng?: number;
    radius?: number;
  }): Promise<{ places: Place[]; dataMode: string; count: number }> {
    const qParams = new URLSearchParams();
    if (options?.category) qParams.set('category', options.category);
    if (options?.q) qParams.set('q', options.q);
    if (options?.lat !== undefined) qParams.set('lat', options.lat.toString());
    if (options?.lng !== undefined) qParams.set('lng', options.lng.toString());
    if (options?.radius !== undefined) qParams.set('radius', options.radius.toString());

    const res = await fetch(`${this.baseUrl}/api/places?${qParams.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch places: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  /**
   * Fetches active Pune incidents with recalculated evidence support scores and freshness.
   */
  async getIncidents(): Promise<{ incidents: Incident[]; dataMode: string }> {
    const res = await fetch(`${this.baseUrl}/api/incidents`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch incidents: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  /**
   * Fetches dynamic route candidates between origin and destination from OSRM.
   */
  async getRoutes(params?: {
    originLat?: number;
    originLng?: number;
    destLat?: number;
    destLng?: number;
    mode?: 'walking' | 'driving' | 'cycling';
    originName?: string;
    destName?: string;
    scenarioId?: string;
  }): Promise<{ scenario: RouteScenario; dataMode: string; mode: string; count: number }> {
    const query = new URLSearchParams();
    if (params?.originLat !== undefined) query.set('originLat', params.originLat.toString());
    if (params?.originLng !== undefined) query.set('originLng', params.originLng.toString());
    if (params?.destLat !== undefined) query.set('destLat', params.destLat.toString());
    if (params?.destLng !== undefined) query.set('destLng', params.destLng.toString());
    if (params?.mode) query.set('mode', params.mode);
    if (params?.originName) query.set('originName', params.originName);
    if (params?.destName) query.set('destName', params.destName);
    if (params?.scenarioId) query.set('scenarioId', params.scenarioId);

    const res = await fetch(`${this.baseUrl}/api/routes?${query.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch routes: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  /**
   * Submits a citizen problem report for AI structuring & deduplication clustering.
   */
  async submitReport(payload: ReportSubmission): Promise<ReportResponse> {
    const res = await fetch(`${this.baseUrl}/api/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => null);
      throw new Error(
        errorBody?.error || `Failed to submit report: ${res.status} ${res.statusText}`
      );
    }
    return res.json();
  }

  /**
   * Evaluates before vs after route recommendation changes based on incident corridor exposure.
   */
  async getImpactReplay(scenarioId: string, incidentId: string): Promise<ImpactReplayResult> {
    const res = await fetch(`${this.baseUrl}/api/impact-replay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ scenarioId, incidentId }),
    });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => null);
      throw new Error(
        errorBody?.error || `Failed to evaluate impact replay: ${res.status} ${res.statusText}`
      );
    }
    return res.json();
  }

  /**
   * Resets the in-memory demo database to deterministic initial seed data.
   */
  async resetDemo(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${this.baseUrl}/api/reset`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Failed to reset demo state: ${res.status}`);
    }
    return res.json();
  }

  /**
   * Fetches detailed incident by ID.
   */
  async getIncident(id: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/incidents/${id}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Failed to fetch incident: ${res.status}`);
    return res.json();
  }

  /**
   * Fetches full evidence ledger and breakdown for an incident.
   */
  async getIncidentEvidence(id: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/incidents/${id}/evidence`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Failed to fetch evidence: ${res.status}`);
    return res.json();
  }

  /**
   * Compares places across budget, rating, accessibility, and nearby incident reports.
   */
  async comparePlaces(payload: {
    placeIds: string[];
    preferences?: { budgetWeight?: number; distanceWeight?: number; reportWeight?: number };
    origin?: { latitude: number; longitude: number };
  }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/places/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Failed to compare places: ${res.status}`);
    return res.json();
  }

  /**
   * Generates a realistic multi-stop outing itinerary.
   */
  async getItinerary(payload: {
    origin?: { latitude: number; longitude: number };
    interests?: string[];
    budget?: '₹' | '₹₹' | '₹₹₹';
    duration?: string;
    travelMode?: 'walking' | 'driving' | 'cycling';
  }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/itinerary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Failed to generate itinerary: ${res.status}`);
    return res.json();
  }

  /**
   * Fetches live weather conditions for coordinates via Open-Meteo.
   */
  async getWeather(latitude: number, longitude: number): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/weather?latitude=${latitude}&longitude=${longitude}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Failed to fetch weather: ${res.status}`);
    return res.json();
  }

  /**
   * Uploads an incident photo with validation.
   */
  async uploadMedia(file: File): Promise<{ success: boolean; url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${this.baseUrl}/api/media/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(`Failed to upload media: ${res.status}`);
    return res.json();
  }
}

// Default singleton client instance for frontend consumption
export const apiClient = new NagarMitraApiClient();

