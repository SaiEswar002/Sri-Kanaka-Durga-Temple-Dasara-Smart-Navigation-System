'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Map as MapInstance, Marker as MarkerInstance } from 'maplibre-gl';
import type { LngLat, NavigationRoute, Location } from '@/types';
import { getMapTileProvider } from '@/services/map/tile-provider';
import { cn } from '@/lib/utils';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapProps {
  center?: LngLat;
  zoom?: number;
  userLocation?: LngLat | null;
  destination?: LngLat | null;
  destinations?: Location[];
  route?: NavigationRoute | null;
  className?: string;
  onLocationClick?: (location: Location) => void;
  interactive?: boolean;
  showUserLocation?: boolean;
  onMapReady?: () => void;
}

// Default center: Vijayawada, India (near temple)
const DEFAULT_CENTER: LngLat = { lng: 80.6238, lat: 16.5145 };
const DEFAULT_ZOOM = 15;

// Cache the maplibre-gl module so we only import it once
let maplibrePromise: Promise<typeof import('maplibre-gl')> | null = null;
function getMapLibre() {
  if (!maplibrePromise) {
    maplibrePromise = import('maplibre-gl');
  }
  return maplibrePromise;
}

export function MapView({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  userLocation,
  destination: _destination,
  destinations = [],
  route,
  className,
  onLocationClick,
  interactive = true,
  showUserLocation: _showUserLocation = true,
  onMapReady,
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const markersRef = useRef<MarkerInstance[]>([]);

  const initMap = useCallback(async () => {
    if (!mapContainer.current || mapRef.current) return;

    try {
      const maplibregl = await getMapLibre();

      // Re-check after async import — component may have unmounted
      if (!mapContainer.current || mapRef.current) return;

      const provider = getMapTileProvider();
      const { styleUrl } = provider.getStyle();

      // Handle inline style object (for OSM fallback)
      let style: string | object;
      try {
        style = JSON.parse(styleUrl);
      } catch {
        style = styleUrl;
      }

      const map = new maplibregl.Map({
        container: mapContainer.current!,
        style: style as string,
        center: [center.lng, center.lat],
        zoom,
        interactive,
        attributionControl: false,
      });

      mapRef.current = map;

      map.on('load', () => {
        setIsLoading(false);
        onMapReady?.();
      });

      map.on('error', (e: unknown) => {
        console.error('[Map] Error:', e);
        setError('Map failed to load. Please check your connection.');
        setIsLoading(false);
      });

      // Timeout fallback — if map doesn't load in 10s, show error
      const timeout = setTimeout(() => {
        if (isLoading) {
          setIsLoading(false);
        }
      }, 10000);

      return () => {
        clearTimeout(timeout);
        map.remove();
        mapRef.current = null;
      };
    } catch (err) {
      console.error('[Map] Failed to initialize:', err);
      setError('Map could not be loaded.');
      setIsLoading(false);
    }
  }, [center.lat, center.lng, interactive, onMapReady, zoom]);

  useEffect(() => {
    const cleanup = initMap();
    return () => {
      cleanup?.then((fn) => fn?.());
    };
  }, [initMap]);

  // Update user location marker
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;
    const updateUserMarker = async () => {
      const map = mapRef.current;
      if (!map) return;
      const maplibregl = await getMapLibre();

      // Remove existing user marker
      const existing = document.getElementById('user-location-marker');
      if (existing) existing.remove();

      const el = document.createElement('div');
      el.id = 'user-location-marker';
      el.className = 'user-location-marker';
      el.style.cssText = `
        width: 20px; height: 20px;
        background: #2563eb; border: 3px solid white;
        border-radius: 50%; box-shadow: 0 2px 8px rgba(37,99,235,0.5);
        position: relative;
      `;

      // Pulse ring
      const pulse = document.createElement('div');
      pulse.style.cssText = `
        position: absolute; inset: -8px;
        border: 2px solid rgba(37,99,235,0.4);
        border-radius: 50%;
        animation: pulse-location 2s ease-out infinite;
      `;
      el.appendChild(pulse);

      new maplibregl.Marker({ element: el })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map);

      map.easeTo({ center: [userLocation.lng, userLocation.lat] });
    };
    updateUserMarker();
  }, [userLocation]);

  // Render destination markers
  useEffect(() => {
    if (!mapRef.current) return;
    const renderMarkers = async () => {
      const map = mapRef.current;
      if (!map) return;
      const maplibregl = await getMapLibre();

      // Clear old markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      destinations.forEach((loc) => {
        if (!loc.position?.coordinates) return;
        const [lng, lat] = loc.position.coordinates;

        const el = document.createElement('button');
        el.setAttribute('aria-label', loc.name);
        el.style.cssText = `
          background: ${loc.category?.color ?? '#9b1b30'};
          width: 36px; height: 36px; border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg); border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3); cursor: pointer;
          transition: transform 0.15s ease;
        `;
        el.addEventListener('mouseenter', () => { el.style.transform = 'rotate(-45deg) scale(1.1)'; });
        el.addEventListener('mouseleave', () => { el.style.transform = 'rotate(-45deg)'; });
        if (onLocationClick) {
          el.addEventListener('click', () => onLocationClick(loc));
        }

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map);

        markersRef.current.push(marker);
      });
    };
    renderMarkers();
  }, [destinations, onLocationClick]);

  // Render route
  useEffect(() => {
    if (!mapRef.current || !route) return;
    const renderRoute = async () => {
      const map = mapRef.current;
      if (!map) return;

      // Wait for map to be loaded
      if (!map.isStyleLoaded()) {
        map.once('load', () => renderRoute());
        return;
      }

      // Remove existing route layers
      if (map.getLayer('route-line')) map.removeLayer('route-line');
      if (map.getSource('route')) map.removeSource('route');

      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: route.coordinates,
          },
          properties: {},
        },
      });

      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#9b1b30',
          'line-width': 4,
          'line-opacity': 0.9,
        },
      });

      // Fit map to route
      const maplibregl = await getMapLibre();
      const coords = route.coordinates;
      if (coords.length > 1) {
        const bounds = coords.reduce(
          (b, c) => b.extend(c as [number, number]),
          new maplibregl.LngLatBounds(coords[0] as [number, number], coords[0] as [number, number])
        );
        map.fitBounds(bounds, { padding: 60, maxZoom: 17 });
      }
    };
    renderRoute();
  }, [route]);

  if (error) {
    return (
      <div className={cn('flex items-center justify-center bg-gray-50 rounded-lg', className)}>
        <div className="text-center p-4">
          <p className="text-sm text-gray-600">{error}</p>
          <button
            className="btn btn-outline btn-sm mt-3"
            onClick={() => { setError(null); setIsLoading(true); mapRef.current = null; initMap(); }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">Loading map...</p>
          </div>
        </div>
      )}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Pulse animation */}
      <style jsx>{`
        @keyframes pulse-location {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
