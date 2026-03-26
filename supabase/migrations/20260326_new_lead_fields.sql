-- New fields required for rules engine v3.1 (25 Mar 2026 handoff)
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS program          TEXT,            -- 'BBA Pune' | 'Storysells' | etc.
  ADD COLUMN IF NOT EXISTS persona          TEXT,            -- 'Student' | 'Parent'
  ADD COLUMN IF NOT EXISTS academic_level   TEXT,            -- '12th' | '11th' | '10th' | 'Graduate' | 'Already in college'
  ADD COLUMN IF NOT EXISTS relocate_to_pune TEXT,            -- 'Yes' | 'No' | NULL
  ADD COLUMN IF NOT EXISTS urgency          TEXT,            -- 'HIGH' | 'MEDIUM' | 'LOW'
  ADD COLUMN IF NOT EXISTS lead_track       TEXT,            -- 'enterprise_leadership' | 'family_business' | 'venture_builder'
  ADD COLUMN IF NOT EXISTS webinar_rsvp     BOOLEAN;         -- true=yes | false=no | NULL=not yet asked
