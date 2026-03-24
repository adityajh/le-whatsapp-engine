// src/app/api/cron/process-queue/route.ts
import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { processInboundMessage } from '@/lib/workers/inboundProcessor';
import { processStatusUpdate } from '@/lib/workers/statusProcessor';

// cron-job.org / Vercel Cron hits this endpoint every 1 minute.
// Pulls jobs from Upstash Redis via REST API (no raw TCP — compatible with serverless).

const redis = Redis.fromEnv();

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  console.log('[Cron] Starting queue drain session...');
  const results: string[] = [];

  try {
    // Pull up to 10 inbound messages and process each
    for (let i = 0; i < 10; i++) {
      const job = await redis.lpop('bull:inboundMessages:wait') as string | null;
      if (!job) break;
      try {
        const data = typeof job === 'string' ? JSON.parse(job) : job;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await processInboundMessage({ data } as any);
        results.push(`inbound:${i}`);
      } catch (e) {
        console.error('[Cron] Inbound job error', e);
      }
    }

    // Pull up to 10 status updates and process each
    for (let i = 0; i < 10; i++) {
      const job = await redis.lpop('bull:statusUpdates:wait') as string | null;
      if (!job) break;
      try {
        const data = typeof job === 'string' ? JSON.parse(job) : job;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await processStatusUpdate({ data } as any);
        results.push(`status:${i}`);
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
