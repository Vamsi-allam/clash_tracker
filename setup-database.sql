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
  clan_name TEXT,
  clan_badge_url TEXT,
  clan_level INTEGER,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(user_id, player_tag)
);

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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(village_id, building_id)
);

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

-- ============================================
-- 3. CREATE TOWNHALL BUILDINGS TABLE
-- (Reference table with all building data per townhall level)
-- ============================================
DROP TABLE IF EXISTS public.townhall_buildings CASCADE;

CREATE TABLE IF NOT EXISTS public.townhall_buildings (
  id BIGSERIAL PRIMARY KEY,
  townhall_level INTEGER NOT NULL UNIQUE,
  defences JSONB DEFAULT '{}'::jsonb,
  army JSONB DEFAULT '{}'::jsonb,
  resources JSONB DEFAULT '{}'::jsonb,
  troops JSONB DEFAULT '{}'::jsonb,
  walls JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

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

-- Create index
CREATE INDEX IF NOT EXISTS idx_townhall_level ON public.townhall_buildings(townhall_level);

-- ============================================
-- 4. INSERT TOWNHALL LEVEL 2 BUILDING DATA
-- ============================================
INSERT INTO public.townhall_buildings (townhall_level, defences, army, resources, troops, walls)
VALUES (
  2,
  '[
    {"id":"16_","name":"Archer Tower","maxLevel":2,"levels":[{"level":1,"cost":"1000","resource":"gold","time":"30m"},{"level":2,"cost":"2000","resource":"gold","time":"1h"}]},
    {"id":"18_","name":"Canon","maxLevel":3,"levels":[{"level":1,"cost":"250","resource":"gold","time":"15m"},{"level":2,"cost":"1000","resource":"gold","time":"30m"},{"level":3,"cost":"4000","resource":"gold","time":"1h"}]},
    {"id":"19_","name":"Clan Castle","maxLevel":1,"levels":[{"level":1,"cost":"10000","resource":"elixir","time":"N/A"}]}
  ]'::jsonb,
  '[
    {"id":"10_","name":"Army Camp","maxLevel":2,"levels":[{"level":1,"cost":"200","resource":"elixir","time":"30m"},{"level":2,"cost":"2000","resource":"elixir","time":"1h"}]}
  ]'::jsonb,
  '[
    {"id":"2_","name":"Gold Mine","maxLevel":4,"levels":[{"level":1,"cost":"150","resource":"elixir","time":"10m"},{"level":2,"cost":"300","resource":"elixir","time":"30m"},{"level":3,"cost":"700","resource":"elixir","time":"1h"},{"level":4,"cost":"1400","resource":"elixir","time":"2h"}]},
    {"id":"3_","name":"Elixir Collector","maxLevel":4,"levels":[{"level":1,"cost":"150","resource":"gold","time":"10m"},{"level":2,"cost":"300","resource":"gold","time":"30m"},{"level":3,"cost":"700","resource":"gold","time":"1h"},{"level":4,"cost":"1400","resource":"gold","time":"2h"}]},
    {"id":"5_","name":"Gold Storage","maxLevel":3,"levels":[{"level":1,"cost":"300","resource":"elixir","time":"15m"},{"level":2,"cost":"750","resource":"elixir","time":"30m"},{"level":3,"cost":"1500","resource":"elixir","time":"1h"}]},
    {"id":"6_","name":"Elixir Storage","maxLevel":3,"levels":[{"level":1,"cost":"300","resource":"gold","time":"15m"},{"level":2,"cost":"750","resource":"gold","time":"30m"},{"level":3,"cost":"1500","resource":"gold","time":"1h"}]}
  ]'::jsonb,
  '[
    {"id":"31_","name":"Barbarian","maxLevel":1,"levels":[{"level":1,"cost":"20","resource":"elixir","time":"15s","trainingSpace":"1"}]},
    {"id":"32_","name":"Archer","maxLevel":1,"levels":[{"level":1,"cost":"20","resource":"elixir","time":"15s","trainingSpace":"1"}]},
    {"id":"33_","name":"Giant","maxLevel":1,"levels":[{"level":1,"cost":"100","resource":"elixir","time":"1m","trainingSpace":"5"}]},
    {"id":"34_","name":"Goblin","maxLevel":1,"levels":[{"level":1,"cost":"50","resource":"elixir","time":"30s","trainingSpace":"1"}]}
  ]'::jsonb,
  '[
    {"id":"60_","name":"Walls","maxLevel":2,"levels":[{"level":1,"cost":"0","resource":"gold","time":"instant"},{"level":2,"cost":"1000","resource":"gold","time":"30m"}]}
  ]'::jsonb
) ON CONFLICT (townhall_level) DO UPDATE SET
  defences = excluded.defences,
  army = excluded.army,
  resources = excluded.resources,
  troops = excluded.troops,
  walls = excluded.walls,
  updated_at = TIMEZONE('utc'::text, NOW());

-- ============================================
-- DONE!
-- ============================================
-- Your database is now ready to use.
-- Tables created:
-- 1. user_villages - stores each user's saved villages
-- 2. user_village_buildings - stores current levels for each building in a village
-- 3. townhall_buildings - reference data with costs, times, and max levels
