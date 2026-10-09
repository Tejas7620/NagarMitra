// ============================================================
// GET /api/weather — Live Weather Conditions Backend
// Uses Open-Meteo API for real-time global weather observations
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { WeatherQuerySchema } from '@/lib/validations/schemas';



// WMO Weather interpretation table (WMO code -> condition description & icon)
function interpretWmoCode(code: number): { condition: string; icon: string } {
  switch (code) {
    case 0:
      return { condition: 'Clear sky', icon: '☀️' };
    case 1:
      return { condition: 'Mainly clear', icon: '🌤️' };
    case 2:
      return { condition: 'Partly cloudy', icon: '⛅' };
    case 3:
      return { condition: 'Overcast', icon: '☁️' };
    case 45:
    case 48:
      return { condition: 'Fog / Mist', icon: '🌫️' };
    case 51:
    case 53:
    case 55:
      return { condition: 'Drizzle', icon: '🌦️' };
    case 61:
    case 63:
    case 65:
      return { condition: 'Rain', icon: '🌧️' };
    case 80:
    case 81:
    case 82:
      return { condition: 'Rain showers', icon: '🌧️' };
    case 95:
    case 96:
    case 99:
      return { condition: 'Thunderstorm', icon: '⛈️' };
    default:
      return { condition: 'Fair', icon: '🌤️' };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryObj = Object.fromEntries(searchParams.entries());

    const parseResult = WeatherQuerySchema.safeParse(queryObj);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid coordinate parameters for weather',
            details: parseResult.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const { latitude, longitude } = parseResult.data;

    // Fetch live observations from Open-Meteo
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(weatherUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'NagarMitraAI/1.0' },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'WEATHER_SERVICE_ERROR',
            message: `External weather service returned HTTP ${res.status}`,
          },
        },
        { status: 502 }
      );
    }

    const data = await res.json();
    const current = data.current || {};
    const weatherCode = current.weather_code ?? 0;
    const { condition, icon } = interpretWmoCode(weatherCode);

    return NextResponse.json({
      success: true,
      weather: {
        coordinates: { latitude, longitude },
        temperatureCelsius: current.temperature_2m ?? null,
        feelsLikeCelsius: current.apparent_temperature ?? null,
        humidityPercent: current.relative_humidity_2m ?? null,
        precipitationMm: current.precipitation ?? 0,
        windSpeedKmh: current.wind_speed_10m ?? null,
        wmoCode: weatherCode,
        condition,
        icon,
        observedAt: current.time ? new Date(current.time).toISOString() : new Date().toISOString(),
        units: {
          temperature: '°C',
          precipitation: 'mm',
          windSpeed: 'km/h',
          humidity: '%',
        },
      },
      meta: {
        provider: 'Open-Meteo',
        sourceAttribution: 'Weather data by Open-Meteo.com under CC BY 4.0',
        dataMode: 'live',
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    const isAbort = error instanceof Error && error.name === 'AbortError';
    console.warn('Weather service fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: isAbort ? 'WEATHER_TIMEOUT' : 'WEATHER_UNAVAILABLE',
          message: isAbort ? 'Weather request timed out' : 'Weather service temporarily unavailable',
        },
      },
      { status: 503 }
    );
  }
}
