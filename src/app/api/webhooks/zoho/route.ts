import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { config } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import { evaluateLeadAction } from '@/lib/engine/rulesEngine';

// Define expected Zoho payload schema loosely for now
const zohoPayloadSchema = z.object({
  id: z.string().optional(),
  zoho_lead_id: z.string(),
  phone: z.string(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  lead_source: z.string().optional(),
  campaign_name: z.string().optional(),
  owner_email: z.string().email().optional(),
  event_type: z.string().optional(), // 'created', 'updated', 'no_activity'
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    
    // 1. HMAC Validation (Security)
    // Assuming Zoho sends signature in 'X-Zoho-Signature' header
    const signature = req.headers.get('x-zoho-signature');
    
    if (signature && config.ZOHO_WEBHOOK_SECRET) {
      const generatedSignature = crypto
        .createHmac('sha256', config.ZOHO_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');
        
      if (signature !== generatedSignature) {
        return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
      }
    }

    // 2. Parse payload
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // 3. Validate Payload structure
    const validation = zohoPayloadSchema.safeParse(payload);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid payload structure', details: validation.error }, { status: 400 });
    }

    const data = validation.data;

    // Normalise Phone
    const phone = data.phone.replace(/\D/g, '');
    const cleanPhone = phone.startsWith('91') ? `+${phone}` : (phone.length === 10 ? `+91${phone}` : `+${phone}`);

    // Upsert Lead into Supabase Mirror
    const { data: lead, error: dbError } = await supabase
      .from('leads')
      .upsert({
        zoho_lead_id: data.zoho_lead_id,
        phone_normalised: cleanPhone,
        name: data.name,
        email: data.email,
        lead_source: data.lead_source,
        campaign_name: data.campaign_name,
        owner_email: data.owner_email,
        wa_state: 'wa_pending',
        wa_opt_in: true, // Assuming creation inherently opts them in initially
      }, { onConflict: 'phone_normalised' })
      .select()
      .single();

    if (dbError || !lead) {
      console.error(`[Webhook] DB Error upserting lead ${data.zoho_lead_id}:`, dbError);
      return NextResponse.json({ error: 'DB Error' }, { status: 500 });
    }

    // Evaluate dynamic source-based routing natively through the React Flow rules engine
    console.log(`[Webhook] Evaluating lead ${lead.zoho_lead_id} via Logic Builder...`);
    await evaluateLeadAction(lead);
    
    return NextResponse.json({ success: true, received: true, evaluated: true }, { status: 200 });

  } catch (error: any) {
    console.error(`[Webhook error] Zoho:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
