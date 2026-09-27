// Map Tile Provider Service for Leaflet & Web Cartography
// Provides high-performance, ultra-reliable raster tile sources:
// 1. OpenStreetMap (Default) — 100% reliable, zero API key, rich temple & ghat details
// 2. CartoDB Voyager — Crisp modern style, fast CDN
// 3. MapTiler — 256px raster tiles if API key provided

export interface TileLayerConfig {
  url: string;
  attribution: string;
  subdomains?: string[];
  maxZoom?: number;
  tileSize?: number;
}

export interface MapTileProvider {
  readonly name: string;
  getTileConfig(): TileLayerConfig;
}

// ============================================================
// OpenStreetMap Standard Tile Provider (Production Default)
// ============================================================
class OsmProvider implements MapTileProvider {
  readonly name = 'OpenStreetMap';

  getTileConfig(): TileLayerConfig {
    return {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
      maxZoom: 19,
      tileSize: 256,
    };
  }
}

// ============================================================
// CartoDB Voyager — Clean, Fast CDN
// ============================================================
class CartoVoyagerProvider implements MapTileProvider {
  readonly name = 'CartoDB Voyager';

  getTileConfig(): TileLayerConfig {
    return {
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
      subdomains: ['a', 'b', 'c', 'd'],
      maxZoom: 20,
      tileSize: 256,
    };
  }
}

// ============================================================
// MapTiler Raster Provider (256px tiles with API key)
// ============================================================
class MapTilerRasterProvider implements MapTileProvider {
  readonly name = 'MapTiler Streets';
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  getTileConfig(): TileLayerConfig {
    return {
      url: `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${this.apiKey}`,
      attribution:
        '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      maxZoom: 20,
      tileSize: 256,
    };
  }
}

// ============================================================
// Factory — Config-driven provider selection
// Defaults to OpenStreetMap for 100% reliable, zero-config maps
// ============================================================
export function createMapTileProvider(): MapTileProvider {
  const provider = (process.env.NEXT_PUBLIC_MAP_TILE_PROVIDER ?? 'osm').toLowerCase();
  const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;

  switch (provider) {
    case 'carto':
      return new CartoVoyagerProvider();

    case 'maptiler':
      if (maptilerKey) {
        return new MapTilerRasterProvider(maptilerKey);
      }
      return new OsmProvider();

    case 'osm':
    case 'osm-fallback':
    default:
      return new OsmProvider();
  }
}

let _mapTileProvider: MapTileProvider | null = null;
export function getMapTileProvider(): MapTileProvider {
  if (!_mapTileProvider) {
    _mapTileProvider = createMapTileProvider();
  }
  return _mapTileProvider;
}
