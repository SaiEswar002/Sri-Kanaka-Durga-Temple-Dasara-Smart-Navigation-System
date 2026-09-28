'use client';

/**
 * useLiveNavigation
 * Powers the live navigation HUD:
 *  - GPS watch for continuous position updates
 *  - Real-time speed (km/h) and heading (degrees) from GeolocationCoordinates
 *  - Elapsed time since navigation started
 *  - Remaining distance and time to destination (along the route polyline)
 *  - Auto-advance route steps when user passes a step waypoint radius
 *  - Arrival detection
 *  - Off-route detection with hysteresis (requires N consecutive off-route samples)
 *  - Rerouting trigger callback when off-route confirmed
 *
 * Off-route detection design:
 *  - Compute the perpendicular distance from the user's GPS position to the
 *    nearest route polyline segment (not nearest vertex — much more accurate).
 *  - Threshold: 40m from the nearest segment (safe for dense pilgrimage areas
 *    with GPS noise of ±10–20m on consumer devices).
 *  - Hysteresis: requires OFF_ROUTE_CONFIRM_SAMPLES consecutive off-route
 *    readings before confirming off-route. This prevents triggering on GPS
 *    noise, multipath, or momentary position jumps.
 *  - Re-route cooldown: prevents repeated rerouting within 10 seconds.
 *
 * React 19 / react-hooks/set-state-in-effect compliance maintained throughout.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { NavigationRoute, LngLat } from '@/types';
import { haversineDistance } from '@/services/routing/routing-service';

// How close (meters) to a step coordinate before auto-advancing
const STEP_ADVANCE_RADIUS_M = 25;
// How close (meters) to destination to trigger arrival
const ARRIVAL_RADIUS_M = 30;

// ── Off-route constants ──────────────────────────────────────────────────────
/** Distance from nearest route segment that triggers off-route flag (meters) */
const OFF_ROUTE_THRESHOLD_M = 40;
/** Number of consecutive GPS samples that must be off-route before confirming */
const OFF_ROUTE_CONFIRM_SAMPLES = 3;
/** Minimum seconds between reroute triggers (cooldown) */
const REROUTE_COOLDOWN_S = 10;

export interface LiveNavigationState {
  /** Current GPS position */
  currentLocation: LngLat | null;
  /** GPS accuracy in meters */
  accuracy: number | null;
  /** Speed in km/h (from GeolocationCoordinates.speed, else computed from positions) */
  speedKmh: number;
  /** Compass heading in degrees (0 = North) */
  heading: number | null;
  /** Seconds since navigation started */
  elapsedSeconds: number;
  /** Remaining meters to destination along the route polyline */
  remainingMeters: number;
  /** Remaining seconds to destination (estimated at current speed or route average) */
  remainingSeconds: number;
  /** Current step index */
  currentStepIdx: number;
  /** Whether user has arrived at the destination */
  arrived: boolean;
  /** GPS permission/status */
  gpsStatus: 'waiting' | 'active' | 'denied' | 'error';
  /** Raw GPS error message */
  gpsError: string | null;
  /** Whether the user is confirmed off-route (N consecutive off-route GPS readings) */
  isOffRoute: boolean;
  /** Distance from the nearest route segment in meters (for diagnostics/UI) */
  distanceFromRoute: number | null;
}

interface UseLiveNavigationOptions {
  route: NavigationRoute | null;
  /** Whether live tracking is active */
  active: boolean;
  /** Overridden starting step index (from user pressing "Next Step") */
  externalStepIdx?: number;
  onStepAdvance?: (newIdx: number) => void;
  onArrival?: () => void;
  /**
   * Called when user is confirmed off-route.
   * The consumer (navigate page) should request rerouting.
   */
  onOffRoute?: () => void;
}

// ── Geometry helpers ─────────────────────────────────────────────────────────

/**
 * Compute the perpendicular distance from point P to line segment AB.
 * More accurate than nearest-vertex for off-route detection on straight roads.
 * Returns meters.
 */
function pointToSegmentDistanceM(p: LngLat, a: LngLat, b: LngLat): number {
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-12) return haversineDistance(p, a);

  const t = Math.max(0, Math.min(1, ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / lenSq));
  const proj: LngLat = { lng: a.lng + t * dx, lat: a.lat + t * dy };
  return haversineDistance(p, proj);
}

/**
 * Find the minimum perpendicular distance from `loc` to the route polyline.
 * Searches all segments — O(n) on coordinate count.
 */
function distanceFromRouteLine(
  coordinates: [number, number][],
  loc: LngLat,
): number {
  if (coordinates.length === 0) return Infinity;
  if (coordinates.length === 1) {
    return haversineDistance(loc, { lat: coordinates[0][1], lng: coordinates[0][0] });
  }

  let minDist = Infinity;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const a: LngLat = { lng: coordinates[i][0], lat: coordinates[i][1] };
    const b: LngLat = { lng: coordinates[i + 1][0], lat: coordinates[i + 1][1] };
    const d = pointToSegmentDistanceM(loc, a, b);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

/**
 * Given the route polyline and a current position, find the index of the
 * closest polyline vertex, then sum all remaining segment lengths from that
 * index to the end. This gives remaining road distance instead of straight-line.
 */
function calcRemainingAlongRoute(
  coordinates: [number, number][],
  currentLoc: LngLat,
): number {
  if (coordinates.length === 0) return 0;

  // Find the closest vertex on the route polyline
  let closestIdx = 0;
  let minDist = Infinity;
  for (let i = 0; i < coordinates.length; i++) {
    const d = haversineDistance(currentLoc, { lat: coordinates[i][1], lng: coordinates[i][0] });
    if (d < minDist) {
      minDist = d;
      closestIdx = i;
    }
  }

  // Sum remaining segment lengths from that vertex to the end
  let remaining = 0;
  for (let i = closestIdx; i < coordinates.length - 1; i++) {
    remaining += haversineDistance(
      { lat: coordinates[i][1], lng: coordinates[i][0] },
      { lat: coordinates[i + 1][1], lng: coordinates[i + 1][0] },
    );
  }
  return remaining;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useLiveNavigation({
  route,
  active,
  externalStepIdx,
  onStepAdvance,
  onArrival,
  onOffRoute,
}: UseLiveNavigationOptions): LiveNavigationState {
  const [currentLocation, setCurrentLocation] = useState<LngLat | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [heading, setHeading] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [remainingMeters, setRemainingMeters] = useState(() => route?.distance_meters ?? 0);
  const [remainingSeconds, setRemainingSeconds] = useState(() => route?.duration_seconds ?? 0);
  const [arrived, setArrived] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<LiveNavigationState['gpsStatus']>('waiting');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [distanceFromRoute, setDistanceFromRoute] = useState<number | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPositionRef = useRef<{ lat: number; lng: number; ts: number } | null>(null);
  const arrivedRef = useRef(false);
  const stepIdxRef = useRef(externalStepIdx ?? 0);

  // Off-route tracking refs (not state — avoid extra renders on every GPS tick)
  /** Running count of consecutive off-route GPS readings */
  const offRouteSamplesRef = useRef(0);
  /** Whether off-route has been confirmed (to avoid repeated callbacks) */
  const offRouteConfirmedRef = useRef(false);
  /** Timestamp of last reroute trigger (for cooldown) */
  const lastRerouteTsRef = useRef(0);

  const [currentStepIdx, setCurrentStepIdx] = useState(externalStepIdx ?? 0);

  // Keep stepIdx in sync with external control (user presses "Next Step")
  useEffect(() => {
    if (externalStepIdx !== undefined && externalStepIdx !== stepIdxRef.current) {
      stepIdxRef.current = externalStepIdx;
      Promise.resolve().then(() => setCurrentStepIdx(externalStepIdx));
    }
  }, [externalStepIdx]);

  // When route changes (new navigation started or route updated), reset all state
  useEffect(() => {
    if (route) {
      const dm = route.distance_meters;
      const ds = route.duration_seconds;
      Promise.resolve().then(() => {
        setRemainingMeters(dm);
        setRemainingSeconds(ds);
        setIsOffRoute(false);
        setDistanceFromRoute(null);
      });
      // Reset off-route tracking when a new route is loaded
      offRouteSamplesRef.current = 0;
      offRouteConfirmedRef.current = false;
    }
  }, [route]);

  const handleGpsUpdate = useCallback(
    (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy: acc, speed, heading: hdg } = pos.coords;
      const now = pos.timestamp;

      const loc: LngLat = { lat: latitude, lng: longitude };
      setCurrentLocation(loc);
      setAccuracy(acc);
      setGpsStatus('active');
      setGpsError(null);

      // --- Speed ---
      let computedSpeed = 0;
      if (speed !== null && speed >= 0) {
        computedSpeed = speed * 3.6;
      } else if (prevPositionRef.current) {
        const prev = prevPositionRef.current;
        const dMeters = haversineDistance(prev, loc);
        const dSec = (now - prev.ts) / 1000;
        if (dSec > 0.5 && dMeters > 0.5) {
          computedSpeed = (dMeters / dSec) * 3.6;
        }
      }
      const clampedSpeed = Math.min(computedSpeed, 15);
      setSpeedKmh(clampedSpeed);

      // --- Heading ---
      if (hdg !== null && hdg >= 0) {
        setHeading(hdg);
      }

      prevPositionRef.current = { lat: latitude, lng: longitude, ts: now };

      if (!route || arrivedRef.current) return;

      // --- Off-route detection ───────────────────────────────────────────────
      // Only run off-route detection when we have a route with ≥2 coordinates.
      if (route.coordinates.length >= 2) {
        const routeDist = distanceFromRouteLine(route.coordinates, loc);
        setDistanceFromRoute(routeDist);

        const isCurrentlyOffRoute = routeDist > OFF_ROUTE_THRESHOLD_M;

        if (isCurrentlyOffRoute) {
          offRouteSamplesRef.current += 1;
        } else {
          // Back on route — reset hysteresis counter and clear off-route state
          offRouteSamplesRef.current = 0;
          if (offRouteConfirmedRef.current) {
            offRouteConfirmedRef.current = false;
            setIsOffRoute(false);
          }
        }

        // Confirm off-route only after N consecutive off-route readings
        if (
          offRouteSamplesRef.current >= OFF_ROUTE_CONFIRM_SAMPLES &&
          !offRouteConfirmedRef.current
        ) {
          offRouteConfirmedRef.current = true;
          setIsOffRoute(true);

          // Trigger reroute if cooldown has elapsed
          const nowTs = Date.now() / 1000;
          if (onOffRoute && nowTs - lastRerouteTsRef.current >= REROUTE_COOLDOWN_S) {
            lastRerouteTsRef.current = nowTs;
            onOffRoute();
          }
        }
      }
      // ── end off-route ──────────────────────────────────────────────────────

      // --- Remaining distance along the actual route polyline ---
      const distRemaining = calcRemainingAlongRoute(route.coordinates, loc);
      setRemainingMeters(distRemaining);

      // --- Arrival detection ---
      const dest = route.coordinates[route.coordinates.length - 1];
      const destLoc: LngLat = { lat: dest[1], lng: dest[0] };
      const distToDest = haversineDistance(loc, destLoc);

      if (distToDest <= ARRIVAL_RADIUS_M) {
        arrivedRef.current = true;
        setArrived(true);
        setRemainingMeters(0);
        setRemainingSeconds(0);
        onArrival?.();
        return;
      }

      // --- Remaining time estimation ---
      let mps: number;
      if (clampedSpeed > 1.0) {
        mps = clampedSpeed / 3.6;
      } else if (route.distance_meters > 0) {
        const routePaceMps = route.distance_meters / route.duration_seconds;
        mps = Math.max(routePaceMps, 1.0);
      } else {
        mps = 1.2;
      }

      setRemainingSeconds(Math.round(distRemaining / mps));

      // --- Auto-advance route steps ---
      const steps = route.steps;
      const nextStepIdx = stepIdxRef.current + 1;
      if (nextStepIdx < steps.length) {
        const nextStep = steps[nextStepIdx];
        const stepLoc: LngLat = { lat: nextStep.coordinate[1], lng: nextStep.coordinate[0] };
        const distToNext = haversineDistance(loc, stepLoc);
        if (distToNext <= STEP_ADVANCE_RADIUS_M) {
          stepIdxRef.current = nextStepIdx;
          setCurrentStepIdx(nextStepIdx);
          onStepAdvance?.(nextStepIdx);
        }
      }
    },
    [route, onArrival, onStepAdvance, onOffRoute],
  );

  const handleGpsError = useCallback((err: GeolocationPositionError) => {
    setGpsStatus(err.code === 1 ? 'denied' : 'error');
    setGpsError(err.message);
  }, []);

  // Start / stop GPS watch and elapsed timer
  useEffect(() => {
    if (!active) {
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (elapsedTimerRef.current !== null) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
      startTimeRef.current = null;
      prevPositionRef.current = null;
      arrivedRef.current = false;
      stepIdxRef.current = 0;
      offRouteSamplesRef.current = 0;
      offRouteConfirmedRef.current = false;
      lastRerouteTsRef.current = 0;

      Promise.resolve().then(() => {
        setElapsedSeconds(0);
        setSpeedKmh(0);
        setArrived(false);
        setCurrentStepIdx(0);
        setGpsStatus('waiting');
        setIsOffRoute(false);
        setDistanceFromRoute(null);
      });
      return;
    }

    // Start GPS watch
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        handleGpsUpdate,
        handleGpsError,
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 2_000 },
      );
      Promise.resolve().then(() => setGpsStatus('waiting'));
    } else {
      Promise.resolve().then(() => {
        setGpsStatus('error');
        setGpsError('Geolocation not supported');
      });
    }

    // Start elapsed timer
    startTimeRef.current = Date.now();
    elapsedTimerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (elapsedTimerRef.current !== null) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
    };
  }, [active, handleGpsUpdate, handleGpsError]);

  return useMemo(() => ({
    currentLocation,
    accuracy,
    speedKmh,
    heading,
    elapsedSeconds,
    remainingMeters,
    remainingSeconds,
    currentStepIdx,
    arrived,
    gpsStatus,
    gpsError,
    isOffRoute,
    distanceFromRoute,
  }), [
    currentLocation, accuracy, speedKmh, heading, elapsedSeconds,
    remainingMeters, remainingSeconds, currentStepIdx, arrived, gpsStatus, gpsError,
    isOffRoute, distanceFromRoute,
  ]);
}
