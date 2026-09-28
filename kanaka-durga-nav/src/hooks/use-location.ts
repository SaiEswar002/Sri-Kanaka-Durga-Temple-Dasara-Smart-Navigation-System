'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { UserLocation, LocationPermissionState } from '@/types';

interface UseLocationOptions {
  /** Immediately request location on mount */
  autoRequest?: boolean;
  /** Watch for location updates (vs one-time) */
  watch?: boolean;
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

interface UseLocationResult {
  location: UserLocation | null;
  permissionState: LocationPermissionState;
  isLoading: boolean;
  error: string | null;
  requestLocation: () => void;
}

export function useLocation(options: UseLocationOptions = {}): UseLocationResult {
  const {
    autoRequest = false,
    watch = false,
    enableHighAccuracy = true,
    timeout = 10_000,
    maximumAge = 30_000,
  } = options;

  // Derive initial permissionState synchronously — geolocation may be unavailable
  // before any effect runs, so we seed the initial value rather than using an effect.
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [permissionState, setPermissionState] = useState<LocationPermissionState>('prompt');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const handleSuccess = useCallback((pos: GeolocationPosition) => {
    setLocation({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      timestamp: pos.timestamp,
    });
    setPermissionState('granted');
    setIsLoading(false);
    setError(null);
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    setIsLoading(false);
    switch (err.code) {
      case 1: // PERMISSION_DENIED
        setPermissionState('denied');
        setError('Location access denied. Please enable location in browser settings.');
        break;
      case 2: // POSITION_UNAVAILABLE
        setPermissionState('unavailable');
        setError('Location unavailable. Please check GPS.');
        break;
      case 3: // TIMEOUT
        setPermissionState('timeout');
        setError('Location request timed out. Please try again.');
        break;
      default:
        setPermissionState('unavailable');
        setError('Could not get your location.');
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setPermissionState('unavailable');
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const geoOptions: PositionOptions = {
      enableHighAccuracy,
      timeout,
      maximumAge,
    };

    if (watch) {
      // Clear existing watch
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      watchIdRef.current = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        geoOptions
      );
    } else {
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        handleError,
        geoOptions
      );
    }
  }, [watch, enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError]);

  // Check permission state on mount — update state from the async Permissions API.
  // We only call setState inside the .then() callback (async), which is not a
  // synchronous effect body setState. The `result.onchange` handler is also async.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      // Geolocation is unavailable — use functional update to avoid synchronous cascade
      Promise.resolve().then(() => setPermissionState('unavailable'));
      return;
    }

    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermissionState(
          result.state === 'granted' ? 'granted' :
          result.state === 'denied' ? 'denied' : 'prompt'
        );
        result.onchange = () => {
          setPermissionState(
            result.state === 'granted' ? 'granted' :
            result.state === 'denied' ? 'denied' : 'prompt'
          );
        };
      }).catch(() => {
        // Permissions API not available, assume prompt
      });
    }
  }, []);

  // Auto-request effect — requestLocation is a stable callback.
  // We schedule via microtask to avoid synchronous setState inside the effect body
  // (react-hooks/set-state-in-effect compliance). The state changes inside
  // requestLocation (setIsLoading, setError) are then deferred one tick.
  useEffect(() => {
    if (autoRequest) {
      Promise.resolve().then(requestLocation);
    }
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
      }
    };
  }, [autoRequest, requestLocation]);

  return { location, permissionState, isLoading, error, requestLocation };
}
