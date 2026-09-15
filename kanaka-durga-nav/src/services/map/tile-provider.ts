// Map Tile Provider Service Interface
// All map tile providers must implement this interface.
// Swap providers by changing MAP_TILE_PROVIDER env var — no component changes needed.

export interface MapTileStyle {
  /** MapLibre GL style URL or style object URL */
  styleUrl: string;
  /** Attribution text shown on the map */
  attribution: string;
}

export interface MapTileProvider {
  /** Get the MapLibre GL style for the given locale */
  getStyle(locale?: string): MapTileStyle;
  /** Provider name for display/debugging */
  readonly name: string;
}

// ============================================================
// MapTiler implementation
// ============================================================
class MapTilerProvider implements MapTileProvider {
  readonly name = 'MapTiler';
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  getStyle(): MapTileStyle {
    return {
      styleUrl: `https://api.maptiler.com/maps/streets-v2/style.json?key=${this.apiKey}`,
      attribution: '© MapTiler © OpenStreetMap contributors',
    };
  }
}

// ============================================================
// OpenStreetMap raster fallback (dev/no-key)
// NOT suitable for production — rate-limited public tiles
// ============================================================
class OsmFallbackProvider implements MapTileProvider {
  readonly name = 'OSM Fallback (Dev Only)';

  getStyle(): MapTileStyle {
    return {
      // Inline style using OSM raster tiles — no API key required
      styleUrl: JSON.stringify({
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      }),
      attribution: '© OpenStreetMap contributors',
    };
  }
}

// ============================================================
// Protomaps implementation (self-hosted or protomaps.com)
// ============================================================
class ProtomapsProvider implements MapTileProvider {
  readonly name = 'Protomaps';
  private readonly tilesUrl: string;

  constructor(tilesUrl: string) {
    this.tilesUrl = tilesUrl;
  }

  getStyle(): MapTileStyle {
    return {
      styleUrl: `${this.tilesUrl}/style.json`,
      attribution: '© OpenStreetMap contributors',
    };
  }
}

// ============================================================
// Factory — config-driven provider selection
// ============================================================
export function createMapTileProvider(): MapTileProvider {
  const provider = process.env.NEXT_PUBLIC_MAP_TILE_PROVIDER ?? 'osm-fallback';
  const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;
  const protomapsUrl = process.env.NEXT_PUBLIC_PROTOMAPS_TILES_URL;

  switch (provider) {
    case 'maptiler':
      if (!maptilerKey) {
        console.warn('[MapTile] NEXT_PUBLIC_MAPTILER_API_KEY not set, falling back to OSM');
        return new OsmFallbackProvider();
      }
      return new MapTilerProvider(maptilerKey);

    case 'protomaps':
      if (!protomapsUrl) {
        console.warn('[MapTile] NEXT_PUBLIC_PROTOMAPS_TILES_URL not set, falling back to OSM');
        return new OsmFallbackProvider();
      }
      return new ProtomapsProvider(protomapsUrl);

    case 'osm-fallback':
    default:
      if (process.env.NODE_ENV === 'production' && provider === 'osm-fallback') {
        console.warn('[MapTile] OSM fallback tiles are NOT suitable for production. Set NEXT_PUBLIC_MAP_TILE_PROVIDER and appropriate API key.');
      }
      return new OsmFallbackProvider();
  }
}

// Singleton for client-side use
let _mapTileProvider: MapTileProvider | null = null;
export function getMapTileProvider(): MapTileProvider {
  if (!_mapTileProvider) {
    _mapTileProvider = createMapTileProvider();
  }
  return _mapTileProvider;
}
