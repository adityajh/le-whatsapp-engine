import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  console.log('[Cron] Checking SLA breaches...');

  const now = new Date().toISOString();

  // Find leads where standard human response SLA is overdue and state is unresolved
  const { data: breaches, error } = await supabase
    .from('leads')
    .select('id, wa_human_response_due_at, zoho_lead_id, owner_email')
    .lt('wa_human_response_due_at', now)
    .neq('wa_state', 'closed') // Example filter based on how state is used
    .limit(50);

  if (error) {
    console.error('[SLA Monitor Error]', error);
    return new NextResponse('Error fetching SLA breaches', { status: 500 });
  }

  const results: string[] = [];
  for (const lead of breaches) {
    // Escalate to Zoho (Action: Create High-Priority Task for Manager)
    console.log(`[SLA BREACH ALERT] Lead ${lead.zoho_lead_id || lead.id} passed SLA. Escalating!`);
    
    // TODO: Actually hit Zoho API to escalate the Task
    results.push(lead.id);

    // Clear the SLA locally so it doesn't repeatedly trigger every minute
    await supabase
      .from('leads')
      .update({ wa_human_response_due_at: null })
      .eq('id', lead.id);
  }

  return NextResponse.json({ success: true, count: results.length, escalated: results });
}
