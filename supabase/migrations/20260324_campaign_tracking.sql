create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  template_variant_id text not null,
  segment_filters jsonb default '{}'::jsonb,
  scheduled_time timestamp with time zone,
  status text not null default 'draft', -- draft, scheduled, running, completed, paused
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.campaign_leads (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  status text not null default 'pending', -- pending, sent, delivered, read, replied, failed
  error_code text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- RLS
alter table public.campaigns enable row level security;
alter table public.campaign_leads enable row level security;
