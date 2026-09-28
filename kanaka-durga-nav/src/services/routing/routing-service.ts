// Routing Service Interface
// All routing providers (OSRM public, OSRM self-hosted, Mock) implement RoutingService.
// Default: OSRM Public API (router.project-osrm.org) — real road routing, no API key needed.

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
// CLOSURE VALIDATION
// ============================================================
/**
 * Determine whether a route polyline passes through an active closure.
 *
 * LIMITATION: The public OSRM API does not understand this application's
 * custom database closures and cannot route around them automatically.
 * We therefore perform a post-routing validation step client-side.
 *
 * Strategy:
 *  1. For closures with a `waypoints` array — check whether any route coordinate
 *     is within CLOSURE_IMPACT_RADIUS_M of any closure waypoint.
 *  2. For closures with an `affected_area` polygon — ideally a ray-casting
 *     containment check, but PostGIS geometry is not guaranteed to be in the
 *     client bundle. We approximate with a bounding-box + point-radius check.
 *  3. For closures with no geometry — we cannot validate and skip them.
 *
 * This validation is honest: it may miss closures we cannot spatially check,
 * and may occasionally flag routes that are technically clear. It is a
 * best-effort safety net, not a guaranteed exclusion engine.
 */
const CLOSURE_IMPACT_RADIUS_M = 60; // meters — route coords within this distance of a closure are flagged

export interface ClosureValidationResult {
  /** True if the route is clear of all detectable closures */
  clear: boolean;
  /** Closures whose geometry overlaps the route */
  affectedClosures: RouteClosure[];
}

export function validateRouteAgainstClosures(
  routeCoordinates: [number, number][],
  closures: RouteClosure[],
): ClosureValidationResult {
  const affectedClosures: RouteClosure[] = [];

  for (const closure of closures) {
    if (closure.status !== 'ACTIVE' && closure.status !== 'SCHEDULED') continue;

    // Strategy 1: Waypoints array  [{lat, lng}] or [[lng, lat]] in DB
    const wp = closure.waypoints;
    if (wp && Array.isArray(wp) && wp.length > 0) {
      const waypointConflict = routeCoordinates.some((coord) => {
        const routePt: LngLat = { lat: coord[1], lng: coord[0] };
        return (wp as unknown[]).some((w) => {
          let wPt: LngLat | null = null;
          if (Array.isArray(w) && w.length >= 2) {
            wPt = { lng: (w as number[])[0], lat: (w as number[])[1] };
          } else if (w && typeof w === 'object' && 'lat' in w && 'lng' in w) {
            wPt = w as LngLat;
          }
          if (!wPt) return false;
          return haversineDistance(routePt, wPt) <= CLOSURE_IMPACT_RADIUS_M;
        });
      });
      if (waypointConflict) {
        affectedClosures.push(closure);
        continue;
      }
    }

    // Strategy 2: closure_line geometry — check route proximity to each line segment
    if (closure.closure_line?.coordinates && closure.closure_line.coordinates.length >= 2) {
      const lineCoords = closure.closure_line.coordinates;
      const lineConflict = routeCoordinates.some((coord) => {
        const routePt: LngLat = { lat: coord[1], lng: coord[0] };
        for (let i = 0; i < lineCoords.length - 1; i++) {
          const segA: LngLat = { lng: lineCoords[i][0], lat: lineCoords[i][1] };
          const segB: LngLat = { lng: lineCoords[i + 1][0], lat: lineCoords[i + 1][1] };
          if (pointToSegmentDistance(routePt, segA, segB) <= CLOSURE_IMPACT_RADIUS_M) {
            return true;
          }
        }
        return false;
      });
      if (lineConflict) {
        affectedClosures.push(closure);
        continue;
      }
    }

    // Strategy 3: affected_area polygon bounding-box check (approximate)
    if (closure.affected_area?.coordinates?.[0]) {
      const ring = closure.affected_area.coordinates[0];
      const lats = ring.map((c) => c[1]);
      const lngs = ring.map((c) => c[0]);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      const bboxConflict = routeCoordinates.some(([lng, lat]) =>
        lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng
      );
      if (bboxConflict) {
        affectedClosures.push(closure);
      }
    }
  }

  return {
    clear: affectedClosures.length === 0,
    affectedClosures,
  };
}

/**
 * Approximate perpendicular distance from point P to line segment AB (in meters).
 */
function pointToSegmentDistance(p: LngLat, a: LngLat, b: LngLat): number {
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return haversineDistance(p, a);

  // Parameter t: projection of P onto line AB, clamped to [0, 1]
  const t = Math.max(0, Math.min(1, ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / lenSq));
  const proj: LngLat = { lng: a.lng + t * dx, lat: a.lat + t * dy };
  return haversineDistance(p, proj);
}

// ============================================================
// OSRM Public API — Real road-following pedestrian routing
// Uses public router.project-osrm.org (foot profile)
// No API key required. Falls back to mock on failure.
// ============================================================
class OsrmPublicRoutingService implements RoutingService {
  readonly name = 'OSRM Public';

  async route(request: RoutingRequest): Promise<NavigationRoute> {
    const { origin, destination } = request;

    // OSRM expects lng,lat order
    const url = `https://router.project-osrm.org/route/v1/foot/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true&annotations=false`;

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`OSRM responded ${res.status}`);

      const data = await res.json();

      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error('OSRM returned no routes');
      }

      const osrmRoute = data.routes[0];
      const leg = osrmRoute.legs[0];

      // Extract coordinates from GeoJSON geometry (already [lng, lat])
      const coordinates: [number, number][] = osrmRoute.geometry.coordinates;

      // Convert OSRM steps to NavigationStep[]
      const steps: NavigationStep[] = leg.steps.map((step: {
        maneuver: { type: string; modifier?: string; location: [number, number] };
        name: string;
        distance: number;
        duration: number;
      }) => {
        const instruction = buildInstruction(step.maneuver.type, step.maneuver.modifier, step.name);
        return {
          instruction,
          instruction_te: instruction, // Telugu support: same for now
          distance_meters: Math.round(step.distance),
          duration_seconds: Math.round(step.duration),
          coordinate: step.maneuver.location as [number, number],
          maneuver: step.maneuver.type,
        };
      });

      // Ensure last step is "arrive"
      if (steps.length === 0 || steps[steps.length - 1].maneuver !== 'arrive') {
        steps.push({
          instruction: 'You have arrived at your destination',
          instruction_te: 'మీరు మీ గమ్యస్థానానికి చేరుకున్నారు',
          distance_meters: 0,
          duration_seconds: 0,
          coordinate: [destination.lng, destination.lat],
          maneuver: 'arrive',
        });
      }

      const route: NavigationRoute = {
        coordinates,
        distance_meters: Math.round(osrmRoute.distance),
        duration_seconds: Math.round(osrmRoute.duration),
        steps,
        provider: this.name,
        is_mock: false,
      };

      // NOTE: OSRM cannot automatically avoid our custom database closures.
      // We validate the returned route against active closures and annotate it.
      if (request.closures && request.closures.length > 0) {
        const validation = validateRouteAgainstClosures(coordinates, request.closures);
        if (!validation.clear) {
          // Log for operator awareness; the route is still returned.
          // Future enhancement: request alternate route or use waypoint exclusion.
          console.warn(
            `[Routing] Route may pass through ${validation.affectedClosures.length} active closure(s):`,
            validation.affectedClosures.map((c) => c.title).join(', '),
          );
          route.closure_conflict = true;
          route.affected_closure_titles = validation.affectedClosures.map((c) => c.title);
        }
      }

      return route;
    } catch (err) {
      console.warn('[OSRM Public] Failed, falling back to mock route:', err);
      // Fall back to mock service
      return new MockRoutingService().route(request);
    }
  }
}

// ============================================================
// OSRM Self-Hosted — Calls through /api/routing/route
// ============================================================
class OsrmSelfHostedRoutingService implements RoutingService {
  readonly name = 'OSRM Self-Hosted';

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
// Returns a straight-line route — used as last resort fallback
// ============================================================
class MockRoutingService implements RoutingService {
  readonly name = 'Mock (Straight-line)';

  async route(request: RoutingRequest): Promise<NavigationRoute> {
    const { origin, destination } = request;

    const distanceMeters = haversineDistance(origin, destination);
    const durationSeconds = Math.round(distanceMeters / 1.2); // ~1.2 m/s walking speed

    // Generate intermediate waypoints for a straight-line path
    const numPoints = 10;
    const coords: [number, number][] = [];
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      coords.push([
        origin.lng + (destination.lng - origin.lng) * t,
        origin.lat + (destination.lat - origin.lat) * t,
      ]);
    }

    const halfDist = distanceMeters / 2;
    const navSteps: NavigationStep[] = [
      {
        instruction: 'Head toward your destination',
        instruction_te: 'మీ గమ్యస్థానం వైపు వెళ్ళండి',
        distance_meters: halfDist,
        duration_seconds: Math.round(halfDist / 1.2),
        coordinate: [origin.lng, origin.lat],
        maneuver: 'depart',
      },
      {
        instruction: `Continue for ${Math.round(halfDist)}m`,
        instruction_te: `${Math.round(halfDist)} మీటర్లు ముందుకు వెళ్ళండి`,
        distance_meters: halfDist / 2,
        duration_seconds: Math.round(halfDist / 2 / 1.2),
        coordinate: coords[Math.floor(numPoints / 2)],
        maneuver: 'straight',
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
// Human-readable instruction builder for OSRM maneuver types
// ============================================================
function buildInstruction(type: string, modifier?: string, streetName?: string): string {
  const on = streetName && streetName !== '' ? ` on ${streetName}` : '';
  switch (type) {
    case 'depart':
      return `Head ${modifier ?? 'forward'}${on}`;
    case 'arrive':
      return 'You have arrived at your destination';
    case 'turn':
      return `Turn ${modifier ?? 'right'}${on}`;
    case 'new name':
      return `Continue${on}`;
    case 'merge':
      return `Merge ${modifier ?? 'straight'}${on}`;
    case 'ramp':
      return `Take the ramp ${modifier ?? ''}${on}`.trim();
    case 'fork':
      return `Keep ${modifier ?? 'straight'} at the fork${on}`;
    case 'end of road':
      return `Turn ${modifier ?? 'right'} at the end of road${on}`;
    case 'use lane':
      return `Use the ${modifier ?? ''} lane${on}`.trim();
    case 'continue':
      return `Continue ${modifier ?? 'straight'}${on}`;
    case 'roundabout':
    case 'rotary':
      return `Enter the roundabout${on}`;
    case 'roundabout turn':
      return `At the roundabout, turn ${modifier ?? 'right'}`;
    case 'exit roundabout':
    case 'exit rotary':
      return `Exit the roundabout${on}`;
    default:
      return `Continue${on}`;
  }
}

// ============================================================
// Factory — selects provider based on env var
// Default: OSRM public API (real road routing, no key needed)
// ============================================================
export function createRoutingService(): RoutingService {
  const provider = (process.env.NEXT_PUBLIC_ROUTING_PROVIDER ?? 'osrm-public').toLowerCase();

  switch (provider) {
    case 'osrm':
    case 'osrm-self':
      return new OsrmSelfHostedRoutingService();
    case 'mock':
      return new MockRoutingService();
    case 'osrm-public':
    default:
      return new OsrmPublicRoutingService();
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
