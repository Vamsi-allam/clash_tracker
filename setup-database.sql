-- ============================================
-- CLASH TRACKER DATABASE SETUP
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CREATE USER VILLAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_villages (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_tag TEXT NOT NULL,
  player_name TEXT NOT NULL,
  townhall_level INTEGER NOT NULL,
  exp_level INTEGER,
  builder_count INTEGER,
  clan_name TEXT,
  clan_badge_url TEXT,
  clan_level INTEGER,
  townhall_upgrade_started_at TIMESTAMP WITH TIME ZONE,
  townhall_upgrade_finish_at TIMESTAMP WITH TIME ZONE,
  townhall_upgrade_from_level INTEGER,
  townhall_upgrade_to_level INTEGER,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(user_id, player_tag)
);

-- Ensure existing databases have the builder_count column
ALTER TABLE IF EXISTS public.user_villages
  ADD COLUMN IF NOT EXISTS builder_count INTEGER;

ALTER TABLE IF EXISTS public.user_villages
  ADD COLUMN IF NOT EXISTS townhall_upgrade_started_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE IF EXISTS public.user_villages
  ADD COLUMN IF NOT EXISTS townhall_upgrade_finish_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE IF EXISTS public.user_villages
  ADD COLUMN IF NOT EXISTS townhall_upgrade_from_level INTEGER;

ALTER TABLE IF EXISTS public.user_villages
  ADD COLUMN IF NOT EXISTS townhall_upgrade_to_level INTEGER;

ALTER TABLE IF EXISTS public.user_villages
  ALTER COLUMN builder_count DROP DEFAULT;

-- Enable RLS
ALTER TABLE public.user_villages ENABLE ROW LEVEL SECURITY;

-- Users can only see their own villages
DROP POLICY IF EXISTS "Users can see own villages" ON public.user_villages;
CREATE POLICY "Users can see own villages" ON public.user_villages
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own villages" ON public.user_villages;
CREATE POLICY "Users can insert own villages" ON public.user_villages
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own villages" ON public.user_villages;
CREATE POLICY "Users can update own villages" ON public.user_villages
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own villages" ON public.user_villages;
CREATE POLICY "Users can delete own villages" ON public.user_villages
FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_villages_user_id ON public.user_villages(user_id);
CREATE INDEX IF NOT EXISTS idx_user_villages_is_active ON public.user_villages(is_active);

-- ============================================
-- 2. CREATE USER VILLAGE BUILDINGS TABLE
-- (Stores only current level per building, costs/times come from townhall_buildings table)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_village_buildings (
  id BIGSERIAL PRIMARY KEY,
  village_id BIGINT NOT NULL REFERENCES public.user_villages(id) ON DELETE CASCADE,
  building_id TEXT NOT NULL,
  building_name TEXT NOT NULL,
  current_level INTEGER DEFAULT 1,
  quantity INTEGER DEFAULT 1,
  upgrade_started_at TIMESTAMP WITH TIME ZONE,
  upgrade_finish_at TIMESTAMP WITH TIME ZONE,
  upgrade_from_level INTEGER,
  upgrade_to_level INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(village_id, building_id)
);

-- Auto-update timestamp on every row change
DROP FUNCTION IF EXISTS public.set_user_village_buildings_updated_at();
CREATE OR REPLACE FUNCTION public.set_user_village_buildings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_user_village_buildings_updated_at ON public.user_village_buildings;
CREATE TRIGGER trigger_set_user_village_buildings_updated_at
BEFORE UPDATE ON public.user_village_buildings
FOR EACH ROW
EXECUTE FUNCTION public.set_user_village_buildings_updated_at();

-- Remove the builder_count column from the village buildings table
ALTER TABLE IF EXISTS public.user_village_buildings
  DROP COLUMN IF EXISTS builder_count;

-- Enable RLS
ALTER TABLE public.user_village_buildings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their village buildings" ON public.user_village_buildings;
CREATE POLICY "Users can manage their village buildings" ON public.user_village_buildings
FOR ALL USING (
  village_id IN (
    SELECT id FROM public.user_villages WHERE user_id = auth.uid()
  )
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_village_buildings_village_id ON public.user_village_buildings(village_id);
CREATE INDEX IF NOT EXISTS idx_village_buildings_upgrade_finish_at ON public.user_village_buildings(upgrade_finish_at);

-- ============================================
-- 3. CREATE TOWNHALL BUILDINGS TABLE
-- (Reference table with all building data per townhall level)
-- ============================================
DROP TABLE IF EXISTS public.townhall_buildings CASCADE;

CREATE TABLE IF NOT EXISTS public.townhall_buildings (
  id BIGSERIAL PRIMARY KEY,
  townhall_level INTEGER NOT NULL UNIQUE,
  defences JSONB DEFAULT '{}'::jsonb,
  traps JSONB DEFAULT '{}'::jsonb,
  army JSONB DEFAULT '{}'::jsonb,
  resources JSONB DEFAULT '{}'::jsonb,
  troops JSONB DEFAULT '{}'::jsonb,
  heroes JSONB DEFAULT '{}'::jsonb,
  walls JSONB DEFAULT '{}'::jsonb,
  townhall_upgrade_cost BIGINT,
  townhall_upgrade_resource TEXT,
  townhall_upgrade_time_seconds BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE IF EXISTS public.townhall_buildings
  ADD COLUMN IF NOT EXISTS heroes JSONB DEFAULT '{}'::jsonb;

-- Enable RLS
ALTER TABLE public.townhall_buildings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read building data
DROP POLICY IF EXISTS "Allow users to read townhall buildings" ON public.townhall_buildings;
CREATE POLICY "Allow users to read townhall buildings" ON public.townhall_buildings
FOR SELECT USING (true);

-- Allow only admins to insert/update building data
DROP POLICY IF EXISTS "Allow admins to manage townhall buildings" ON public.townhall_buildings;
CREATE POLICY "Allow admins to manage townhall buildings" ON public.townhall_buildings
FOR ALL USING (auth.jwt() ->> 'email' = 'vamsiallam77@gmail.com');

-- Auto-update timestamp on every change
DROP FUNCTION IF EXISTS public.set_townhall_buildings_updated_at();
CREATE OR REPLACE FUNCTION public.set_townhall_buildings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_townhall_buildings_updated_at ON public.townhall_buildings;
CREATE TRIGGER trigger_set_townhall_buildings_updated_at
BEFORE UPDATE ON public.townhall_buildings
FOR EACH ROW
EXECUTE FUNCTION public.set_townhall_buildings_updated_at();

-- Create index
CREATE INDEX IF NOT EXISTS idx_townhall_level ON public.townhall_buildings(townhall_level);

-- ============================================
-- DONE!
-- ============================================
-- Your database is now ready to use.
-- Tables created:
-- 1. user_villages - stores each user's saved villages
-- 2. user_village_buildings - stores current levels for each building in a village
-- 3. townhall_buildings - reference data with building data plus townhall upgrade cost/time
