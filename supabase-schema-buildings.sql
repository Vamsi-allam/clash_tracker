-- Drop old table if it exists (to reset with correct schema)
DROP TABLE IF EXISTS public.townhall_buildings CASCADE;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create townhall_buildings table to store building data for each townhall
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

-- Enable RLS on townhall_buildings table
ALTER TABLE public.townhall_buildings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read building data
CREATE POLICY "Allow users to read townhall buildings" ON public.townhall_buildings
FOR SELECT USING (true);

-- Allow only admins to insert/update/delete building data
CREATE POLICY "Allow admins to manage townhall buildings" ON public.townhall_buildings
FOR ALL USING (auth.jwt() ->> 'email' = 'vamsiallam77@gmail.com');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_townhall_level ON public.townhall_buildings(townhall_level);

-- Auto update updated_at timestamp
DROP TRIGGER IF EXISTS update_townhall_buildings_updated_at ON public.townhall_buildings;
CREATE TRIGGER update_townhall_buildings_updated_at
BEFORE UPDATE ON public.townhall_buildings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();