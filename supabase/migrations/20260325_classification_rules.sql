-- Classification rules table
-- One row per reply class. Keywords are matched (substring) against incoming message body.
CREATE TABLE IF NOT EXISTS classification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class VARCHAR(50) NOT NULL UNIQUE,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  hotness VARCHAR(20) NOT NULL,
  opt_out BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed with existing hardcoded keywords
INSERT INTO classification_rules (class, keywords, hotness, opt_out) VALUES
  ('stop',         ARRAY['stop','unsubscribe','opt out','opt-out'],                              'dead', true),
  ('interested',   ARRAY['yes','interested','more','tell me','want to know','haan','bata','details'], 'hot',  false),
  ('fee_question', ARRAY['fee','fees','price','cost','kitna','charges','how much'],              'warm', false),
  ('not_now',      ARRAY['busy','not now','later','baad mein','abhi nahi','call later'],         'cold', false),
  ('wrong_number', ARRAY['wrong number','not me','wrong person','galat number'],                 'dead', false),
  ('other',        ARRAY[]::TEXT[],                                                              'warm', false)
ON CONFLICT (class) DO NOTHING;
