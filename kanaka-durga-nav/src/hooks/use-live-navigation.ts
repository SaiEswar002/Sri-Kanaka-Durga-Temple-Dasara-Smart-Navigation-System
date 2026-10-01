'use client';

/**
 * useLiveNavigation
 * Powers the live navigation HUD:
 *  - GPS watch for continuous position updates
 *  - Compass deviceorientation listener (iOS webkitCompassHeading, Android alpha)
 *  - Real-time speed (km/h) and movement bearing calculation when moving
 *  - Initial route segment bearing fallback when stationary
 *  - Circular heading smoothing to eliminate magnetometer jitter
 *  - Continuously updated dynamic ETA clock (e.g. "12:42 PM") and remaining travel time
 *  - Live step distance countdown as pilgrim approaches maneuvers
 *  - Elapsed time since navigation started
 *  - Remaining distance and time to destination along the route polyline (segment projection)
 *  - Auto-advance route steps when user passes a step waypoint radius
 *  - Arrival detection
 *  - Off-route detection with hysteresis (requires N consecutive off-route samples)
 *  - Rerouting trigger callback when off-route confirmed
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
  /** Compass / movement heading in degrees (0 = North, 90 = East) */
  heading: number | null;
  /** Seconds since navigation started */
  elapsedSeconds: number;
  /** Remaining meters to destination along the route polyline */
  remainingMeters: number;
  /** Remaining seconds to destination */
  remainingSeconds: number;
  /** Formatted dynamic ETA clock string, e.g. "12:42 PM" */
  etaClock: string;
  /** Dynamic remaining distance in meters to the upcoming maneuver waypoint */
  stepDistanceMeters: number;
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

/** Calculate true forward bearing between two coordinates in degrees [0, 360) */
export function calculateBearing(start: LngLat, end: LngLat): number {
  const startLat = (start.lat * Math.PI) / 180;
  const startLng = (start.lng * Math.PI) / 180;
  const endLat = (end.lat * Math.PI) / 180;
  const endLng = (end.lng * Math.PI) / 180;
  const dLng = endLng - startLng;
  const y = Math.sin(dLng) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/** Circular angle smoother taking 360 wrap-around into account with deadband */
export function smoothAngle(current: number, target: number, factor = 0.25): number {
  const diff = ((target - current + 540) % 360) - 180;
  if (Math.abs(diff) < 1.0) return current;
  return (current + diff * factor + 360) % 360;
}

/** Format remaining seconds to dynamic ETA clock string (e.g. "12:42 PM") */
export function computeEtaClock(remainingSec: number): string {
  if (remainingSec <= 0) return '--:--';
  const now = Date.now();
  const etaMs = now + remainingSec * 1000;
  const roundedEta = new Date(Math.round(etaMs / 60000) * 60000);
  return roundedEta.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

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
 * Given the route polyline and a current position, project onto the closest segment,
 * compute remaining distance along the segment to its end, then sum all subsequent segments
 * to the destination.
 * This guarantees smooth, sub-meter continuous road distance with no vertex-hopping jumps.
 */
function calcRemainingAlongRoute(
  coordinates: [number, number][],
  currentLoc: LngLat,
  lastSegmentIdx: number = 0,
): { remainingMeters: number; closestSegmentIdx: number } {
  if (coordinates.length === 0) return { remainingMeters: 0, closestSegmentIdx: 0 };
  if (coordinates.length === 1) {
    return {
      remainingMeters: Math.round(haversineDistance(currentLoc, { lat: coordinates[0][1], lng: coordinates[0][0] })),
      closestSegmentIdx: 0,
    };
  }

  let bestSegIdx = Math.max(0, Math.min(lastSegmentIdx, coordinates.length - 2));
  let bestDist = Infinity;
  let bestProj: LngLat = { lng: coordinates[bestSegIdx][0], lat: coordinates[bestSegIdx][1] };

  // Search forward from lastSegmentIdx - 1 to maintain monotonic route progress and prevent GPS jitter jumps
  const startIdx = Math.max(0, lastSegmentIdx - 1);
  const endIdx = coordinates.length - 1;

  for (let i = startIdx; i < endIdx; i++) {
    const a: LngLat = { lng: coordinates[i][0], lat: coordinates[i][1] };
    const b: LngLat = { lng: coordinates[i + 1][0], lat: coordinates[i + 1][1] };
    const dx = b.lng - a.lng;
    const dy = b.lat - a.lat;
    const lenSq = dx * dx + dy * dy;
    let proj: LngLat = a;
    if (lenSq >= 1e-12) {
      const t = Math.max(0, Math.min(1, ((currentLoc.lng - a.lng) * dx + (currentLoc.lat - a.lat) * dy) / lenSq));
      proj = { lng: a.lng + t * dx, lat: a.lat + t * dy };
    }
    const d = haversineDistance(currentLoc, proj);
    if (d < bestDist) {
      bestDist = d;
      bestSegIdx = i;
      bestProj = proj;
    }
  }

  // Distance from projected point to end of this segment
  const segEnd: LngLat = { lng: coordinates[bestSegIdx + 1][0], lat: coordinates[bestSegIdx + 1][1] };
  let remaining = haversineDistance(bestProj, segEnd);

  // Plus sum of all subsequent segments to destination
  for (let i = bestSegIdx + 1; i < coordinates.length - 1; i++) {
    remaining += haversineDistance(
      { lat: coordinates[i][1], lng: coordinates[i][0] },
      { lat: coordinates[i + 1][1], lng: coordinates[i + 1][0] },
    );
  }

  return { remainingMeters: Math.round(remaining), closestSegmentIdx: bestSegIdx };
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
  const [etaClock, setEtaClock] = useState(() => computeEtaClock(route?.duration_seconds ?? 0));
  const [stepDistanceMeters, setStepDistanceMeters] = useState(() => route?.steps[0]?.distance_meters ?? 0);
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

  // Orientation / Heading refs
  const compassHeadingRef = useRef<number | null>(null);
  const movementBearingRef = useRef<number | null>(null);
  const currentSmoothedHeadingRef = useRef<number | null>(null);

  // Progressive tracking & stabilization refs (prevents UI flicker on GPS jitter)
  const lastSegmentIdxRef = useRef(0);
  const lastReportedMetersRef = useRef<number | null>(null);
  const lastReportedSecondsRef = useRef<number | null>(null);

  // Off-route tracking refs (not state — avoid extra renders on every GPS tick)
  const offRouteSamplesRef = useRef(0);
  const offRouteConfirmedRef = useRef(false);
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
      lastSegmentIdxRef.current = 0;
      lastReportedMetersRef.current = dm;
      lastReportedSecondsRef.current = ds;
      const initialStepDist = route.steps[0]?.distance_meters ?? 0;

      // Compute initial route bearing if available as stationary fallback
      if (route.coordinates.length >= 2) {
        const p1: LngLat = { lat: route.coordinates[0][1], lng: route.coordinates[0][0] };
        const p2: LngLat = { lat: route.coordinates[1][1], lng: route.coordinates[1][0] };
        const initBearing = calculateBearing(p1, p2);
        movementBearingRef.current = initBearing;
        if (currentSmoothedHeadingRef.current === null) {
          currentSmoothedHeadingRef.current = initBearing;
          Promise.resolve().then(() => setHeading(Math.round(initBearing)));
        }
      }

      Promise.resolve().then(() => {
        setRemainingMeters(dm);
        setRemainingSeconds(ds);
        setEtaClock(computeEtaClock(ds));
        setStepDistanceMeters(initialStepDist);
        setIsOffRoute(false);
        setDistanceFromRoute(null);
      });
      // Reset off-route tracking when a new route is loaded
      offRouteSamplesRef.current = 0;
      offRouteConfirmedRef.current = false;
    }
  }, [route]);

  // Compass / Device Orientation Listener
  useEffect(() => {
    if (!active || typeof window === 'undefined') return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      let compass: number | null = null;
      // iOS Safari (webkitCompassHeading: 0 = North, clockwise)
      if (
        'webkitCompassHeading' in e &&
        typeof (e as unknown as { webkitCompassHeading: number }).webkitCompassHeading === 'number'
      ) {
        compass = (e as unknown as { webkitCompassHeading: number }).webkitCompassHeading;
      } else if (e.alpha !== null && e.alpha !== undefined && !isNaN(e.alpha)) {
        // Android / Chrome (alpha: 0 = North, counter-clockwise)
        compass = (360 - e.alpha) % 360;
      }

      if (compass !== null && !isNaN(compass) && compass >= 0 && compass <= 360) {
        compassHeadingRef.current = compass;

        // Smooth heading update
        const prev = currentSmoothedHeadingRef.current ?? compass;
        const smoothed = smoothAngle(prev, compass, 0.2);
        currentSmoothedHeadingRef.current = smoothed;
        setHeading(Math.round(smoothed));
      }
    };

    const win = window as unknown as Window & { ondeviceorientationabsolute?: unknown };
    if ('ondeviceorientationabsolute' in win) {
      window.addEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
    } else {
      window.addEventListener('deviceorientation', handleOrientation as EventListener, true);
    }

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
      window.removeEventListener('deviceorientation', handleOrientation as EventListener, true);
    };
  }, [active]);

  const handleGpsUpdate = useCallback(
    (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy: acc, speed, heading: hdg } = pos.coords;
      const now = pos.timestamp;

      const loc: LngLat = { lat: latitude, lng: longitude };
      setCurrentLocation(loc);
      setAccuracy(acc);
      setGpsStatus('active');
      setGpsError(null);

      // --- Speed & Movement Bearing ---
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

        // If moved >= 2.0 meters, compute forward GPS bearing
        if (dMeters >= 2.0) {
          const moveBearing = calculateBearing(prev, loc);
          movementBearingRef.current = moveBearing;
        }
      }
      // Deadband: speeds below 1.5 km/h are considered stationary (GPS drift)
      const displaySpeed = computedSpeed < 1.5 ? 0 : Math.min(computedSpeed, 120);
      setSpeedKmh(Math.round(displaySpeed * 10) / 10);

      // --- Heading Selection (Compass > GPS Coords > Movement Bearing) ---
      let rawHeading: number | null = null;
      if (compassHeadingRef.current !== null) {
        rawHeading = compassHeadingRef.current;
      } else if (hdg !== null && !isNaN(hdg) && hdg >= 0) {
        rawHeading = hdg;
      } else if (movementBearingRef.current !== null) {
        rawHeading = movementBearingRef.current;
      }

      if (rawHeading !== null) {
        const prev = currentSmoothedHeadingRef.current ?? rawHeading;
        const smoothed = smoothAngle(prev, rawHeading, 0.25);
        currentSmoothedHeadingRef.current = smoothed;
        setHeading(Math.round(smoothed));
      }

      prevPositionRef.current = { lat: latitude, lng: longitude, ts: now };

      if (!route || arrivedRef.current) return;

      // --- Off-route detection ───────────────────────────────────────────────
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

      // --- Remaining distance along the actual route polyline (Segment Projection) ---
      const { remainingMeters: distRemaining, closestSegmentIdx } = calcRemainingAlongRoute(
        route.coordinates,
        loc,
        lastSegmentIdxRef.current,
      );
      lastSegmentIdxRef.current = closestSegmentIdx;

      // Hysteresis deadband: do not fluctuate distance for small GPS noise (< 10 meters)
      const lastDist = lastReportedMetersRef.current;
      let stableDist = distRemaining;
      if (lastDist !== null && Math.abs(distRemaining - lastDist) < 10) {
        stableDist = lastDist;
      } else {
        lastReportedMetersRef.current = distRemaining;
        stableDist = distRemaining;
      }
      setRemainingMeters(stableDist);

      // --- Arrival detection ---
      const dest = route.coordinates[route.coordinates.length - 1];
      const destLoc: LngLat = { lat: dest[1], lng: dest[0] };
      const distToDest = haversineDistance(loc, destLoc);

      if (distToDest <= ARRIVAL_RADIUS_M) {
        arrivedRef.current = true;
        setArrived(true);
        setRemainingMeters(0);
        setRemainingSeconds(0);
        setStepDistanceMeters(0);
        setEtaClock('Arrived');
        lastReportedMetersRef.current = 0;
        lastReportedSecondsRef.current = 0;
        onArrival?.();
        return;
      }

      // --- Stable Remaining Time & ETA Clock ---
      const totalRouteDist = route.distance_meters > 0 ? route.distance_meters : 1;
      const totalRouteSec = route.duration_seconds > 0 ? route.duration_seconds : 1;
      const progressFraction = Math.max(0, Math.min(1, stableDist / totalRouteDist));
      const targetSec = Math.round(totalRouteSec * progressFraction);

      const currentSec = lastReportedSecondsRef.current;
      if (currentSec === null || Math.abs(currentSec - targetSec) > 10) {
        lastReportedSecondsRef.current = targetSec;
        setRemainingSeconds(targetSec);
        setEtaClock(computeEtaClock(targetSec));
      }

      // --- Auto-advance route steps & Countdown Distance to Next Maneuver ---
      const steps = route.steps;
      const currentIdx = stepIdxRef.current;
      const nextStepIdx = currentIdx + 1;

      // Compute live remaining distance to the upcoming waypoint
      const targetWaypoint = steps[nextStepIdx]?.coordinate ?? steps[currentIdx]?.coordinate;
      if (targetWaypoint) {
        const dStep = Math.max(
          0,
          Math.round(haversineDistance(loc, { lat: targetWaypoint[1], lng: targetWaypoint[0] }))
        );
        setStepDistanceMeters(dStep);
      }

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
      lastSegmentIdxRef.current = 0;
      lastReportedMetersRef.current = null;
      lastReportedSecondsRef.current = null;
      compassHeadingRef.current = null;
      movementBearingRef.current = null;
      currentSmoothedHeadingRef.current = null;
      offRouteSamplesRef.current = 0;
      offRouteConfirmedRef.current = false;
      lastRerouteTsRef.current = 0;

      Promise.resolve().then(() => {
        setElapsedSeconds(0);
        setSpeedKmh(0);
        setHeading(null);
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

    // Start elapsed timer and smooth countdown timer
    startTimeRef.current = Date.now();
    elapsedTimerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
      setRemainingSeconds((prev) => {
        if (prev <= 1 || arrivedRef.current) return prev;
        const next = prev - 1;
        lastReportedSecondsRef.current = next;
        setEtaClock(computeEtaClock(next));
        return next;
      });
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
    etaClock,
    stepDistanceMeters,
    currentStepIdx,
    arrived,
    gpsStatus,
    gpsError,
    isOffRoute,
    distanceFromRoute,
  }), [
    currentLocation, accuracy, speedKmh, heading, elapsedSeconds,
    remainingMeters, remainingSeconds, etaClock, stepDistanceMeters,
    currentStepIdx, arrived, gpsStatus, gpsError,
    isOffRoute, distanceFromRoute,
  ]);
}
