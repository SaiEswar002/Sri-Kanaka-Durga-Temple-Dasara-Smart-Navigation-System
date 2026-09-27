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
 *
 * FIX: remainingMeters is now computed by summing the route polyline segments
 * AHEAD of the closest point on the route — not a straight-line haversine to
 * the destination, which always undershoots on curved roads.
 *
 * remainingSeconds is estimated using:
 *   - Current GPS speed if > 1 km/h
 *   - Otherwise the OSRM-provided average pace (route duration / distance)
 *   - Minimum fallback: average pedestrian 1.2 m/s
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { NavigationRoute, LngLat } from '@/types';
import { haversineDistance } from '@/services/routing/routing-service';

// How close (meters) to a step coordinate before auto-advancing
const STEP_ADVANCE_RADIUS_M = 25;
// How close (meters) to destination to trigger arrival
const ARRIVAL_RADIUS_M = 30;

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
}

interface UseLiveNavigationOptions {
  route: NavigationRoute | null;
  /** Whether live tracking is active */
  active: boolean;
  /** Overridden starting step index (from user pressing "Next Step") */
  externalStepIdx?: number;
  onStepAdvance?: (newIdx: number) => void;
  onArrival?: () => void;
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

export function useLiveNavigation({
  route,
  active,
  externalStepIdx,
  onStepAdvance,
  onArrival,
}: UseLiveNavigationOptions): LiveNavigationState {
  const [currentLocation, setCurrentLocation] = useState<LngLat | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [heading, setHeading] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [remainingMeters, setRemainingMeters] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [arrived, setArrived] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<LiveNavigationState['gpsStatus']>('waiting');
  const [gpsError, setGpsError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPositionRef = useRef<{ lat: number; lng: number; ts: number } | null>(null);
  const arrivedRef = useRef(false);
  const stepIdxRef = useRef(0);

  // Keep stepIdx in sync with external control (user presses "Next Step")
  useEffect(() => {
    if (externalStepIdx !== undefined) {
      stepIdxRef.current = externalStepIdx;
      setCurrentStepIdx(externalStepIdx);
    }
  }, [externalStepIdx]);

  // Initialise remaining from OSRM route values on first load
  useEffect(() => {
    if (route) {
      setRemainingMeters(route.distance_meters);
      setRemainingSeconds(route.duration_seconds);
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
      // GeolocationCoordinates.speed can be null on many devices. Compute from diff.
      let computedSpeed = 0;
      if (speed !== null && speed >= 0) {
        computedSpeed = speed * 3.6; // m/s → km/h
      } else if (prevPositionRef.current) {
        const prev = prevPositionRef.current;
        const dMeters = haversineDistance(prev, loc);
        const dSec = (now - prev.ts) / 1000;
        if (dSec > 0.5 && dMeters > 0.5) {
          computedSpeed = (dMeters / dSec) * 3.6;
        }
      }
      // Clamp: pedestrian max ~8 km/h walking briskly, allow up to 15 for rickshaws
      const clampedSpeed = Math.min(computedSpeed, 15);
      setSpeedKmh(clampedSpeed);

      // --- Heading ---
      if (hdg !== null && hdg >= 0) {
        setHeading(hdg);
      }

      prevPositionRef.current = { lat: latitude, lng: longitude, ts: now };

      if (!route || arrivedRef.current) return;

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
      // Strategy: use current GPS speed if reliable (> 1 km/h moving),
      // else use the OSRM-provided pace for this route (duration/distance),
      // with a minimum fallback of 1.2 m/s (average pedestrian).
      let mps: number;
      if (clampedSpeed > 1.0) {
        // User is moving — use their actual speed
        mps = clampedSpeed / 3.6;
      } else if (route.distance_meters > 0) {
        // Use OSRM average pace for this route (more accurate than 1.2 m/s constant)
        const routePaceMps = route.distance_meters / route.duration_seconds;
        mps = Math.max(routePaceMps, 1.0); // at least 1.0 m/s
      } else {
        mps = 1.2; // fallback: average pedestrian walking speed
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
    [route, onArrival, onStepAdvance],
  );

  const handleGpsError = useCallback((err: GeolocationPositionError) => {
    setGpsStatus(err.code === 1 ? 'denied' : 'error');
    setGpsError(err.message);
  }, []);

  // Start / stop GPS watch and elapsed timer
  useEffect(() => {
    if (!active) {
      // Cleanup
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (elapsedTimerRef.current !== null) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
      // Reset state
      startTimeRef.current = null;
      prevPositionRef.current = null;
      arrivedRef.current = false;
      stepIdxRef.current = 0;
      setElapsedSeconds(0);
      setSpeedKmh(0);
      setArrived(false);
      setCurrentStepIdx(0);
      setGpsStatus('waiting');
      return;
    }

    // Start GPS watch
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        handleGpsUpdate,
        handleGpsError,
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 2_000 },
      );
      setGpsStatus('waiting');
    } else {
      setGpsStatus('error');
      setGpsError('Geolocation not supported');
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

  return {
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
  };
}
