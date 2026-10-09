// GET /api/geocode/reverse?latitude=...&longitude=...
// Reverse geocoding service using OpenStreetMap Nominatim
import { NextRequest, NextResponse } from 'next/server';
import { GeocodeReverseSchema } from '@/lib/validations/schemas';



export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  try {
    const parsed = GeocodeReverseSchema.safeParse({
      latitude: searchParams.get('latitude') || searchParams.get('lat') || undefined,
      longitude: searchParams.get('longitude') || searchParams.get('lng') || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid coordinates for reverse geocoding', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { latitude, longitude } = parsed.data;

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(4500),
        headers: {
          'User-Agent': 'NagarMitraAI-ReverseGeocode/1.0 (DYPCOE Hackathon)',
          Accept: 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        const address = data.address || {};
        const locality =
          address.suburb ||
          address.neighbourhood ||
          address.residential ||
          address.road ||
          'Local Area';
        const city = address.city || address.town || address.county || 'Pune';

        return NextResponse.json({
          latitude,
          longitude,
          displayName: data.display_name || `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`,
          locality,
          city,
          state: address.state || 'Maharashtra',
          country: address.country || 'India',
          source: 'nominatim_reverse',
          attribution: '© OpenStreetMap contributors',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('Reverse geocoding fetch failed:', msg);
    }

    // Fallback response with coordinates representation
    return NextResponse.json({
      latitude,
      longitude,
      displayName: `Location near (${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E)`,
      locality: 'Unknown Area',
      city: 'Pune',
      source: 'fallback_coordinates',
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'digest' in error &&
      typeof (error as { digest?: string }).digest === 'string' &&
      (error as { digest: string }).digest.startsWith('NEXT_')
    ) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Reverse geocoding error:', error);
    return NextResponse.json(
      { error: 'Failed to process reverse geocoding', details: message },
      { status: 500 }
    );
  }
}
