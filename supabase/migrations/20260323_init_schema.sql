-- supabase/migrations/20260323_init_schema.sql

-- Leads Mirror
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zoho_lead_id VARCHAR(100) UNIQUE, -- To match Zoho Lead ID
  phone_normalised VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255),
  email VARCHAR(255),
  lead_source VARCHAR(100),
  campaign_name VARCHAR(255),
  owner_email VARCHAR(255),
  
  wa_opt_in BOOLEAN DEFAULT false,
  wa_state VARCHAR(50) DEFAULT 'wa_pending',
  wa_hotness VARCHAR(50),
  wa_last_outbound_at TIMESTAMPTZ,
  wa_last_inbound_at TIMESTAMPTZ,
  wa_last_template VARCHAR(100),
  wa_last_status VARCHAR(50),
  wa_last_twilio_sid VARCHAR(255),
  wa_reply_class VARCHAR(50),
  wa_sender_key VARCHAR(50),
  wa_human_response_due_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Immutable Event Log
CREATE TABLE lead_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  direction VARCHAR(20) NOT NULL, -- 'inbound' or 'outbound'
  twilio_sid VARCHAR(100),
  template_id VARCHAR(100),
  template_variant_id VARCHAR(100),
  content TEXT,
  status VARCHAR(50), -- 'sent', 'delivered', 'read', 'failed'
  sender_number VARCHAR(50) NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ
);

-- Sender Profiles
CREATE TABLE sender_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  warmup_limit INTEGER DEFAULT 250,
  current_daily_count INTEGER DEFAULT 0,
  quality_score VARCHAR(50) DEFAULT 'HIGH',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Workflow Rules (Logic Builder)
CREATE TABLE workflow_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  trigger_event VARCHAR(100) NOT NULL,
  conditions_json JSONB DEFAULT '{}'::JSONB,
  actions_json JSONB DEFAULT '{}'::JSONB,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  published_at TIMESTAMPTZ,
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_leads_zoho_id ON leads(zoho_lead_id);
CREATE INDEX idx_leads_phone ON leads(phone_normalised);
CREATE INDEX idx_leads_state ON leads(wa_state);
CREATE INDEX idx_messages_lead_id ON messages(lead_id);
CREATE INDEX idx_events_lead_id ON lead_events(lead_id);
