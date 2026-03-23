import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nodes, edges } = body;

    if (!nodes || !edges) {
      return NextResponse.json({ error: 'Missing nodes or edges payload' }, { status: 400 });
    }

    // For simplicity in Phase 1, we store the entire flow as a single "Master Workflow"
    const { data, error } = await supabase
      .from('workflow_rules')
      .upsert({
        id: '00000000-0000-0000-0000-000000000001', // Static ID for the master flow so it overwrites
        name: 'Master WhatsApp Flow',
        trigger_event: 'wa_pending',
        conditions_json: nodes, // Storing nodes schema
        actions_json: edges,    // Storing edges routing
        is_active: true,
        published_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.error('[Workflow API] Supabase Error:', error);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Workflow saved successfully' }, { status: 200 });

  } catch (err) {
    console.error('[Workflow API] Server Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
