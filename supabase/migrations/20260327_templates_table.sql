-- Templates table: persistent store for Twilio WhatsApp templates
-- Single source of truth — synced from Twilio Content API via /api/admin/templates/refresh

CREATE TABLE IF NOT EXISTS templates (
  sid         VARCHAR(40)  PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  status      VARCHAR(20)  NOT NULL DEFAULT 'unknown',
  body        TEXT,
  fetched_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_name   ON templates(name);
CREATE INDEX IF NOT EXISTS idx_templates_status ON templates(status);
