import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { config } from '@/lib/config';

export async function POST(req: NextRequest) {
  try {
    // Twilio sends data as application/x-www-form-urlencoded
    const rawBody = await req.text();
    const signature = req.headers.get('x-twilio-signature');
    
    // In Next.js App Router, to get the absolute URL of the request:
    const url = req.url;

    // Convert rawUrlEncoded to a record object Twilio validator expects
    const params = new URLSearchParams(rawBody);
    const bodyArgs: Record<string, string> = {};
    params.forEach((value, key) => {
      bodyArgs[key] = value;
    });

    // 1. Validate Twilio Signature
    if (config.TWILIO_WEBHOOK_SECRET && signature) {
      const isValid = twilio.validateRequest(
        config.TWILIO_WEBHOOK_SECRET, // Must be auth token in typical setup
        signature,
        url,
        bodyArgs
      );
      
      if (!isValid) {
        return new NextResponse('Invalid Twilio Signature', { status: 403 });
      }
    }

    // 2. Extract key fields
    const fromNumber = bodyArgs['From']; // e.g. "whatsapp:+919876543210"
    const body = bodyArgs['Body'];
    const messageSid = bodyArgs['MessageSid'];

    // 3. Send to Processing Queue
    // TODO: enqueue inbound message processor
    
    console.log(`[Webhook] Received Inbound Twilio Msg from ${fromNumber}`);

    // Twilio expects a valid TwiML response or a 200 OK empty response for async webhooks.
    const twiml = new twilio.twiml.MessagingResponse();
    // Returning empty MessagingResponse so Twilio knows we received it, we will reply asynchronously.
    
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' }
    });

  } catch (error) {
    console.error(`[Webhook error] Twilio Inbound:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
