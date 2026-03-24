import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { config } from '@/lib/config';
import { enqueueStatusUpdate } from '@/lib/queue/client';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-twilio-signature');
    const url = req.url;

    const params = new URLSearchParams(rawBody);
    const bodyArgs: Record<string, string> = {};
    params.forEach((value, key) => {
      bodyArgs[key] = value;
    });

    // 1. Validate Signature
    if (config.TWILIO_WEBHOOK_SECRET && signature) {
      const isValid = twilio.validateRequest(
        config.TWILIO_WEBHOOK_SECRET,
        signature,
        url,
        bodyArgs
      );
      if (!isValid) {
        return new NextResponse('Invalid Twilio Signature', { status: 403 });
      }
    }

    // 2. Extract Message Status
    const messageSid = bodyArgs['MessageSid'];
    const messageStatus = bodyArgs['MessageStatus']; // sent, delivered, read, failed, undelivered

    // 3. Send to Processing Queue (to update DB and Zoho)
    await enqueueStatusUpdate(bodyArgs);
    
    console.log(`[Webhook] Message ${messageSid} status updated to ${messageStatus}`);

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error(`[Webhook error] Twilio Status:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
