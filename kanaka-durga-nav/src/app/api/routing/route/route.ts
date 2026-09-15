import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Internal routing API route
// This proxies requests to OSRM (or other routing backend) so that:
// 1. The OSRM base URL never reaches the client
// 2. We can swap the routing backend without touching UI code
// 3. We can add request validation and rate limiting here

const routeQuerySchema = z.object({
  origin_lat: z.string().transform(Number),
  origin_lng: z.string().transform(Number),
  dest_lat: z.string().transform(Number),
  dest_lng: z.string().transform(Number),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const parsed = routeQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid coordinates', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { origin_lat, origin_lng, dest_lat, dest_lng } = parsed.data;

  // Validate coordinate ranges
  if (
    Math.abs(origin_lat) > 90 || Math.abs(dest_lat) > 90 ||
    Math.abs(origin_lng) > 180 || Math.abs(dest_lng) > 180
  ) {
    return NextResponse.json({ error: 'Coordinates out of range' }, { status: 400 });
  }

  const osrmBaseUrl = process.env.OSRM_BASE_URL;

  if (!osrmBaseUrl) {
    // Return mock response when OSRM is not configured
    return NextResponse.json(
      getMockRoute(origin_lat, origin_lng, dest_lat, dest_lng),
      {
        headers: {
          'Cache-Control': 'no-store',
          'X-Route-Provider': 'mock',
        },
      }
    );
  }

  try {
    // OSRM route request
    const osrmUrl = `${osrmBaseUrl}/route/v1/foot/${origin_lng},${origin_lat};${dest_lng},${dest_lat}?steps=true&geometries=geojson&overview=full`;
    const osrmResponse = await fetch(osrmUrl, {
      signal: AbortSignal.timeout(10_000), // 10 second timeout
    });

    if (!osrmResponse.ok) {
      throw new Error(`OSRM returned ${osrmResponse.status}`);
    }

    const osrmData = await osrmResponse.json();

    if (osrmData.code !== 'Ok' || !osrmData.routes?.length) {
      return NextResponse.json({ error: 'No route found' }, { status: 404 });
    }

    const route = osrmData.routes[0];
    const leg = route.legs[0];

    const result = {
      coordinates: route.geometry.coordinates,
      distance_meters: Math.round(route.distance),
      duration_seconds: Math.round(route.duration),
      steps: leg.steps.map((step: OsrmStep) => ({
        instruction: step.maneuver?.instruction ?? formatManeuver(step),
        instruction_te: step.maneuver?.instruction ?? formatManeuver(step), // TODO: Telugu translation via i18n
        distance_meters: Math.round(step.distance),
        duration_seconds: Math.round(step.duration),
        coordinate: step.maneuver?.location ?? [0, 0],
        maneuver: classifyManeuver(step.maneuver?.type ?? ''),
      })),
      provider: 'osrm',
      is_mock: false,
    };

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Route-Provider': 'osrm',
      },
    });
  } catch (err) {
    console.error('[Routing API] OSRM error:', err);
    // Graceful fallback to mock
    return NextResponse.json(
      getMockRoute(origin_lat, origin_lng, dest_lat, dest_lng),
      {
        headers: {
          'Cache-Control': 'no-store',
          'X-Route-Provider': 'mock-fallback',
        },
      }
    );
  }
}

// ============================================================
// Helpers
// ============================================================
interface OsrmStep {
  distance: number;
  duration: number;
  maneuver?: {
    type: string;
    instruction?: string;
    location?: [number, number];
  };
}

function formatManeuver(step: OsrmStep): string {
  const type = step.maneuver?.type ?? 'continue';
  switch (type) {
    case 'depart': return 'Start walking';
    case 'arrive': return 'You have arrived';
    case 'turn': return 'Turn ahead';
    default: return 'Continue straight';
  }
}

function classifyManeuver(type: string): 'straight' | 'turn-left' | 'turn-right' | 'arrive' | 'depart' | 'continue' {
  if (type === 'depart') return 'depart';
  if (type === 'arrive') return 'arrive';
  if (type.includes('left')) return 'turn-left';
  if (type.includes('right')) return 'turn-right';
  return 'straight';
}

function getMockRoute(oLat: number, oLng: number, dLat: number, dLng: number) {
  const R = 6371000;
  const dLatR = ((dLat - oLat) * Math.PI) / 180;
  const dLngR = ((dLng - oLng) * Math.PI) / 180;
  const a = Math.sin(dLatR / 2) ** 2 + Math.cos((oLat * Math.PI) / 180) * Math.cos((dLat * Math.PI) / 180) * Math.sin(dLngR / 2) ** 2;
  const distance = 2 * R * Math.asin(Math.sqrt(a));
  const duration = distance / 1.2;

  const steps = 6;
  const coords: [number, number][] = Array.from({ length: steps + 1 }, (_, i) => [
    oLng + (dLng - oLng) * (i / steps),
    oLat + (dLat - oLat) * (i / steps),
  ]);

  return {
    coordinates: coords,
    distance_meters: Math.round(distance),
    duration_seconds: Math.round(duration),
    steps: [
      { instruction: 'Walk toward your destination', instruction_te: 'మీ గమ్యస్థానం వైపు నడవండి', distance_meters: Math.round(distance), duration_seconds: Math.round(duration), coordinate: [oLng, oLat], maneuver: 'depart' },
      { instruction: 'You have arrived', instruction_te: 'మీరు చేరుకున్నారు', distance_meters: 0, duration_seconds: 0, coordinate: [dLng, dLat], maneuver: 'arrive' },
    ],
    provider: 'mock',
    is_mock: true,
  };
}
