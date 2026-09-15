# Sri Kanaka Durga Temple — Dasara Smart Navigation System

A mobile-first, bilingual (Telugu + English) pilgrim navigation system for Sri Kanaka Durga Temple, Vijayawada during the Dasara festival.

## Overview

- **Pilgrims**: Scan a QR code → open app → find darshan queues, parking, medical help, food, buses, and emergency services
- **Admins**: Desktop-first dashboard for real-time crowd management, closures, announcements, and emergency coordination
- **Architecture**: Next.js 16 (App Router) + TypeScript + Supabase (PostgreSQL + PostGIS) + MapLibre GL JS

## Architecture

```
QR Code
  → Pilgrim PWA (Next.js, mobile-first)
      → GPS, MapLibre (map tile provider), OSRM routing service
  → Supabase (Postgres + PostGIS, Auth, Realtime, Storage)
      → Admin Dashboard
      → Future: Camera → Vehicle/Crowd detection (via service interface)
```

Every external provider (map tiles, routing, geocoding, camera API, crowd detection) is abstracted behind an interface in `src/services/`. Change providers by updating `.env.local` — no component code changes.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| State / Data | TanStack Query + Supabase Realtime |
| Map | MapLibre GL JS |
| Routing engine | OSRM (abstracted, mock in dev) |
| Database | Supabase PostgreSQL + PostGIS |
| Auth | Supabase Auth (Google OAuth + Email) |
| Validation | Zod |
| i18n | next-intl (EN + Telugu) |
| Package manager | pnpm |

## Project Structure

```
src/
├── app/
│   ├── (pilgrim)/        # Pilgrim PWA pages
│   │   ├── page.tsx      # Home
│   │   ├── darshan/      # Queue info
│   │   ├── parking/      # Parking availability
│   │   ├── medical/      # Medical help
│   │   ├── food/         # Food & Annadanam
│   │   ├── bus/          # Shuttle services
│   │   ├── emergency/    # SOS & emergency
│   │   ├── announcements/
│   │   └── navigate/     # Map + routing
│   ├── admin/            # Admin dashboard (protected)
│   │   ├── dashboard/
│   │   ├── map/
│   │   ├── crowd/
│   │   ├── queues/
│   │   ├── parking/
│   │   ├── locations/
│   │   ├── closures/
│   │   ├── announcements/
│   │   ├── emergency/
│   │   ├── cameras/
│   │   ├── users/
│   │   └── system/
│   └── api/
│       ├── routing/route/ # OSRM proxy (server-side, hides OSRM URL)
│       └── admin/bootstrap/ # Super Admin bootstrap
├── components/
│   ├── pilgrim/          # Mobile pilgrim UI components
│   ├── admin/            # Admin dashboard components
│   ├── map/              # MapLibre GL components
│   └── shared/           # Shared across both
├── hooks/                # Custom React hooks
├── lib/supabase/         # Supabase client factories
├── locales/              # EN + Telugu translations
├── services/             # Provider abstractions
│   ├── map/              # Map tile provider
│   ├── routing/          # Routing engine (OSRM/Valhalla/mock)
│   ├── camera/           # Camera API (mock until real API)
│   └── crowd/            # Crowd detection stub
├── types/                # TypeScript types (match DB schema exactly)
└── middleware.ts          # Route protection
supabase/
└── migrations/           # PostgreSQL + PostGIS schema migrations
```

## Local Development Setup

### Prerequisites
- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Git

### 1. Clone and install

```bash
git clone <repo-url>
cd kanaka-durga-nav
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local with your values (see below)
```

### 3. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Enable PostGIS: Database → Extensions → Search "postgis" → Enable
3. Get your credentials from Settings → API
4. Fill in `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
5. Run migrations:
   ```bash
   # Install Supabase CLI if not already installed
   pnpm exec supabase login
   pnpm exec supabase link --project-ref your-project-ref
   pnpm exec supabase db push
   ```
   Or apply migrations manually in the Supabase SQL Editor.

### 4. Run locally

```bash
pnpm dev
```

App runs at `http://localhost:3000`

The app runs fully in dev mode with DEMO data even without a real Supabase project — routing and map use mock providers.

## Environment Variables

See [.env.example](.env.example) for the complete list with explanations.

### Required for full functionality:
| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only privileged key |

### Optional (dev defaults to mocks):
| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_MAP_TILE_PROVIDER` | `maptiler` / `protomaps` / `osm-fallback` |
| `NEXT_PUBLIC_MAPTILER_API_KEY` | MapTiler API key |
| `NEXT_PUBLIC_ROUTING_PROVIDER` | `osrm` / `mock` |
| `OSRM_BASE_URL` | Your OSRM server URL (server-only) |
| `SUPER_ADMIN_EMAILS` | First Super Admin email(s) |
| `CAMERA_API_PROVIDER` | `mock` (real API pending) |

## Admin Access Setup

### First Super Admin Provisioning

The first admin user cannot be created through the UI (no chicken-and-egg problem). Instead:

1. Set `SUPER_ADMIN_EMAILS` in your server environment (not `.env.local` in production):
   ```
   SUPER_ADMIN_EMAILS=your-admin@email.com,another@email.com
   ```
2. Create a Supabase Auth user for that email (via Supabase dashboard or sign-up)
3. Navigate to `/admin/login` and sign in with that email
4. The system automatically calls `provision_super_admin_if_eligible()` via the bootstrap API
5. The user is provisioned as `SUPER_ADMIN`
6. All subsequent admins are created through `/admin/users` by an existing Super Admin

### Admin Roles

| Role | Permissions |
|------|------------|
| `SUPER_ADMIN` | Full access, user management |
| `OPERATIONS_ADMIN` | Crowd, closures, emergency, announcements, locations |
| `CROWD_MANAGER` | Crowd status only |
| `FACILITY_MANAGER` | Locations, parking, queues |
| `VIEW_ONLY` | Read-only dashboard access |

Roles are enforced via Supabase Row Level Security — not just frontend route hiding.

## Database Migrations

All schema changes are in `supabase/migrations/`. Apply with:

```bash
pnpm exec supabase db push
```

Migrations run in order:
1. `_init_extensions` — PostGIS, UUID, pgcrypto
2. `_core_hierarchy` — Sectors, Sub-sectors, Locations
3. `_operational_tables` — Queues, Parking, Closures, Announcements
4. `_emergency_crowd_cameras` — Emergency, Crowd, Camera tables
5. `_auth_rbac` — Roles, Admin users, Audit logs, Bootstrap function
6. `_rls_policies` — Row Level Security for all tables
7. `_demo_seed_data` — Clearly labeled DEMO data (all marked `is_demo_data=TRUE`)

> **DEMO data note**: All seed data records have `is_demo_data = TRUE`. Replace with real data by deleting demo records or setting `is_demo_data = FALSE` after verification. No schema changes needed.

## Camera API Integration

See [CAMERA-API-INTEGRATION.md](./CAMERA-API-INTEGRATION.md) for detailed notes on:
- Where the camera service interface is defined
- How to implement a real provider
- How camera IDs map to sectors/sub-sectors
- Event ingestion and validation flow

## Building for Production

```bash
pnpm build
pnpm start
```

Deploy to Vercel:
```bash
vercel deploy
```

Set all environment variables in Vercel's dashboard (not `.env.local`).

## OSRM Setup (Self-Hosted)

For production pedestrian routing:
1. Download OpenStreetMap data for Andhra Pradesh
2. Run OSRM with the `foot` profile
3. Set `NEXT_PUBLIC_ROUTING_PROVIDER=osrm` and `OSRM_BASE_URL=http://your-osrm:5000`
4. The routing API at `/api/routing/route` proxies calls to OSRM — the URL is never exposed to the browser

## Key Design Decisions

- **Mobile-first**: Pilgrim UI capped at 480px max-width, bottom navigation, large touch targets (≥44px)
- **Bilingual**: Every pilgrim-facing string is in `src/locales/en.json` and `src/locales/te.json`
- **Offline fallback**: Service worker caches shell + static facility data; emergency numbers shown offline
- **Demo data isolation**: `is_demo_data = TRUE` flag on all seed records — replace without schema changes
- **Route closures affect routing**: Active closures are passed to the routing engine, not just drawn on map
- **No real temple data invented**: All coordinates, phone numbers, capacities in seed data are labeled DEMO
- **Admin security**: Server-side auth check verifies admin_users table membership, not just Supabase session
