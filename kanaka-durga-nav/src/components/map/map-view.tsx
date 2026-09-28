'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type * as LeafletType from 'leaflet';
import type { LngLat, NavigationRoute, Location, RouteClosure } from '@/types';
import { getMapTileProvider } from '@/services/map/tile-provider';
import { cn } from '@/lib/utils';
import 'leaflet/dist/leaflet.css';

interface MapProps {
  center?: LngLat;
  zoom?: number;
  userLocation?: LngLat | null;
  destination?: LngLat | null;
  destinations?: Location[];
  route?: NavigationRoute | null;
  /** Active route closures to render as warning overlays */
  closures?: RouteClosure[];
  className?: string;
  onLocationClick?: (location: Location) => void;
  interactive?: boolean;
  showUserLocation?: boolean;
  onMapReady?: () => void;
}

// Default center: Indrakeeladri Hill / Sri Kanaka Durga Temple, Vijayawada
const DEFAULT_CENTER: LngLat = { lng: 80.6238, lat: 16.5148 };
const DEFAULT_ZOOM = 15;

// Cache leaflet dynamic import
let leafletPromise: Promise<typeof import('leaflet')> | null = null;
function getLeaflet() {
  if (!leafletPromise) {
    leafletPromise = import('leaflet');
  }
  return leafletPromise;
}

// Category color and icon mapper
function getCategoryInfo(categorySlug?: string): { bg: string; icon: string } {
  switch (categorySlug) {
    case 'darshan':
      return { bg: '#9b1b30', icon: '🛕' };
    case 'parking':
      return { bg: '#2563eb', icon: '🅿️' };
    case 'food':
      return { bg: '#ea580c', icon: '🍲' };
    case 'medical':
      return { bg: '#dc2626', icon: '➕' };
    case 'bus':
      return { bg: '#059669', icon: '🚌' };
    case 'ghat':
      return { bg: '#0284c7', icon: '🌊' };
    default:
      return { bg: '#7a1425', icon: '📍' };
  }
}

export function MapView({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  userLocation,
  destination,
  destinations = [],
  route,
  closures = [],
  className,
  onLocationClick,
  interactive = true,
  showUserLocation: _showUserLocation = true,
  onMapReady,
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletType.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Layer groups and markers
  const userMarkerRef = useRef<LeafletType.Marker | null>(null);
  const destMarkerRef = useRef<LeafletType.Marker | null>(null);
  const markersGroupRef = useRef<LeafletType.LayerGroup | null>(null);
  const routeGroupRef = useRef<LeafletType.LayerGroup | null>(null);
  const closuresGroupRef = useRef<LeafletType.LayerGroup | null>(null);

  // Safe helper to check if map is valid and ready
  const isMapAlive = useCallback((): boolean => {
    const map = mapRef.current;
    if (!map) return false;
    try {
      const container = map.getContainer();
      return !!(container && container.isConnected && (map as unknown as { _loaded?: boolean })._loaded);
    } catch {
      return false;
    }
  }, []);

  // 1. Initialize Map once
  useEffect(() => {
    let isMounted = true;

    async function init() {
      if (!mapContainer.current) return;
      const container = mapContainer.current;

      // Clean up previous instance if container is dirty
      if ((container as unknown as { _leaflet_id?: number })._leaflet_id) {
        delete (container as unknown as { _leaflet_id?: number })._leaflet_id;
      }

      try {
        const L = await getLeaflet();
        if (!isMounted || !mapContainer.current) return;

        // Create Leaflet map with zoom animations disabled to prevent _leaflet_pos runtime errors
        const map = L.map(mapContainer.current, {
          center: [center.lat, center.lng],
          zoom,
          zoomControl: false,
          attributionControl: false,
          zoomAnimation: false,
          fadeAnimation: false,
          markerZoomAnimation: false,
          dragging: interactive,
          scrollWheelZoom: interactive,
          touchZoom: interactive,
          doubleClickZoom: interactive,
        });

        mapRef.current = map;

        // Custom Zoom Control at bottom right
        if (interactive) {
          L.control.zoom({ position: 'bottomright' }).addTo(map);
        }

        // Attribution
        L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map);

        // Add Tile Layer
        const provider = getMapTileProvider();
        const tileConfig = provider.getTileConfig();

        const tiles = L.tileLayer(tileConfig.url, {
          attribution: tileConfig.attribution,
          subdomains: tileConfig.subdomains ?? ['a', 'b', 'c', 'd'],
          maxZoom: tileConfig.maxZoom ?? 20,
          tileSize: tileConfig.tileSize ?? 256,
        });

        tiles.addTo(map);

        // Marker & Route & Closure layer groups
        markersGroupRef.current = L.layerGroup().addTo(map);
        routeGroupRef.current = L.layerGroup().addTo(map);
        closuresGroupRef.current = L.layerGroup().addTo(map);

        // Mark ready when map is initialized
        let loadingCleared = false;
        const clearLoading = () => {
          if (!loadingCleared && isMounted) {
            loadingCleared = true;
            setMapReady(true);
            setIsLoading(false);
            onMapReady?.();
          }
        };

        map.whenReady(clearLoading);

        // Also clear loading on first tile (so user sees map immediately)
        tiles.once('tileload', clearLoading);

        // Safety fallback: clear loading after 4 seconds regardless
        const loadTimeout = setTimeout(clearLoading, 4000);

        // Watch for container resizes
        const resizeObserver = new ResizeObserver(() => {
          if (isMapAlive()) {
            map.invalidateSize();
          }
        });
        resizeObserver.observe(container);

        return () => {
          clearTimeout(loadTimeout);
          resizeObserver.disconnect();
        };
      } catch (err) {
        console.error('[MapView] Leaflet initialization error:', err);
        if (isMounted) {
          setError('Map could not be loaded. Please reload.');
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
      setMapReady(false);
      if (mapRef.current) {
        const map = mapRef.current;
        mapRef.current = null;
        try {
          map.stop();
          map.remove();
        } catch {
          // Ignore cleanup errors during unmount
        }
      }
    };
  }, []); // Run on mount only

  // 2. Center / Zoom prop updates (safe setView without flyTo matrix crash)
  useEffect(() => {
    if (!mapReady || !isMapAlive()) return;
    const map = mapRef.current;
    if (!map) return;

    try {
      map.setView([center.lat, center.lng], zoom, { animate: false });
    } catch (e) {
      console.warn('[MapView] Center update error:', e);
    }
  }, [center.lat, center.lng, zoom, mapReady, isMapAlive]);

  // 3. User Location Marker
  useEffect(() => {
    if (!mapReady || !isMapAlive()) return;

    async function updateUser() {
      const map = mapRef.current;
      if (!map || !isMapAlive()) return;
      const L = await getLeaflet();
      if (!mapRef.current) return;

      if (!userLocation) {
        if (userMarkerRef.current) {
          userMarkerRef.current.remove();
          userMarkerRef.current = null;
        }
        return;
      }

      const pulseIcon = L.divIcon({
        className: 'user-pulse-icon-wrapper',
        html: `
          <div class="user-pulse-marker">
            <div class="pulse-ring"></div>
            <div class="pulse-core"></div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
          icon: pulseIcon,
          zIndexOffset: 1000,
        }).addTo(map);
      } else {
        userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      }
    }

    updateUser();
  }, [userLocation, mapReady, isMapAlive]);

  // 4. Destination Marker & Auto-framing
  useEffect(() => {
    if (!mapReady || !isMapAlive()) return;

    async function updateDestination() {
      const map = mapRef.current;
      if (!map || !isMapAlive()) return;
      const L = await getLeaflet();
      if (!mapRef.current) return;

      if (!destination) {
        if (destMarkerRef.current) {
          destMarkerRef.current.remove();
          destMarkerRef.current = null;
        }
        return;
      }

      const destIcon = L.divIcon({
        className: 'dest-pin-wrapper',
        html: `
          <div class="dest-pin-marker">
            <div class="dest-pin-badge">🛕</div>
            <div class="dest-pin-point"></div>
          </div>
        `,
        iconSize: [38, 44],
        iconAnchor: [19, 44],
      });

      if (!destMarkerRef.current) {
        destMarkerRef.current = L.marker([destination.lat, destination.lng], {
          icon: destIcon,
          zIndexOffset: 950,
        }).addTo(map);
      } else {
        destMarkerRef.current.setLatLng([destination.lat, destination.lng]);
      }

      // If no route polyline is currently active, fit or center without crashing
      if (!route) {
        try {
          if (userLocation) {
            const bounds = L.latLngBounds(
              [userLocation.lat, userLocation.lng],
              [destination.lat, destination.lng]
            );
            map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17, animate: false });
          } else {
            map.setView([destination.lat, destination.lng], 16, { animate: false });
          }
        } catch {}
      }
    }

    updateDestination();
  }, [destination, route, userLocation, mapReady, isMapAlive]);

  // 5. Render Facility Destinations
  useEffect(() => {
    if (!mapReady || !isMapAlive()) return;
    const group = markersGroupRef.current;
    if (!group) return;

    async function renderDestinations() {
      const L = await getLeaflet();
      if (!isMapAlive() || !group) return;

      group.clearLayers();

      destinations.forEach((loc) => {
        if (!loc.position?.coordinates) return;
        const [lng, lat] = loc.position.coordinates;

        // Skip selected destination (drawn distinctly)
        if (destination && Math.abs(destination.lat - lat) < 0.0001 && Math.abs(destination.lng - lng) < 0.0001) {
          return;
        }

        const cat = getCategoryInfo(loc.category?.slug);

        const markerIcon = L.divIcon({
          className: 'facility-marker-wrapper',
          html: `
            <div class="facility-marker-pin" style="background-color: ${cat.bg};">
              <span class="facility-icon">${cat.icon}</span>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16],
        });

        const marker = L.marker([lat, lng], { icon: markerIcon });

        // Popup card
        const popupCard = document.createElement('div');
        popupCard.className = 'facility-popup-card';
        const sectorName = (loc.sector as { name?: string } | null)?.name;
        const subSectorName = (loc.sub_sector as { name?: string } | null)?.name;
        popupCard.innerHTML = `
          <div class="font-bold text-xs sm:text-sm text-[#9b1b30] mb-0.5 leading-snug">${loc.name}</div>
          ${loc.name_te ? `<div class="text-[11px] text-gray-500 font-medium mb-1">${loc.name_te}</div>` : ''}
          ${sectorName ? `<div class="text-[10px] font-semibold text-gray-700 bg-amber-50 rounded px-1.5 py-0.5 inline-block mb-1 border border-amber-200">📍 ${sectorName}${subSectorName ? ` &rsaquo; ${subSectorName}` : ''}</div>` : ''}
          ${loc.address ? `<div class="text-[10px] text-gray-600 mb-2 truncate max-w-[200px]">${loc.address}</div>` : ''}
          <button class="navigate-btn">
            Select Destination / ఎంచుకోండి
          </button>
        `;

        const btn = popupCard.querySelector('.navigate-btn');
        if (btn) {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            onLocationClick?.(loc);
            marker.closePopup();
          });
        }

        marker.bindPopup(popupCard, { maxWidth: 240, minWidth: 180, className: 'temple-popup' });
        marker.on('click', () => {
          onLocationClick?.(loc);
        });

        group.addLayer(marker);
      });

      // Auto-fit bounds if viewing all facilities and no single destination is selected
      const map = mapRef.current;
      if (map && !destination && !route && destinations.length > 0) {
        try {
          const validCoords = destinations
            .filter((d) => d.position?.coordinates)
            .map((d) => [d.position.coordinates[1], d.position.coordinates[0]] as [number, number]);
          if (validCoords.length > 0) {
            const bounds = L.latLngBounds(validCoords);
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16, animate: false });
          }
        } catch {}
      }
    }

    renderDestinations();
  }, [destinations, destination, route, onLocationClick, mapReady, isMapAlive]);

  // 6. Render Route Line
  useEffect(() => {
    if (!mapReady || !isMapAlive()) return;
    const group = routeGroupRef.current;
    const map = mapRef.current;
    if (!group || !map) return;

    async function renderRoute() {
      const L = await getLeaflet();
      if (!isMapAlive() || !group || !map) return;

      group.clearLayers();

      if (!route || !route.coordinates || route.coordinates.length < 2) return;

      const latLngs = route.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);

      // Amber glow underlayer
      const glow = L.polyline(latLngs, {
        color: '#f59e0b',
        weight: 8,
        opacity: 0.55,
        lineCap: 'round',
        lineJoin: 'round',
      });

      // Durga Maroon main route
      const line = L.polyline(latLngs, {
        color: '#9b1b30',
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      });

      group.addLayer(glow);
      group.addLayer(line);

      try {
        map.fitBounds(line.getBounds(), {
          padding: [50, 50],
          maxZoom: 18,
          animate: false,
        });
      } catch {}
    }

    renderRoute();
  }, [route, mapReady, isMapAlive]);

  // 7. Render Active Closure Lines/Areas
  useEffect(() => {
    if (!mapReady || !isMapAlive()) return;
    const group = closuresGroupRef.current;
    const map = mapRef.current;
    if (!group || !map) return;

    async function renderClosures() {
      const L = await getLeaflet();
      if (!isMapAlive() || !group) return;

      group.clearLayers();

      const activeClosures = closures.filter(
        (c) => c.status === 'ACTIVE' || c.status === 'SCHEDULED'
      );

      for (const closure of activeClosures) {
        // Render closure_line (primary geometry)
        if (closure.closure_line?.coordinates && closure.closure_line.coordinates.length >= 2) {
          const latLngs = closure.closure_line.coordinates.map(
            ([lng, lat]) => [lat, lng] as [number, number]
          );

          // Red glow underlayer
          const glow = L.polyline(latLngs, {
            color: '#ef4444',
            weight: 10,
            opacity: 0.25,
            dashArray: undefined,
          });

          // Dashed red warning line
          const closureLine = L.polyline(latLngs, {
            color: '#dc2626',
            weight: 4,
            opacity: 0.85,
            dashArray: '8 6',
            lineCap: 'round',
          });

          const popupContent = `
            <div style="font-family:sans-serif;max-width:200px">
              <div style="color:#dc2626;font-weight:700;font-size:13px;margin-bottom:4px">🚫 ${closure.title}</div>
              ${closure.reason ? `<div style="font-size:11px;color:#555;margin-bottom:4px">${closure.reason}</div>` : ''}
              <div style="font-size:10px;color:#888">${closure.closure_type} closure</div>
            </div>
          `;
          closureLine.bindPopup(popupContent);
          group.addLayer(glow);
          group.addLayer(closureLine);
        }

        // Render affected_area polygon bounding box
        if (closure.affected_area?.coordinates?.[0]) {
          const ring = closure.affected_area.coordinates[0];
          const latLngs = ring.map(([lng, lat]) => [lat, lng] as [number, number]);
          const poly = L.polygon(latLngs, {
            color: '#dc2626',
            weight: 2,
            opacity: 0.6,
            fillColor: '#ef4444',
            fillOpacity: 0.12,
          });
          const popupContent = `
            <div style="font-family:sans-serif;max-width:200px">
              <div style="color:#dc2626;font-weight:700;font-size:13px;margin-bottom:4px">🚫 ${closure.title}</div>
              ${closure.reason ? `<div style="font-size:11px;color:#555;margin-bottom:4px">${closure.reason}</div>` : ''}
              <div style="font-size:10px;color:#888">${closure.closure_type} closure area</div>
            </div>
          `;
          poly.bindPopup(popupContent);
          group.addLayer(poly);
        }
      }
    }

    renderClosures();
  }, [closures, mapReady, isMapAlive]);

  if (error) {
    return (
      <div className={cn('flex items-center justify-center bg-gray-50 rounded-lg p-6', className)}>
        <div className="text-center p-4 max-w-sm">
          <p className="text-sm font-semibold text-gray-700 mb-2">{error}</p>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              setError(null);
              setIsLoading(true);
              window.location.reload();
            }}
          >
            Retry Map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative w-full h-full overflow-hidden select-none', className)}>
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-50/90 backdrop-blur-xs flex items-center justify-center z-20">
          <div className="text-center">
            <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-gray-600 font-semibold tracking-wide">Loading Temple Map...</p>
          </div>
        </div>
      )}

      {/* Map DOM Element */}
      <div ref={mapContainer} className="w-full h-full min-h-full" style={{ minHeight: '300px' }} />

      {/* Global CSS for markers and popups */}
      <style jsx global>{`
        /* User GPS Pulse */
        .user-pulse-marker {
          position: relative;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pulse-core {
          width: 14px;
          height: 14px;
          background: #2563eb;
          border: 2.5px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.6);
          z-index: 2;
        }
        .pulse-ring {
          position: absolute;
          inset: -4px;
          border: 3px solid rgba(37, 99, 235, 0.5);
          border-radius: 50%;
          animation: user-beacon-pulse 2s ease-out infinite;
          z-index: 1;
        }
        @keyframes user-beacon-pulse {
          0% { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(2.6); opacity: 0; }
        }

        /* Destination Pin */
        .dest-pin-marker {
          position: relative;
          width: 38px;
          height: 44px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .dest-pin-badge {
          width: 34px;
          height: 34px;
          background: linear-gradient(135deg, #9b1b30, #7a1425);
          border: 2.5px solid #fde047;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
          box-shadow: 0 4px 12px rgba(122, 20, 37, 0.5);
          color: white;
        }
        .dest-pin-point {
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 8px solid #7a1425;
          margin-top: -2px;
        }

        /* Facility Markers */
        .facility-marker-pin {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .facility-marker-pin:hover {
          transform: scale(1.15);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
        }
        .facility-icon {
          font-size: 14px;
          line-height: 1;
        }

        /* Popups */
        .temple-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          padding: 4px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
          border: 1px solid rgba(155, 27, 48, 0.15);
        }
        .temple-popup .leaflet-popup-content {
          margin: 8px;
          line-height: 1.4;
        }
        .navigate-btn {
          width: 100%;
          background: #9b1b30;
          color: #ffffff;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: background-color 0.15s ease;
          display: block;
          text-align: center;
        }
        .navigate-btn:hover {
          background: #7a1425;
        }

        /* Leaflet Controls */
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          border-radius: 8px !important;
          overflow: hidden;
        }
        .leaflet-control-zoom a {
          background: #ffffff !important;
          color: #333333 !important;
          font-weight: bold !important;
          width: 32px !important;
          height: 32px !important;
          line-height: 32px !important;
          border-bottom: 1px solid #e5e7eb !important;
        }
        .leaflet-control-attribution {
          background: rgba(255, 255, 255, 0.85) !important;
          backdrop-filter: blur(4px);
          font-size: 9px !important;
          border-radius: 4px;
          padding: 2px 6px !important;
          margin: 4px !important;
        }
      `}</style>
    </div>
  );
}
