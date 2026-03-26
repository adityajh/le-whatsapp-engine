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
  name: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  lead_source: z.string().optional().nullable(),
  campaign_name: z.string().optional().nullable(),
  owner_email: z.string().email().optional().nullable(),
  event_type: z.string().optional(),
  // New fields from Zoho form (all optional — may not be present on every webhook)
  program: z.string().optional().nullable(),
  persona: z.string().optional().nullable(),
  academic_level: z.string().optional().nullable(),
  relocate_to_pune: z.string().optional().nullable(),
});

/** Derive urgency from academic_level per Rule 3 */
function computeUrgency(academicLevel: string | null | undefined): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (!academicLevel) return 'HIGH'; // unknown → don't suppress
  const lvl = academicLevel.toLowerCase();
  if (lvl.includes('10th') || lvl.includes('9th') || lvl.includes('8th')) return 'LOW';
  if (lvl.includes('11th')) return 'MEDIUM';
  // 12th, graduate, already in college, or anything else → HIGH
  return 'HIGH';
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // 1. HMAC Validation (Security)
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

    // Compute urgency from academic_level (Rule 3)
    const urgency = computeUrgency(data.academic_level);

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
        program: data.program ?? null,
        persona: data.persona ?? null,
        academic_level: data.academic_level ?? null,
        relocate_to_pune: data.relocate_to_pune ?? null,
        urgency,
        wa_state: 'wa_pending',
        wa_opt_in: true,
      }, { onConflict: 'phone_normalised' })
      .select()
      .single();

    if (dbError || !lead) {
      console.error(`[Webhook] DB Error upserting lead ${data.zoho_lead_id}:`, dbError);
      return NextResponse.json({ error: 'DB Error' }, { status: 500 });
    }

    // Evaluate routing through the Logic Builder rules graph
    console.log(`[Webhook] Evaluating lead ${lead.zoho_lead_id} via Logic Builder...`);
    await evaluateLeadAction(lead);

    return NextResponse.json({ success: true, received: true, evaluated: true }, { status: 200 });

  } catch (error: any) {
    console.error(`[Webhook error] Zoho:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
