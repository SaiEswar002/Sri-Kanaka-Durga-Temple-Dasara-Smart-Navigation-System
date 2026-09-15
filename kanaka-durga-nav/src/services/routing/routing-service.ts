// Routing Service Interface
// All routing providers (OSRM, Valhalla, GraphHopper, vendor APIs) implement RoutingService.
// Swap by changing ROUTING_PROVIDER env var — no UI code changes needed.

import type { LngLat, NavigationRoute, NavigationStep, RouteClosure } from '@/types';

export interface RoutingRequest {
  origin: LngLat;
  destination: LngLat;
  /** Active route closures to avoid */
  closures?: RouteClosure[];
  /** Profile: always pedestrian for pilgrim app */
  profile?: 'pedestrian' | 'foot';
}

export interface RoutingService {
  /** Calculate a pedestrian route from origin to destination */
  route(request: RoutingRequest): Promise<NavigationRoute>;
  /** Provider name for debugging */
  readonly name: string;
}

// ============================================================
// OSRM Implementation
// Calls through /api/routing/route to avoid exposing OSRM URL to clients
// ============================================================
class OsrmRoutingService implements RoutingService {
  readonly name = 'OSRM';

  async route(request: RoutingRequest): Promise<NavigationRoute> {
    const params = new URLSearchParams({
      origin_lat: request.origin.lat.toString(),
      origin_lng: request.origin.lng.toString(),
      dest_lat: request.destination.lat.toString(),
      dest_lng: request.destination.lng.toString(),
    });

    const response = await fetch(`/api/routing/route?${params}`);
    if (!response.ok) {
      throw new Error(`Routing service error: ${response.status}`);
    }
    return response.json();
  }
}

// ============================================================
// Mock / Dev Routing Service
// Returns a straight-line route with fake steps
// Used when no routing backend is configured
// ============================================================
class MockRoutingService implements RoutingService {
  readonly name = 'Mock (Dev)';

  async route(request: RoutingRequest): Promise<NavigationRoute> {
    const { origin, destination } = request;

    // Straight-line distance (Haversine)
    const distanceMeters = haversineDistance(origin, destination);
    const durationSeconds = Math.round(distanceMeters / 1.2); // ~1.2 m/s walking speed

    // Generate intermediate waypoints for a straight-line path
    const steps = 5;
    const coords: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      coords.push([
        origin.lng + (destination.lng - origin.lng) * t,
        origin.lat + (destination.lat - origin.lat) * t,
      ]);
    }

    const navSteps: NavigationStep[] = [
      {
        instruction: 'Walk toward your destination',
        instruction_te: 'మీ గమ్యస్థానం వైపు నడవండి',
        distance_meters: distanceMeters,
        duration_seconds: durationSeconds,
        coordinate: [origin.lng, origin.lat],
        maneuver: 'depart',
      },
      {
        instruction: 'You have arrived at your destination',
        instruction_te: 'మీరు మీ గమ్యస్థానానికి చేరుకున్నారు',
        distance_meters: 0,
        duration_seconds: 0,
        coordinate: [destination.lng, destination.lat],
        maneuver: 'arrive',
      },
    ];

    return {
      coordinates: coords,
      distance_meters: distanceMeters,
      duration_seconds: durationSeconds,
      steps: navSteps,
      provider: this.name,
      is_mock: true,
    };
  }
}

// ============================================================
// Factory
// ============================================================
export function createRoutingService(): RoutingService {
  const provider = process.env.NEXT_PUBLIC_ROUTING_PROVIDER ?? 'mock';

  switch (provider) {
    case 'osrm':
      return new OsrmRoutingService();
    case 'mock':
    default:
      if (process.env.NODE_ENV === 'production' && provider === 'mock') {
        console.warn('[Routing] Mock routing service is NOT suitable for production. Set NEXT_PUBLIC_ROUTING_PROVIDER=osrm and configure OSRM_BASE_URL.');
      }
      return new MockRoutingService();
  }
}

let _routingService: RoutingService | null = null;
export function getRoutingService(): RoutingService {
  if (!_routingService) {
    _routingService = createRoutingService();
  }
  return _routingService;
}

// ============================================================
// Utility: Haversine distance
// ============================================================
function haversineDistance(a: LngLat, b: LngLat): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export { haversineDistance };
