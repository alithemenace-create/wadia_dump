-- ═══════════════════════════════════════════════════════════════════════════
--  Lumière Villas — Supabase Schema
--  Run this once in your Supabase project → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable UUID extension (already on by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Required for the double-booking exclusion constraint on the bookings table
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ── VILLAS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS villas (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  location    TEXT NOT NULL,
  rate        INTEGER NOT NULL,          -- nightly rate in INR
  beds        INTEGER NOT NULL DEFAULT 1,
  baths       INTEGER NOT NULL DEFAULT 1,
  guests      INTEGER NOT NULL DEFAULT 2,
  badge       TEXT,
  description TEXT,
  images      TEXT[] DEFAULT '{}',      -- array of image URLs
  status      TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── BOOKINGS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  villa_id        UUID NOT NULL REFERENCES villas(id) ON DELETE CASCADE,
  villa_name      TEXT NOT NULL,         -- denormalised for quick display
  guest_name      TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  checkin         DATE NOT NULL,
  checkout        DATE NOT NULL,
  guests          TEXT NOT NULL DEFAULT '1–2 Guests',
  special_request TEXT,
  nights          INTEGER NOT NULL,
  nightly_rate    INTEGER NOT NULL,
  service_fee     INTEGER NOT NULL,
  total           INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'Confirmed'
                    CHECK (status IN ('Confirmed', 'Pending', 'Cancelled', 'Completed')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent overlapping confirmed bookings for the same villa
  CONSTRAINT no_overlapping_bookings EXCLUDE USING gist (
    villa_id WITH =,
    daterange(checkin, checkout, '[)') WITH &&
  ) WHERE (status NOT IN ('Cancelled'))
);

-- ── SETTINGS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── UPDATED_AT TRIGGER ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER villas_updated_at
  BEFORE UPDATE ON villas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
-- Public read on villas; writes restricted to service-role key (our backend)
ALTER TABLE villas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read active villas
CREATE POLICY "Public can read active villas"
  ON villas FOR SELECT
  USING (status = 'Active');

-- Service role bypasses RLS automatically — no extra policy needed for writes

-- ── INDEXES ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookings_villa_id   ON bookings(villa_id);
CREATE INDEX IF NOT EXISTS idx_bookings_checkin    ON bookings(checkin);
CREATE INDEX IF NOT EXISTS idx_bookings_status     ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_villas_status       ON villas(status);
