-- Add error_code and phone_normalised to messages table
-- error_code: stores Twilio error codes (63049, 63032, 21211, etc.) from status callbacks
-- phone_normalised: mirrors the lead phone — allows cooldown enforcement and status writeback
--   without an extra join. The dispatcher already tries to write this field.

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS error_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS phone_normalised VARCHAR(20);

-- Indexes for analytics and cooldown queries
CREATE INDEX IF NOT EXISTS idx_messages_status       ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_phone        ON messages(phone_normalised);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at      ON messages(sent_at DESC);
