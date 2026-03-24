// src/app/api/cron/process-queue/route.ts
import { NextResponse } from 'next/server';
import { Worker } from 'bullmq';
import { config } from '@/lib/config';
import { processInboundMessage } from '@/lib/workers/inboundProcessor';
import { processStatusUpdate } from '@/lib/workers/statusProcessor';

// Vercel Cron will hit this endpoint every 1 minute.
// Because Vercel functions are ephemeral, we spin up workers, let them process 
// the jobs that are waiting, and then politely close the connection before the 60s timeout.

export async function GET(request: Request) {
  // Simple auth check so external users don't trigger the drain randomly
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  console.log('[Cron] Starting queue drain session...');

  const results: string[] = [];
  const connection = {
    host: new URL(config.UPSTASH_REDIS_REST_URL).hostname,
    port: Number(new URL(config.UPSTASH_REDIS_REST_URL).port || 6379),
    username: 'default',
    password: config.UPSTASH_REDIS_REST_TOKEN,
    tls: {}
  };

  // Start ephemeral workers with queue rate limiter constraints (30/min default)
  const outboundWorker = new Worker('outboundMessages', async (job) => {
    console.log(`[Worker Outbound] Processing job ${job.id}`);
    // --> Call dispatcher here
    // import { dispatchMessage } from '@/lib/engine/dispatcher';
    // await dispatchMessage(job.data);
    results.push(`Outbound ${job.id}`);
  }, { 
    connection, 
    drainDelay: 5,
    limiter: { max: 30, duration: 60000 }
  });

  const inboundWorker = new Worker('inboundMessages', async (job) => {
    console.log(`[Worker Inbound] Processing job ${job.id}`);
    await processInboundMessage(job);
    results.push(`Inbound ${job.id}`);
  }, { connection, drainDelay: 5 });

  const statusWorker = new Worker('statusUpdates', async (job) => {
    console.log(`[Worker Status] Processing job ${job.id}`);
    await processStatusUpdate(job);
    results.push(`Status ${job.id}`);
  }, { connection, drainDelay: 5 });

  // Wait max 50 seconds to ensure we do not hit Vercel's 60s limit
  await new Promise(resolve => setTimeout(resolve, 50000));
  
  // Safely close workers down
  await Promise.all([
    outboundWorker.close(),
    inboundWorker.close(),
    statusWorker.close()
  ]);
  
  return NextResponse.json({ success: true, processed: results.length, details: results });
}
