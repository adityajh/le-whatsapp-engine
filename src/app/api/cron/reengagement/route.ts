import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { enqueueOutboundMessage } from '@/lib/queue/client';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  console.log('[Cron] Starting 7-day Re-engagement Sweep...');

  // Target leads whose last inbound activity was > 7 days ago
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Rules:
  // - wa_last_inbound_at < 7 days ago
  // - They are still opted in
  // - Their state is not terminal (closed, opted_out, invalid_number, wa_reengaged)
  // - They are not fully dead priority
  const { data: targets, error } = await supabase
    .from('leads')
    .select('id, phone_normalised, zoho_lead_id')
    .not('wa_last_inbound_at', 'is', null)
    .lt('wa_last_inbound_at', sevenDaysAgo)
    .eq('wa_opt_in', true)
    .not('wa_state', 'in', '("wa_closed", "opted_out", "invalid_number", "wa_reengaged")')
    .not('wa_hotness', 'eq', 'dead')
    .limit(100);

  if (error) {
    console.error('[Re-engagement Error]', error);
    return new NextResponse('Error fetching dormant leads', { status: 500 });
  }

  if (!targets || targets.length === 0) {
    return NextResponse.json({ success: true, count: 0, message: 'No dormant leads found.' });
  }

  console.log(`[Cron] Found ${targets.length} dormant leads. Enqueueing re-engagement templates...`);

  let count = 0;
  for (const lead of targets) {
    try {
      // 1. Enqueue the message using the known re-engagement template SID
      // In a real scenario, this SID comes from DB mapping. Using placeholder per Architecture.
      await enqueueOutboundMessage({
        to: lead.phone_normalised,
        contentSid: 'HX_wa_reengagement_placeholder',
      });

      // 2. Update their state to 'wa_reengaged' so we don't spam them again
      await supabase
        .from('leads')
        .update({ wa_state: 'wa_reengaged' })
        .eq('id', lead.id);

      count++;
    } catch (err) {
      console.error(`Failed to re-engage lead ${lead.id}`, err);
    }
  }

  return NextResponse.json({ success: true, count });
}
