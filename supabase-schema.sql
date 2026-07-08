-- Clash Tracker Database Schema
-- Run this in the Supabase SQL editor to set up the database from scratch

-- ============================================
-- 1. CREATE PROFILES TABLE
-- ============================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  email text not null unique,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.townhall_buildings
  add column if not exists heroes jsonb default '{}'::jsonb;

alter table if exists public.user_villages
  add column if not exists builder_count integer;

alter table if exists public.user_villages
  add column if not exists townhall_upgrade_started_at timestamptz;

alter table if exists public.user_villages
  add column if not exists townhall_upgrade_finish_at timestamptz;

alter table if exists public.user_villages
  add column if not exists townhall_upgrade_from_level integer;

alter table if exists public.user_villages
  add column if not exists townhall_upgrade_to_level integer;

alter table if exists public.user_villages
  alter column builder_count drop default;

alter table if exists public.user_village_buildings
  drop column if exists builder_count;

alter table if exists public.user_village_buildings
  add column if not exists upgrade_started_at timestamptz;

alter table if exists public.user_village_buildings
  add column if not exists upgrade_finish_at timestamptz;

alter table if exists public.user_village_buildings
  add column if not exists upgrade_from_level integer;

alter table if exists public.user_village_buildings
  add column if not exists upgrade_to_level integer;

drop function if exists public.set_user_village_buildings_updated_at();
create or replace function public.set_user_village_buildings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trigger_set_user_village_buildings_updated_at on public.user_village_buildings;
create trigger trigger_set_user_village_buildings_updated_at
before update on public.user_village_buildings
for each row
execute function public.set_user_village_buildings_updated_at();

create index if not exists idx_village_buildings_upgrade_finish_at
  on public.user_village_buildings (upgrade_finish_at);

-- ============================================
-- 2. ENABLE ROW LEVEL SECURITY FOR PROFILES
-- ============================================
alter table public.profiles enable row level security;

drop policy if exists "profiles can read own row" on public.profiles;
create policy "profiles can read own row"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "profiles can insert own row" on public.profiles;
create policy "profiles can insert own row"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "profiles can update own row" on public.profiles;
create policy "profiles can update own row"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- ============================================
-- 3. CREATE FUNCTION TO UPDATE TIMESTAMP
-- ============================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ============================================
-- 4. CREATE TRIGGER FOR UPDATING TIMESTAMP
-- ============================================
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- ============================================
-- 5. CREATE FUNCTION TO HANDLE NEW USER REGISTRATION
-- ============================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, email, role, created_at, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    case when lower(new.email) = 'vamsiallam77@gmail.com' then 'admin' else 'user' end,
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (id) do update set
    username = excluded.username,
    email = excluded.email,
    role = excluded.role,
    updated_at = excluded.updated_at;

  return new;
end;
$$;

-- ============================================
-- 6. CREATE TRIGGER FOR NEW USER
-- ============================================
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();
