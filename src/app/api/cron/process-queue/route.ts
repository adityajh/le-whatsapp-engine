// src/app/api/cron/process-queue/route.ts
import { NextResponse } from 'next/server';
import { dequeueInbound, dequeueStatus } from '@/lib/queue/client';
import { processInboundMessage } from '@/lib/workers/inboundProcessor';
import { processStatusUpdate } from '@/lib/workers/statusProcessor';

// cron-job.org calls this every minute.
// Pulls jobs from Upstash Redis and processes them synchronously.

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  console.log('[Cron] Starting queue drain...');
  const results: string[] = [];

  try {
    // Process inbound messages (up to 10)
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

    // Process status updates (up to 10)
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
