-- Migration: Enable required PostgreSQL extensions
-- Description: PostGIS for spatial data, UUID generation

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
