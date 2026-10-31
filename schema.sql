create extension if not exists "pgcrypto";

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  request jsonb not null,
  itinerary jsonb not null,
  share_token text unique not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists trip_members (
  trip_id uuid references trips(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  primary key (trip_id, user_id)
);

-- Backend uses the service-role key and checks ownership itself; RLS blocks direct client access.
alter table trips enable row level security;
alter table trip_members enable row level security;
create policy "owner reads own trips" on trips for select using (auth.uid() = user_id);
