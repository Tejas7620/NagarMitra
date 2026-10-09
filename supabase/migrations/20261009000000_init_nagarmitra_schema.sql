-- ============================================================
-- NagarMitra AI — Core Database Schema & Migrations
-- Target: Supabase PostgreSQL / PostGIS Compatible
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Places Table (Curated & Cached Urban Points of Interest)
CREATE TABLE IF NOT EXISTS places (
  id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  external_id VARCHAR(128) UNIQUE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(64) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  address TEXT,
  short_description TEXT,
  tags TEXT[] DEFAULT '{}',
  price_band SMALLINT CHECK (price_band BETWEEN 0 AND 3),
  rating NUMERIC(3, 2) CHECK (rating BETWEEN 0.0 AND 5.0),
  rating_source VARCHAR(128),
  accessibility_status VARCHAR(32) DEFAULT 'unknown' CHECK (accessibility_status IN ('known', 'limited', 'unknown')),
  cleanliness_value NUMERIC(3, 2),
  cleanliness_source VARCHAR(128),
  source_url TEXT,
  provider VARCHAR(64) DEFAULT 'openstreetmap',
  is_demo BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_places_category ON places(category);
CREATE INDEX IF NOT EXISTS idx_places_lat_lng ON places(latitude, longitude);

-- 2. Incidents Table (Clustered Urban Hazard Reports)
CREATE TABLE IF NOT EXISTS incidents (
  id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  incident_type VARCHAR(64) NOT NULL CHECK (incident_type IN (
    'waterlogging', 'road_damage', 'temporary_obstruction',
    'traffic_disruption', 'broken_streetlight', 'accident_report',
    'cleanliness_issue', 'other'
  )),
  title VARCHAR(255) NOT NULL,
  summary TEXT,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  severity SMALLINT DEFAULT 3 CHECK (severity BETWEEN 1 AND 5),
  verification_status VARCHAR(32) DEFAULT 'unverified' CHECK (verification_status IN (
    'unverified', 'corroborated', 'authority_confirmed', 'contested'
  )),
  freshness_status VARCHAR(32) DEFAULT 'recent' CHECK (freshness_status IN (
    'recent', 'aging', 'stale', 'unknown'
  )),
  lifecycle_status VARCHAR(32) DEFAULT 'active' CHECK (lifecycle_status IN (
    'active', 'investigating', 'resolved', 'dismissed'
  )),
  first_observed_at TIMESTAMPTZ DEFAULT NOW(),
  last_observed_at TIMESTAMPTZ DEFAULT NOW(),
  last_reported_at TIMESTAMPTZ DEFAULT NOW(),
  distinct_submission_count INT DEFAULT 1 CHECK (distinct_submission_count >= 1),
  evidence_support_score NUMERIC(5, 2) DEFAULT 30.0 CHECK (evidence_support_score BETWEEN 0 AND 100),
  evidence_reasons TEXT[] DEFAULT '{}',
  is_simulated BOOLEAN DEFAULT FALSE,
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidents_lat_lng ON incidents(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(lifecycle_status, verification_status);
CREATE INDEX IF NOT EXISTS idx_incidents_freshness ON incidents(freshness_status);

-- 3. Reports Table (Individual Citizen Submissions)
CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  incident_id VARCHAR(64) REFERENCES incidents(id) ON DELETE SET NULL,
  raw_text TEXT NOT NULL,
  normalized_text TEXT,
  incident_type VARCHAR(64) NOT NULL,
  location_text VARCHAR(255),
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  observed_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  source_kind VARCHAR(32) DEFAULT 'citizen' CHECK (source_kind IN ('citizen', 'authority', 'seed_demo')),
  source_label VARCHAR(128) DEFAULT 'Citizen submission',
  reporter_token_hash VARCHAR(128),
  photo_url TEXT,
  voice_transcript TEXT,
  ai_extraction_json JSONB,
  is_simulated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_incident ON reports(incident_id);
CREATE INDEX IF NOT EXISTS idx_reports_lat_lng ON reports(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_reports_submitted ON reports(submitted_at DESC);

-- 4. Route Scenarios Cache Table
CREATE TABLE IF NOT EXISTS route_scenarios (
  scenario_id VARCHAR(128) PRIMARY KEY,
  origin_name VARCHAR(255) NOT NULL,
  destination_name VARCHAR(255) NOT NULL,
  origin_lat DOUBLE PRECISION NOT NULL,
  origin_lng DOUBLE PRECISION NOT NULL,
  dest_lat DOUBLE PRECISION NOT NULL,
  dest_lng DOUBLE PRECISION NOT NULL,
  travel_mode VARCHAR(32) DEFAULT 'walking',
  route_geometry JSONB NOT NULL,
  distance_meters INT NOT NULL,
  duration_seconds INT,
  route_source VARCHAR(32) DEFAULT 'live',
  is_demo BOOLEAN DEFAULT FALSE,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) setup
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_scenarios ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Allow public read access on places" ON places FOR SELECT USING (true);
CREATE POLICY "Allow public read access on incidents" ON incidents FOR SELECT USING (true);
CREATE POLICY "Allow public read access on reports" ON reports FOR SELECT USING (true);
CREATE POLICY "Allow public read access on route_scenarios" ON route_scenarios FOR SELECT USING (true);

-- Public insert policy for anonymous citizen reporting
CREATE POLICY "Allow anonymous report submission" ON reports FOR INSERT WITH CHECK (true);
