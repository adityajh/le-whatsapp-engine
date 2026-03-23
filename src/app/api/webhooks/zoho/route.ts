import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { config } from '@/lib/config';

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

    // 4. Send to Queue (BullMQ) or immediate processing
    // TODO: enqueue(data)
    
    console.log(`[Webhook] Received Zoho Lead: ${data.zoho_lead_id}`);

    return NextResponse.json({ success: true, received: true }, { status: 200 });

  } catch (error: any) {
    console.error(`[Webhook error] Zoho:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
