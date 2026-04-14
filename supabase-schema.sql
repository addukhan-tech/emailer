-- ============================================================
-- EMAILER BY REFORGEX — Supabase Database Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  role text default 'member' check (role in ('admin', 'member')),
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can view their own profile"
  on profiles for select using (auth.uid() = id);

create policy "Admins can view all profiles"
  on profiles for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- PROJECTS
-- ============================================================
create table projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,

  -- SMTP settings
  from_email text not null,
  from_name text,
  smtp_host text not null,
  smtp_port integer not null default 587,
  smtp_user text not null,
  smtp_pass text not null,
  smtp_secure boolean default false,

  -- Email content
  email_subject text not null,
  email_body text not null,

  -- Schedule settings
  schedule_type text default 'daily' check (schedule_type in ('daily', 'weekly', 'monthly')),
  schedule_time text default '09:00',         -- HH:MM in 24h
  schedule_day_of_week integer,               -- 0=Sun, 1=Mon ... for weekly
  schedule_day_of_month integer,              -- 1-31 for monthly
  batch_size integer default 10,              -- emails per batch (0 = all)
  batch_interval_minutes integer default 5,   -- minutes between batches
  daily_limit integer default 50,             -- stop after N emails per day

  -- Follow-up settings
  followup_count integer default 0 check (followup_count between 0 and 4),
  followup_day_1 integer,   -- days after initial email
  followup_day_2 integer,
  followup_day_3 integer,
  followup_day_4 integer,
  followup_subject_1 text,
  followup_body_1 text,
  followup_subject_2 text,
  followup_body_2 text,
  followup_subject_3 text,
  followup_body_3 text,
  followup_subject_4 text,
  followup_body_4 text,

  -- Status
  status text default 'active' check (status in ('active', 'paused', 'stopped')),

  -- Google Sheets sync
  sheets_connected boolean default false,
  sheets_id text,
  sheets_tab text,
  sheets_email_column text,

  -- Stats (denormalized for speed)
  total_leads integer default 0,
  total_sent integer default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table projects enable row level security;

create policy "Users manage their own projects"
  on projects for all using (auth.uid() = user_id);

-- ============================================================
-- CUSTOM COLUMNS per project
-- ============================================================
create table project_columns (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  name text not null,
  column_key text not null,   -- slugified key used in lead_data JSONB
  position integer default 0,
  is_email_column boolean default false,
  created_at timestamptz default now()
);

alter table project_columns enable row level security;

create policy "Users manage columns of their projects"
  on project_columns for all using (
    exists (select 1 from projects where id = project_id and user_id = auth.uid())
  );

-- ============================================================
-- LEADS
-- ============================================================
create table leads (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,

  -- Core fields
  email text not null,
  name text,

  -- Flexible custom columns stored as JSONB
  data jsonb default '{}',

  -- Email tracking
  email_status text default 'pending' check (email_status in ('pending', 'sent', 'failed', 'unsubscribed')),
  email_sent_at timestamptz,

  -- Follow-up tracking
  followup_stage integer default 0,   -- 0 = no followup sent, 1-4 = followup N sent
  followup_1_sent_at timestamptz,
  followup_2_sent_at timestamptz,
  followup_3_sent_at timestamptz,
  followup_4_sent_at timestamptz,
  next_followup_at timestamptz,

  -- Source
  source text default 'manual' check (source in ('manual', 'csv', 'sheets')),

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table leads enable row level security;

create policy "Users manage leads of their projects"
  on leads for all using (auth.uid() = user_id);

create index leads_project_id_idx on leads(project_id);
create index leads_email_status_idx on leads(email_status);
create index leads_next_followup_idx on leads(next_followup_at);

-- ============================================================
-- EMAIL LOGS (full audit trail)
-- ============================================================
create table email_logs (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  lead_id uuid references leads(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,

  type text default 'initial' check (type in ('initial', 'followup_1', 'followup_2', 'followup_3', 'followup_4')),
  to_email text not null,
  subject text not null,
  status text default 'sent' check (status in ('sent', 'failed')),
  error_message text,
  sent_at timestamptz default now()
);

alter table email_logs enable row level security;

create policy "Users view logs of their projects"
  on email_logs for all using (auth.uid() = user_id);

create index email_logs_project_id_idx on email_logs(project_id);
create index email_logs_sent_at_idx on email_logs(sent_at);

-- ============================================================
-- SEND QUEUE (manages batching and daily limits)
-- ============================================================
create table send_queue (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  lead_id uuid references leads(id) on delete cascade not null,
  type text default 'initial' check (type in ('initial', 'followup_1', 'followup_2', 'followup_3', 'followup_4')),
  scheduled_at timestamptz not null,
  status text default 'queued' check (status in ('queued', 'processing', 'done', 'failed')),
  created_at timestamptz default now()
);

alter table send_queue enable row level security;

create policy "Service role manages queue"
  on send_queue for all using (true);

create index send_queue_scheduled_idx on send_queue(scheduled_at, status);

-- ============================================================
-- DAILY SEND TRACKER (enforce daily limits)
-- ============================================================
create table daily_send_tracker (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  date date not null default current_date,
  emails_sent integer default 0,
  unique(project_id, date)
);

alter table daily_send_tracker enable row level security;

create policy "Service role manages tracker"
  on daily_send_tracker for all using (true);

-- ============================================================
-- Helper: update updated_at automatically
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_updated_at before update on projects
  for each row execute procedure update_updated_at();

create trigger leads_updated_at before update on leads
  for each row execute procedure update_updated_at();
