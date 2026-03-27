-- Create system_settings table for global configuration
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access" ON public.system_settings
    FOR ALL USING (true) WITH CHECK (true);

-- Initial data: Engine Enabled
INSERT INTO public.system_settings (key, value)
VALUES ('engine_enabled', '{"value": true}')
ON CONFLICT (key) DO NOTHING;
