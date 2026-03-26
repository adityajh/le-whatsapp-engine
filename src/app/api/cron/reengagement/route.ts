import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { enqueueOutboundMessage } from '@/lib/queue/client';
import { getTwilioTemplateSid } from '@/lib/twilio/templates';
import { isWithinSendWindow } from '@/lib/engine/sessionWindow';

const PRIMARY_SENDER = '+917709333161';

/**
 * Follow-up sweep — runs on the same cron-job.org schedule as before (every few minutes).
 *
 * Rule 5: wa_state = 'first_sent', no inbound reply after 24 h → send wa_followup_1
 *         Hard stop: max 2 outbound before any reply (enforced by dispatcher).
 *
 * Rule 6a: wa_state = 'replied', 48 h silence, lead_track IS NULL → send wa_track_selector
 * Rule 6b: wa_state = 'replied', 48 h silence, lead_track IS NOT NULL → send wa_followup_2_quickreply
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  if (!isWithinSendWindow()) {
    return NextResponse.json({ success: true, skipped: 'outside send window' });
  }

  console.log('[Cron] Follow-up sweep starting...');

  const now = Date.now();
  const h24ago = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const h48ago = new Date(now - 48 * 60 * 60 * 1000).toISOString();
  const results: string[] = [];

  // ── Rule 5: 24h no-reply follow-up ───────────────────────────────────────
  const { data: rule5Leads } = await supabase
    .from('leads')
    .select('id, phone_normalised, name')
    .eq('wa_state', 'first_sent')
    .eq('wa_opt_in', true)
    .lt('wa_last_outbound_at', h24ago)
    .is('wa_last_inbound_at', null)
    .limit(50);

  for (const lead of rule5Leads ?? []) {
    try {
      const contentSid = await getTwilioTemplateSid('wa_followup_1');
      if (!contentSid) {
        console.warn(`[Cron Rule5] wa_followup_1 SID not found — skipping ${lead.phone_normalised}`);
        continue;
      }
      await enqueueOutboundMessage({
        to:               lead.phone_normalised,
        from:             PRIMARY_SENDER,
        contentSid,
        templateName:     'wa_followup_1',
        contentVariables: JSON.stringify({ "1": lead.name ?? 'there' }),
      });
      await supabase
        .from('leads')
        .update({ wa_state: 'followup_sent', wa_last_outbound_at: new Date().toISOString() })
        .eq('id', lead.id);
      results.push(`rule5:${lead.phone_normalised}`);
    } catch (err) {
      console.error(`[Cron Rule5] Failed for ${lead.phone_normalised}`, err);
    }
  }

  // ── Rule 6a: 48h post-reply silence, no track set → wa_track_selector ─────
  const { data: rule6aLeads } = await supabase
    .from('leads')
    .select('id, phone_normalised, name')
    .eq('wa_state', 'replied')
    .eq('wa_opt_in', true)
    .lt('wa_last_inbound_at', h48ago)
    .is('lead_track', null)
    .limit(50);

  for (const lead of rule6aLeads ?? []) {
    try {
      const contentSid = await getTwilioTemplateSid('wa_track_selector');
      if (!contentSid) {
        console.warn(`[Cron Rule6a] wa_track_selector SID not found — skipping ${lead.phone_normalised}`);
        continue;
      }
      await enqueueOutboundMessage({
        to:               lead.phone_normalised,
        from:             PRIMARY_SENDER,
        contentSid,
        templateName:     'wa_track_selector',
        contentVariables: JSON.stringify({ "1": lead.name ?? 'there' }),
      });
      await supabase
        .from('leads')
        .update({ wa_last_outbound_at: new Date().toISOString() })
        .eq('id', lead.id);
      results.push(`rule6a:${lead.phone_normalised}`);
    } catch (err) {
      console.error(`[Cron Rule6a] Failed for ${lead.phone_normalised}`, err);
    }
  }

  // ── Rule 6b: 48h post-reply silence, track already set → wa_followup_2 ───
  const { data: rule6bLeads } = await supabase
    .from('leads')
    .select('id, phone_normalised, name')
    .eq('wa_state', 'replied')
    .eq('wa_opt_in', true)
    .lt('wa_last_inbound_at', h48ago)
    .not('lead_track', 'is', null)
    .limit(50);

  for (const lead of rule6bLeads ?? []) {
    try {
      const contentSid = await getTwilioTemplateSid('wa_followup_2_quickreply');
      if (!contentSid) {
        console.warn(`[Cron Rule6b] wa_followup_2_quickreply SID not found — skipping ${lead.phone_normalised}`);
        continue;
      }
      await enqueueOutboundMessage({
        to:               lead.phone_normalised,
        from:             PRIMARY_SENDER,
        contentSid,
        templateName:     'wa_followup_2_quickreply',
        contentVariables: JSON.stringify({ "1": lead.name ?? 'there' }),
      });
      await supabase
        .from('leads')
        .update({ wa_last_outbound_at: new Date().toISOString() })
        .eq('id', lead.id);
      results.push(`rule6b:${lead.phone_normalised}`);
    } catch (err) {
      console.error(`[Cron Rule6b] Failed for ${lead.phone_normalised}`, err);
    }
  }

  console.log(`[Cron] Follow-up sweep complete: ${results.length} messages queued.`);
  return NextResponse.json({ success: true, count: results.length, details: results });
}
