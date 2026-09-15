# Camera & Video Analytics API Integration Guide

**Project**: Sri Kanaka Durga Temple Dasara Smart Navigation System  
**Document**: Technical Integration Specification for CCTV & AI Crowd Analytics  
**Audience**: Temple IT Administration, Systems Integrators, Video Analytics Vendors

---

## 1. Executive Summary

During the 9-day Dasara festival, Sri Kanaka Durga Temple hosts hundreds of thousands of pilgrims daily across the Indrakeeladri hill shrine, ghat routes, queue complexes, and designated parking facilities.

To power real-time crowd level indicators, queue wait times, and parking availability for pilgrims without manual data entry, the system features an abstracted **Camera & Video Analytics Integration Layer**.

This document describes how external CCTV networks, Video Management Systems (VMS), and AI edge inference servers (e.g., YOLO, DeepStream, Milestone, Hikvision, Dahua, Axis) integrate into this platform.

---

## 2. Architecture Overview

```
 ┌────────────────────────────────────────────────────────┐
 │            Physical CCTV / IP Camera Network          │
 │  (Queue Sheds, Ghat Roads, Annadanam, Parking Hubs)    │
 └──────────────────────────┬─────────────────────────────┘
                            │ RTSP / ONVIF
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │           AI Video Analytics Engine (Edge / VMS)       │
 │   - Headcount & People Density Estimation              │
 │   - Vehicle Detection & Parking Spot Occupancy         │
 │   - Anomaly / Stampede Risk / Perimeter Alert          │
 └──────────────────────────┬─────────────────────────────┘
                            │ HTTPS Webhook (HMAC-Signed)
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │             Next.js Application Gateway                │
 │                 /api/cameras/webhook                   │
 │   - Signature verification & timestamp validation      │
 │   - Normalization via CameraService interface          │
 └──────────────────────────┬─────────────────────────────┘
                            │ Service Role / PostGIS
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │               Supabase / PostgreSQL DB                 │
 │   - tables: cameras, crowd_status, parking_status      │
 │   - Supabase Realtime Broadcast                        │
 └─────────────┬────────────────────────────┬─────────────┘
               │ WebSocket                  │ WebSocket
               ▼                            ▼
 ┌───────────────────────────┐ ┌───────────────────────────┐
 │   Pilgrim Mobile PWA      │ │    Admin Command Center   │
 │ (Live Queue, Crowd, Maps) │ │ (Realtime Sector Monitor) │
 └───────────────────────────┘ └───────────────────────────┘
```

---

## 3. Database Schema & Entities

The system defines the physical camera and its operational context in `supabase/migrations/`:

### Table: `cameras`
| Column | Type | Description |
|---|---|---|
| `id` | `UUID` | Primary Key |
| `external_id` | `TEXT` | Vendor camera identifier / stream code |
| `name` | `TEXT` | Human-readable name (e.g., `Ghat Road Sector 2 Entrance`) |
| `stream_url` | `TEXT` | RTSP or HLS stream URL (admin viewing only, never exposed to public) |
| `sector_id` | `UUID` | Foreign key to `sectors` |
| `sub_sector_id` | `UUID` | Foreign key to `sub_sectors` (optional) |
| `parking_location_id`| `UUID` | Foreign key to `parking_locations` (for parking cameras) |
| `capabilities` | `TEXT[]` | `['CROWD_COUNT', 'VEHICLE_COUNT', 'ANOMALY']` |
| `status` | `TEXT` | `'ONLINE'`, `'OFFLINE'`, `'MAINTENANCE'` |
| `last_ping_at` | `TIMESTAMPTZ`| Last health check heartbeat |

---

## 4. Webhook Ingest Specification

External systems send analytics events to the HTTP webhook endpoint.

### Endpoint
```http
POST /api/cameras/webhook
Content-Type: application/json
X-Camera-Signature: sha256=<HMAC_HEX_DIGEST>
X-Camera-Timestamp: 1726372800
```

### Signature Verification
To prevent spoofing, incoming requests must be signed with an HMAC SHA-256 digest using the shared `CAMERA_WEBHOOK_SECRET`:
```
signature = HMAC-SHA256(CAMERA_WEBHOOK_SECRET, timestamp + "." + request_body)
```
Requests older than 300 seconds (5 minutes) are rejected to prevent replay attacks.

---

## 5. Event Payload Formats

### 5.1 Crowd Headcount & Density Event (`CROWD_COUNT`)
```json
{
  "camera_id": "018f2bb7-7a2e-7230-8012-d8123456789a",
  "external_camera_id": "CAM-GHAT-04",
  "event_type": "CROWD_COUNT",
  "timestamp": "2026-10-12T08:30:00.000Z",
  "data": {
    "count": 482,
    "crowd_level": "HIGH",
    "confidence": 0.94,
    "zone_id": "ZONE-Q-SHED-2",
    "raw": {
      "fps": 25,
      "density_people_per_sqm": 3.8
    }
  }
}
```

#### Crowd Level Mapping Rules
| Headcount Density | People / m² | Calculated `CrowdLevel` | Color Indicator | Wait Time Multiplier |
|---|---|---|---|---|
| `< 1.0` | `< 1.0` | `LOW` | Green (`#16a34a`) | 1.0x (Normal) |
| `1.0 – 2.5` | `1.0 – 2.5` | `MODERATE` | Amber (`#d97706`) | 1.4x |
| `2.5 – 4.0` | `2.5 – 4.0` | `HIGH` | Red (`#dc2626`) | 2.0x |
| `> 4.0` | `> 4.0` | `CRITICAL` | Maroon (`#7f1d1d`) | Emergency Protocol |

---

### 5.2 Parking Occupancy Event (`VEHICLE_COUNT`)
```json
{
  "camera_id": "018f2bb7-7a2e-7230-8012-d8123456789b",
  "external_camera_id": "CAM-PARK-BHAVANI-01",
  "event_type": "VEHICLE_COUNT",
  "timestamp": "2026-10-12T08:30:15.000Z",
  "data": {
    "count": 340,
    "confidence": 0.98,
    "raw": {
      "total_slots": 400,
      "two_wheelers": 210,
      "four_wheelers": 130
    }
  }
}
```

---

### 5.3 Anomaly / Safety Alert (`ANOMALY` / `ZONE_VIOLATION`)
```json
{
  "camera_id": "018f2bb7-7a2e-7230-8012-d8123456789c",
  "external_camera_id": "CAM-HILL-STEPS-02",
  "event_type": "ANOMALY",
  "timestamp": "2026-10-12T08:31:00.000Z",
  "data": {
    "confidence": 0.91,
    "zone_id": "ZONE-BARRIER-RESTRICTED",
    "raw": {
      "alert_type": "STAMPEDE_RISK_SURGE",
      "direction_reversal_detected": true
    }
  }
}
```
*Note: Anomaly events automatically generate an entry in `emergency_incidents` table with `status='OPEN'` and broadcast immediate alerts to the `/admin/emergency` dashboard.*

---

## 6. How to Implement a New Camera Provider

The codebase defines the contract in `src/services/camera/camera-service.ts`:

```typescript
export interface CameraService {
  validateEvent(rawPayload: unknown, signature?: string): CameraEventPayload | null;
  getCameraHealth(externalId: string): Promise<CameraHealthStatus>;
  readonly name: string;
}
```

### Step 1: Create Provider Implementation
Create `src/services/camera/providers/vendor-service.ts`:

```typescript
import { CameraService, CameraEventPayload, CameraHealthStatus } from '../camera-service';
import crypto from 'crypto';

export class VendorCameraService implements CameraService {
  readonly name = 'Vendor Vision AI';
  private secret: string;

  constructor(secret: string) {
    this.secret = secret;
  }

  validateEvent(rawPayload: unknown, signature?: string): CameraEventPayload | null {
    // 1. Verify HMAC signature
    // 2. Normalize vendor JSON structure to CameraEventPayload
    // 3. Return normalized object or null if invalid
  }

  async getCameraHealth(externalId: string): Promise<CameraHealthStatus> {
    // Poll vendor REST API or return cached status
  }
}
```

### Step 2: Register in `src/services/camera/camera-service.ts`
```typescript
export function createCameraService(): CameraService {
  const provider = process.env.CAMERA_API_PROVIDER ?? 'mock';

  switch (provider) {
    case 'vendor':
      return new VendorCameraService(process.env.CAMERA_WEBHOOK_SECRET ?? '');
    case 'mock':
    default:
      return new MockCameraService();
  }
}
```

### Step 3: Configure Environment Variables
In `.env.local`:
```env
CAMERA_API_PROVIDER=vendor
CAMERA_WEBHOOK_SECRET=your_secure_random_hmac_secret_key_here
CAMERA_API_BASE_URL=https://analytics-gateway.temple-local.internal/api/v1
```

---

## 7. Operational & Failover Guidelines

1. **Graceful Fallback**: If cameras lose power or network connectivity on Indrakeeladri hill, the system keeps the last known state with an `estimated=true` badge and alerts temple administrative operators.
2. **Admin Override**: Temple police and administrative staff on the `/admin/crowd` and `/admin/parking` pages can manually override any camera-reported value at any moment. Manual overrides take precedence over automated camera inputs for 30 minutes.
3. **Bandwidth Preservation**: Pilgrim devices never connect directly to RTSP or raw video streams. All video stays on local intranet edge networks; only tiny JSON metadata packets (~300 bytes) flow to Supabase and pilgrim mobile clients.
