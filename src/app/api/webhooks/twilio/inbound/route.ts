import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { config } from '@/lib/config';
import { enqueueInboundMessage } from '@/lib/queue/client';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  // Log immediately — before any validation — so we can confirm receipt in Vercel logs
  console.log('[Twilio Inbound] Webhook received');

  try {
    // 0. Global Kill Switch Check
    const { data: settings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'engine_enabled')
      .single();

    const isEnabled = settings?.value?.value ?? true;
    if (!isEnabled) {
      console.log('[Twilio Inbound] Engine disabled — skipping.');
      return new NextResponse('Engine paused', { status: 200 });
    }

    // Twilio sends data as application/x-www-form-urlencoded
    const rawBody = await req.text();
    const signature = req.headers.get('x-twilio-signature') ?? '';

    // Parse body params
    const params = new URLSearchParams(rawBody);
    const bodyArgs: Record<string, string> = {};
    params.forEach((value, key) => { bodyArgs[key] = value; });

    // 1. Construct the URL exactly as Twilio signed it.
    // In Vercel, req.url may use an internal hostname. Reconstruct from
    // the forwarded host header to match what Twilio actually called.
    const proto = req.headers.get('x-forwarded-proto') ?? 'https';
    const host  = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? new URL(req.url).host;
    const webhookUrl = `${proto}://${host}/api/webhooks/twilio/inbound`;

    console.log(`[Twilio Inbound] URL for validation: ${webhookUrl}`);
    console.log(`[Twilio Inbound] Signature present: ${!!signature}`);

    // 2. Validate Twilio Signature
    if (config.TWILIO_WEBHOOK_SECRET && signature) {
      const isValid = twilio.validateRequest(
        config.TWILIO_WEBHOOK_SECRET,
        signature,
        webhookUrl,
        bodyArgs
      );

      if (!isValid) {
        console.warn(`[Twilio Inbound] Invalid signature. URL used: ${webhookUrl}`);
        return new NextResponse('Invalid Twilio Signature', { status: 403 });
      }
    }

    // 3. Enqueue for processing
    const fromNumber = bodyArgs['From'];
    console.log('[Twilio Inbound] Raw body args:', JSON.stringify(bodyArgs, null, 2));
    await enqueueInboundMessage(bodyArgs);
    console.log(`[Twilio Inbound] Enqueued message from ${fromNumber}`);

    const twiml = new twilio.twiml.MessagingResponse();
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('[Twilio Inbound] Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
