// src/app/api/cron/process-queue/route.ts
import { NextResponse } from 'next/server';
import { dequeueInbound, dequeueOutbound, dequeueStatus, dequeueDelayedOutbound } from '@/lib/queue/client';
import { processInboundMessage } from '@/lib/workers/inboundProcessor';
import { processStatusUpdate } from '@/lib/workers/statusProcessor';
import { dispatchMessage } from '@/lib/engine/dispatcher';
import { isWithinSendWindow } from '@/lib/engine/sessionWindow';

// cron-job.org calls this every minute.
// Drains inbound, outbound, status, and sweeps delayed outbound.

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  console.log('[Cron] Queue drain starting...');
  const results: string[] = [];

  try {
    // 1. Process inbound messages (classify replies, update Supabase)
    const inboundJobs = await dequeueInbound(10);
    for (const data of inboundJobs) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await processInboundMessage({ data } as any);
        results.push(`inbound:${data.From}`);
      } catch (e) {
        console.error('[Cron] Inbound job error', e);
      }
    }

    // 2. Dispatch outbound messages via Twilio
    // First, if window is open, sweep some from delayed into active or process directly
    if (isWithinSendWindow()) {
      const delayedJobs = await dequeueDelayedOutbound(5);
      for (const data of delayedJobs) {
        try {
          const msg = await dispatchMessage({
            to:         data.to,
            from:       data.from,
            contentSid: data.contentSid,
          });
          if (msg) {
            results.push(`outbound_delayed:${data.to}:${msg.sid}`);
            console.log(`[Cron] Sent delayed ${data.contentSid} to ${data.to} — SID: ${msg.sid}`);
          }
        } catch (e) {
          console.error(`[Cron] Delayed outbound dispatch error for ${data.to}`, e);
        }
      }
    }

    // Process regular outbound queue
    const outboundJobs = await dequeueOutbound(10);
    for (const data of outboundJobs) {
      try {
        const msg = await dispatchMessage({
          to:         data.to,
          from:       data.from,
          contentSid: data.contentSid,
        });
        if (msg) {
          results.push(`outbound:${data.to}:${msg.sid}`);
          console.log(`[Cron] Sent ${data.contentSid} to ${data.to} — SID: ${msg.sid}`);
        }
      } catch (e) {
        console.error(`[Cron] Outbound dispatch error for ${data.to}`, e);
      }
    }

    // 3. Process status updates (delivery/read/failed callbacks)
    const statusJobs = await dequeueStatus(10);
    for (const data of statusJobs) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await processStatusUpdate({ data } as any);
        results.push(`status:${data.MessageSid}`);
      } catch (e) {
        console.error('[Cron] Status job error', e);
      }
    }
  } catch (err) {
    console.error('[Cron] Fatal error', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ success: true, processed: results.length, details: results });
}
