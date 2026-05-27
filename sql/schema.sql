-- Run this in your Supabase SQL editor to set up the database

-- Chores table: all chores with frequency and assignment
create table chores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  daughter text not null check (daughter in ('daughter1', 'daughter2', 'both')),
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly')),
  day_of_week int check (day_of_week between 0 and 6), -- 0=Sun for weekly chores
  day_of_month int check (day_of_month between 1 and 31), -- for monthly chores
  active boolean default true,
  created_at timestamptz default now()
);

-- Assignments table: specific chore instances for a given date
create table assignments (
  id uuid primary key default gen_random_uuid(),
  chore_id uuid references chores(id) on delete cascade,
  daughter text not null check (daughter in ('daughter1', 'daughter2')),
  assigned_date date not null,
  completed boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now(),
  unique(chore_id, daughter, assigned_date)
);

-- Index for fast date lookups
create index on assignments (daughter, assigned_date);
create index on assignments (assigned_date);

-- Enable Row Level Security (allow all for now via service role)
alter table chores enable row level security;
alter table assignments enable row level security;

-- Allow read/write from service role (used by your API)
create policy "Service role full access to chores"
  on chores for all
  using (true)
  with check (true);

create policy "Service role full access to assignments"
  on assignments for all
  using (true)
  with check (true);
