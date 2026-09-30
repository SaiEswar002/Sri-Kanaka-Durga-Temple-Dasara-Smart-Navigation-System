// Camera Service Interface
// Abstracts integration with external camera/video analytics providers.
// The real camera API is not yet chosen — this interface defines the contract.
// See CAMERA-API-INTEGRATION.md for the full integration guide.

import type { UUID } from '@/types';

export interface CameraEventPayload {
  camera_id: UUID;
  external_camera_id: string;
  event_type: 'CROWD_COUNT' | 'VEHICLE_COUNT' | 'ANOMALY' | 'ZONE_VIOLATION' | 'OTHER';
  timestamp: string; // ISO 8601
  data: {
    count?: number;
    confidence?: number;
    zone_id?: string;
    raw?: unknown; // vendor-specific raw payload
  };
}

export interface CameraHealthStatus {
  camera_id: UUID;
  external_camera_id: string;
  online: boolean;
  last_seen: string;
  error?: string;
}

export interface CameraService {
  /** Validate an incoming webhook/event from the camera provider */
  validateEvent(rawPayload: unknown, signature?: string): CameraEventPayload | null;

  /** Get health status for a camera */
  getCameraHealth(externalId: string): Promise<CameraHealthStatus>;

  /** Provider name */
  readonly name: string;
}

// ============================================================
// Mock Camera Service — used in dev, returns fake data
// ============================================================
class MockCameraService implements CameraService {
  readonly name = 'Mock Camera (Dev)';

  validateEvent(rawPayload: unknown): CameraEventPayload | null {
    // In mock mode, accept any payload that looks like our format
    if (typeof rawPayload !== 'object' || !rawPayload) return null;
    const p = rawPayload as Record<string, unknown>;
    if (!p.camera_id || !p.event_type) return null;

    return {
      camera_id: p.camera_id as UUID,
      external_camera_id: (p.external_camera_id as string) ?? 'mock-cam-001',
      event_type: p.event_type as CameraEventPayload['event_type'],
      timestamp: new Date().toISOString(),
      data: (p.data as CameraEventPayload['data']) ?? {},
    };
  }

  async getCameraHealth(externalId: string): Promise<CameraHealthStatus> {
    return {
      camera_id: 'mock-uuid',
      external_camera_id: externalId,
      online: true,
      last_seen: new Date().toISOString(),
    };
  }
}

// ============================================================
// Factory
// TODO: Add real camera provider implementations here
// when the organization provides the actual API details.
// See CAMERA-API-INTEGRATION.md for implementation guidance.
// ============================================================
export function createCameraService(): CameraService {
  const provider = process.env.CAMERA_API_PROVIDER ?? 'mock';

  switch (provider) {
    case 'mock':
    default:
      return new MockCameraService();
    // case 'vendor-name':
    //   return new VendorCameraService({ ... });
  }
}

let _cameraService: CameraService | null = null;
export function getCameraService(): CameraService {
  if (!_cameraService) {
    _cameraService = createCameraService();
  }
  return _cameraService;
}
