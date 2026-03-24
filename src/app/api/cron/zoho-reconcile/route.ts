import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  console.log('[Cron] Starting Zoho reconciliation...');

  // Catch leads with missing WA_State but have opted in
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, phone_normalised, zoho_lead_id, wa_state, created_at')
    .eq('wa_opt_in', true)
    .is('wa_state', null)
    .limit(100);

  if (error) {
    console.error('[Reconciliation Error]', error);
    return new NextResponse('Error fetching leads', { status: 500 });
  }

  const results: string[] = [];

  for (const lead of leads) {
    // This is a stub for where we would trigger a Zoho update
    // or push to a reconciliation queue to fetch state from Zoho
    // and sync it down, or update Zoho to 'pending_first_message'
    
    // As a placeholder, we just log it and maybe set wa_state locally to 'pending_sync'
    await supabase
      .from('leads')
      .update({ wa_state: 'pending_sync' })
      .eq('id', lead.id);

    console.log(`[Reconciliation] Lead ${lead.zoho_lead_id || lead.id} flagged for sync.`);
    results.push(lead.zoho_lead_id || lead.id);
  }

  return NextResponse.json({ success: true, reconciled_count: results.length, leads: results });
}
