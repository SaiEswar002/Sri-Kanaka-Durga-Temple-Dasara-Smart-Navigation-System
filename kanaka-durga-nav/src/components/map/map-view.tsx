'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type * as LeafletType from 'leaflet';
import type { LngLat, NavigationRoute, Location } from '@/types';
import { getMapTileProvider } from '@/services/map/tile-provider';
import { cn } from '@/lib/utils';
import 'leaflet/dist/leaflet.css';

interface MapProps {
  center?: LngLat;
  zoom?: number;
  userLocation?: LngLat | null;
  destination?: LngLat | null;
  selectedLocation?: Location | null;
  destinations?: Location[];
  route?: NavigationRoute | null;
  className?: string;
  onLocationClick?: (location: Location) => void;
  interactive?: boolean;
  showUserLocation?: boolean;
  onMapReady?: () => void;
  /** Fired when user manually pans or touches the map, disabling autoFollow */
  onUserInteraction?: () => void;
  /** Trigger counter to force recentering */
  recenterTrigger?: number;
  /** When true, map smoothly tracks userLocation updates */
  autoFollow?: boolean;
  /** Active turn-by-turn navigation mode */
  isNavigating?: boolean;
  /** User heading angle in degrees (0 = North, 90 = East) */
  heading?: number | null;
  /** Map rotation orientation mode: heads-up (follows heading) or north-up (fixed North) */
  mapRotationMode?: 'heads-up' | 'north-up';
}

// Default center: Indrakeeladri Hill / Sri Kanaka Durga Temple, Vijayawada
const DEFAULT_CENTER: LngLat = { lng: 80.6065, lat: 16.5154 };
const DEFAULT_ZOOM = 16;
const NAV_ZOOM = 18;

// Cache leaflet dynamic import
let leafletPromise: Promise<typeof import('leaflet')> | null = null;
function getLeaflet() {
  if (!leafletPromise) {
    leafletPromise = import('leaflet');
  }
  return leafletPromise;
}

/** Compute point D meters ahead along bearing in degrees (for perspective camera offset) */
function computeOffsetCoordinate(loc: LngLat, bearingDeg: number, distanceM: number): LngLat {
  const R = 6371000;
  const dByR = distanceM / R;
  const latRad = (loc.lat * Math.PI) / 180;
  const lngRad = (loc.lng * Math.PI) / 180;
  const brngRad = (bearingDeg * Math.PI) / 180;

  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(dByR) +
    Math.cos(latRad) * Math.sin(dByR) * Math.cos(brngRad)
  );
  const newLngRad = lngRad + Math.atan2(
    Math.sin(brngRad) * Math.sin(dByR) * Math.cos(latRad),
    Math.cos(dByR) - Math.sin(latRad) * Math.sin(newLatRad)
  );

  return {
    lat: (newLatRad * 180) / Math.PI,
    lng: (newLngRad * 180) / Math.PI,
  };
}

// Category color and clean vector icon mapper (no emojis)
function getCategoryInfo(categorySlug?: string): { bg: string; iconSvg: string } {
  switch (categorySlug) {
    case 'darshan':
      return {
        bg: '#9b1b30',
        iconSvg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L4 8v14h16V8L12 2z"/><path d="M9 22V12h6v10"/></svg>',
      };
    case 'parking':
      return {
        bg: '#2563eb',
        iconSvg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/></svg>',
      };
    case 'food':
      return {
        bg: '#ea580c',
        iconSvg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',
      };
    case 'medical':
      return {
        bg: '#dc2626',
        iconSvg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="4" x2="12" y2="20"/><line x1="4" y1="12" x2="20" y2="12"/></svg>',
      };
    case 'bus':
      return {
        bg: '#059669',
        iconSvg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="15" rx="3"/><path d="M3 10h18"/><circle cx="7" cy="15" r="1.5" fill="currentColor"/><circle cx="17" cy="15" r="1.5" fill="currentColor"/><path d="M5 18v2M19 18v2"/></svg>',
      };
    case 'ghat':
      return {
        bg: '#0284c7',
        iconSvg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3"/><path d="M2 17c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3"/></svg>',
      };
    default:
      return {
        bg: '#7a1425',
        iconSvg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>',
      };
  }
}

export function MapView({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  userLocation,
  destination,
  selectedLocation,
  destinations = [],
  route,
  className,
  onLocationClick,
  interactive = true,
  showUserLocation: _showUserLocation = true,
  onMapReady,
  onUserInteraction,
  recenterTrigger,
  autoFollow = false,
  isNavigating = false,
  heading = null,
  mapRotationMode = 'heads-up',
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRotationWrapperRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletType.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onUserInteractionRef = useRef(onUserInteraction);
  useEffect(() => {
    onUserInteractionRef.current = onUserInteraction;
  }, [onUserInteraction]);

  // Layer groups and markers
  const userMarkerRef = useRef<LeafletType.Marker | null>(null);
  const destMarkerRef = useRef<LeafletType.Marker | null>(null);
  const markersGroupRef = useRef<LeafletType.LayerGroup | null>(null);
  const routeGroupRef = useRef<LeafletType.LayerGroup | null>(null);

  // Position interpolation state for user marker
  const currentMarkerPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const markerAnimFrameRef = useRef<number | null>(null);
  const isNavigatingRef = useRef(isNavigating);
  useEffect(() => {
    isNavigatingRef.current = isNavigating;
  }, [isNavigating]);

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

        // Create Leaflet map
        const map = L.map(mapContainer.current, {
          center: [center.lat, center.lng],
          zoom,
          zoomControl: false,
          attributionControl: false,
          zoomAnimation: true,
          fadeAnimation: true,
          markerZoomAnimation: true,
          dragging: interactive,
          scrollWheelZoom: interactive,
          touchZoom: interactive,
          doubleClickZoom: interactive,
        });

        // Listen for user manual pan or zoom to pause auto-follow
        map.on('dragstart', () => {
          onUserInteractionRef.current?.();
        });
        map.on('zoomstart', (e: LeafletType.LeafletEvent) => {
          if ((e as unknown as { originalEvent?: unknown }).originalEvent) {
            onUserInteractionRef.current?.();
          }
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

        // Marker & Route layer groups
        markersGroupRef.current = L.layerGroup().addTo(map);
        routeGroupRef.current = L.layerGroup().addTo(map);

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
        tiles.once('tileload', clearLoading);
        const loadTimeout = setTimeout(clearLoading, 4000);

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
      if (markerAnimFrameRef.current) {
        cancelAnimationFrame(markerAnimFrameRef.current);
      }
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

  // 2. Center / Zoom updates (when not auto-following active navigation)
  useEffect(() => {
    if (!mapReady || !isMapAlive()) return;
    const map = mapRef.current;
    if (!map) return;
    if (autoFollow && isNavigating) return;

    try {
      map.setView([center.lat, center.lng], zoom, { animate: false });
    } catch (e) {
      console.warn('[MapView] Center update error:', e);
    }
  }, [center.lat, center.lng, zoom, autoFollow, isNavigating, mapReady, isMapAlive]);

  // 2b. Recenter trigger (explicit user button click)
  const prevRecenterRef = useRef(recenterTrigger);
  useEffect(() => {
    if (recenterTrigger === undefined || recenterTrigger === 0) return;
    if (recenterTrigger === prevRecenterRef.current) return;
    prevRecenterRef.current = recenterTrigger;

    if (!mapReady || !isMapAlive()) return;
    const map = mapRef.current;
    if (!map) return;

    const target = userLocation ?? (destination ?? center);
    if (target) {
      try {
        const targetZoom = isNavigating ? NAV_ZOOM : 17;
        let finalCenter = target;
        if (isNavigating && mapRotationMode === 'heads-up' && heading !== null) {
          finalCenter = computeOffsetCoordinate(target, heading, 40);
        }
        map.setView([finalCenter.lat, finalCenter.lng], targetZoom, { animate: true });
      } catch (e) {
        console.warn('[MapView] Recenter error:', e);
      }
    }
  }, [recenterTrigger, userLocation, destination, center, isNavigating, mapRotationMode, heading, mapReady, isMapAlive]);

  // 3. User Location Marker + Smooth Animation & Camera Offset
  useEffect(() => {
    if (!mapReady || !isMapAlive()) return;

    async function updateUserMarker() {
      const map = mapRef.current;
      if (!map || !isMapAlive()) return;
      const L = await getLeaflet();
      if (!mapRef.current) return;

      if (!userLocation) {
        if (userMarkerRef.current) {
          userMarkerRef.current.remove();
          userMarkerRef.current = null;
          currentMarkerPosRef.current = null;
        }
        return;
      }

      const activeHeading = heading ?? 0;
      // In heads-up mode, map rotates by -heading, so arrow inside map pointing at activeHeading points UP on screen.
      // In north-up mode, map is at 0 deg, so arrow rotates to activeHeading.
      const puckRotation = activeHeading;

      // Create or update marker icon
      const iconHtml = isNavigating
        ? `
          <div class="nav-puck-container" style="transform: rotate(${puckRotation}deg);">
            <div class="nav-puck-halo"></div>
            <div class="nav-puck-cone"></div>
            <div class="nav-puck-body">
              <svg class="nav-puck-chevron" viewBox="0 0 24 24" width="22" height="22">
                <path d="M12 2L4 19L12 15L20 19L12 2Z" fill="#ffffff" stroke="#f59e0b" stroke-width="1.8" stroke-linejoin="round"/>
                <circle cx="12" cy="14" r="2" fill="#8b142d" />
              </svg>
            </div>
          </div>
        `
        : `
          <div class="user-pulse-marker">
            <div class="pulse-ring"></div>
            <div class="pulse-core"></div>
          </div>
        `;

      const iconSize: [number, number] = isNavigating ? [44, 44] : [28, 28];
      const iconAnchor: [number, number] = isNavigating ? [22, 22] : [14, 14];

      const markerIcon = L.divIcon({
        className: isNavigating ? 'nav-puck-marker-wrapper' : 'user-pulse-icon-wrapper',
        html: iconHtml,
        iconSize,
        iconAnchor,
      });

      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
          icon: markerIcon,
          zIndexOffset: 1200,
        }).addTo(map);
        currentMarkerPosRef.current = { lat: userLocation.lat, lng: userLocation.lng };
      } else {
        // Update icon if navigation mode toggled
        userMarkerRef.current.setIcon(markerIcon);

        // Smooth position interpolation between GPS updates
        const startPos = currentMarkerPosRef.current ?? userLocation;
        const targetPos = userLocation;
        const dLat = targetPos.lat - startPos.lat;
        const dLng = targetPos.lng - startPos.lng;
        const approxDistM = Math.sqrt(dLat * dLat + dLng * dLng) * 111139;

        if (approxDistM > 0.2 && approxDistM < 80) {
          if (markerAnimFrameRef.current) {
            cancelAnimationFrame(markerAnimFrameRef.current);
          }
          const animDuration = 600; // ms
          const animStart = performance.now();

          const stepAnim = (time: number) => {
            const elapsed = time - animStart;
            const progress = Math.min(1, elapsed / animDuration);
            // Cubic ease out
            const eased = 1 - Math.pow(1 - progress, 3);
            const curLat = startPos.lat + dLat * eased;
            const curLng = startPos.lng + dLng * eased;

            if (userMarkerRef.current) {
              userMarkerRef.current.setLatLng([curLat, curLng]);
            }

            if (progress < 1) {
              markerAnimFrameRef.current = requestAnimationFrame(stepAnim);
            } else {
              currentMarkerPosRef.current = targetPos;
            }
          };

          markerAnimFrameRef.current = requestAnimationFrame(stepAnim);
        } else {
          // Snap directly if distance is large or tiny
          userMarkerRef.current.setLatLng([targetPos.lat, targetPos.lng]);
          currentMarkerPosRef.current = targetPos;
        }
      }

      // Smooth Auto-Follow: place user in lower-middle of screen in Heads-Up mode
      if (autoFollow) {
        try {
          let cameraTarget = userLocation;
          if (isNavigating && mapRotationMode === 'heads-up' && heading !== null) {
            // Offset camera ~40m ahead of user along heading
            cameraTarget = computeOffsetCoordinate(userLocation, heading, 40);
          }

          if (isNavigating && map.getZoom() < 17) {
            map.setView([cameraTarget.lat, cameraTarget.lng], NAV_ZOOM, { animate: true });
          } else {
            map.panTo([cameraTarget.lat, cameraTarget.lng], {
              animate: true,
              duration: 0.6,
              easeLinearity: 0.25,
            });
          }
        } catch {}
      }
    }

    updateUserMarker();
  }, [userLocation, autoFollow, isNavigating, heading, mapRotationMode, mapReady, isMapAlive]);

  // 4. Destination Marker
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

      // Identify destination category so the icon never changes into something else
      const activeLoc = selectedLocation ?? destinations.find(
        (loc) =>
          loc.position?.coordinates &&
          destination &&
          Math.abs(loc.position.coordinates[1] - destination.lat) < 0.0001 &&
          Math.abs(loc.position.coordinates[0] - destination.lng) < 0.0001
      );
      const cat = getCategoryInfo(activeLoc?.category?.slug);

      const destIcon = L.divIcon({
        className: 'dest-pin-wrapper',
        html: `
          <div class="dest-pin-marker">
            <div class="dest-pin-halo" style="background: radial-gradient(circle, ${cat.bg}66 0%, transparent 70%);"></div>
            <div class="dest-pin-badge" style="background: ${cat.bg};">
              <span class="facility-icon text-white">${cat.iconSvg}</span>
            </div>
            <div class="dest-pin-point" style="border-top-color: ${cat.bg};"></div>
          </div>
        `,
        iconSize: [40, 48],
        iconAnchor: [20, 48],
      });

      if (!destMarkerRef.current) {
        destMarkerRef.current = L.marker([destination.lat, destination.lng], {
          icon: destIcon,
          zIndexOffset: 950,
        }).addTo(map);
      } else {
        destMarkerRef.current.setIcon(destIcon);
        destMarkerRef.current.setLatLng([destination.lat, destination.lng]);
      }

      // If no route polyline is currently active, fit or center
      if (!route && !isNavigating) {
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
  }, [destination, selectedLocation, destinations, route, isNavigating, userLocation, mapReady, isMapAlive]);

  // 5. Render Facility Destinations (Pre-navigation browsing)
  useEffect(() => {
    if (!mapReady || !isMapAlive()) return;
    const group = markersGroupRef.current;
    if (!group) return;

    async function renderDestinations() {
      const L = await getLeaflet();
      if (!isMapAlive() || !group) return;

      group.clearLayers();

      // In active navigation mode, hide facility markers to keep screen clean and performant
      if (isNavigating) return;

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
              <span class="facility-icon text-white">${cat.iconSvg}</span>
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
          ${sectorName ? `<div class="text-[10px] font-semibold text-gray-700 bg-amber-50 rounded px-1.5 py-0.5 inline-block mb-1 border border-amber-200">${sectorName}${subSectorName ? ` &rsaquo; ${subSectorName}` : ''}</div>` : ''}
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
  }, [destinations, destination, route, isNavigating, onLocationClick, mapReady, isMapAlive]);

  // 6. Render Route Line (Preserved across GPS updates without redrawing)
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
        opacity: 0.6,
        lineCap: 'round',
        lineJoin: 'round',
      });

      // Durga Maroon main route
      const line = L.polyline(latLngs, {
        color: '#8b142d',
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      });

      group.addLayer(glow);
      group.addLayer(line);

      // Only fit bounds initially when route is loaded and not yet in auto-follow navigation
      if (!isNavigatingRef.current) {
        try {
          map.fitBounds(line.getBounds(), {
            padding: [50, 50],
            maxZoom: 18,
            animate: false,
          });
        } catch {}
      }
    }

    renderRoute();
  }, [route, mapReady, isMapAlive]);

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

  // Calculate smooth map rotation transform:
  // When in Heads-Up mode and navigating with auto-follow: rotate map by -heading and scale by 1.42
  // When panned away or in North-up: scale(1) rotate(0deg)
  const isHeadsUpActive = isNavigating && mapRotationMode === 'heads-up' && heading !== null && autoFollow;
  const rotationDegrees = isHeadsUpActive ? -heading : 0;
  const mapScale = isHeadsUpActive ? 1.42 : 1;

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

      {/* Rotating Map Wrapper */}
      <div
        ref={mapRotationWrapperRef}
        className="w-full h-full origin-center"
        style={{
          transform: `scale(${mapScale}) rotate(${rotationDegrees.toFixed(1)}deg)`,
          transition: 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)',
        }}
      >
        <div ref={mapContainer} className="w-full h-full min-h-full" style={{ minHeight: '300px' }} />
      </div>

      {/* Global CSS for markers and popups */}
      <style jsx global>{`
        /* Standard User GPS Pulse (Pre-nav) */
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
          background: #8b142d;
          border: 2.5px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(139, 20, 45, 0.6);
          z-index: 2;
        }
        .pulse-ring {
          position: absolute;
          inset: -4px;
          border: 3px solid rgba(245, 158, 11, 0.6);
          border-radius: 50%;
          animation: user-beacon-pulse 2s ease-out infinite;
          z-index: 1;
        }
        @keyframes user-beacon-pulse {
          0% { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(2.6); opacity: 0; }
        }

        /* 3D Directional Navigation Arrow / Puck (Active Turn-by-Turn Navigation) */
        .nav-puck-marker-wrapper {
          overflow: visible !important;
        }
        .nav-puck-container {
          position: relative;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s cubic-bezier(0.2, 0, 0.2, 1);
        }
        .nav-puck-halo {
          position: absolute;
          inset: 2px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(245, 158, 11, 0.35) 0%, rgba(245, 158, 11, 0) 70%);
          animation: nav-puck-halo-pulse 2.2s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes nav-puck-halo-pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.35); opacity: 1; }
        }
        .nav-puck-cone {
          position: absolute;
          top: -14px;
          width: 0;
          height: 0;
          border-left: 14px solid transparent;
          border-right: 14px solid transparent;
          border-bottom: 22px solid rgba(245, 158, 11, 0.25);
          filter: blur(1.5px);
          pointer-events: none;
        }
        .nav-puck-body {
          position: relative;
          width: 34px;
          height: 34px;
          background: linear-gradient(135deg, #8b142d 0%, #5c0f1d 100%);
          border: 2.5px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(92, 15, 29, 0.6), 0 1px 3px rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        }
        .nav-puck-chevron {
          display: block;
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));
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
          background: linear-gradient(135deg, #8b142d, #5c0f1d);
          border: 2.5px solid #fde047;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(92, 15, 29, 0.5);
          color: white;
        }
        .dest-pin-point {
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 8px solid #5c0f1d;
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
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Popups */
        .temple-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          padding: 4px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
          border: 1px solid rgba(139, 20, 45, 0.15);
        }
        .temple-popup .leaflet-popup-content {
          margin: 8px;
          line-height: 1.4;
        }
        .navigate-btn {
          width: 100%;
          background: #8b142d;
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
          background: #6f1425;
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
