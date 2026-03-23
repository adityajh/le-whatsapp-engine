// src/app/api/cron/process-queue/route.ts
import { NextResponse } from 'next/server';
import { Worker } from 'bullmq';
import { config } from '@/lib/config';

// Vercel Cron will hit this endpoint every 1 minute.
// Because Vercel functions are ephemeral, we spin up a worker, let it process 
// the jobs that are waiting, and then politely close the connection before the 60s timeout.

export async function GET(request: Request) {
  // Simple auth check so external users don't trigger the drain randomly
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  console.log('[Cron] Starting queue drain session...');

  const results: any[] = [];
  
  // Start an ephemeral worker
  const worker = new Worker('outboundMessages', async (job) => {
    console.log(`[Worker] Processing job ${job.id}`);
    
    // --> Call dispatcher here
    // import { dispatchMessage } from '@/lib/engine/dispatcher';
    // await dispatchMessage(job.data);
    
    results.push(`Processed ${job.id}`);
  }, {
    connection: {
      host: new URL(config.UPSTASH_REDIS_REST_URL).hostname,
      password: config.UPSTASH_REDIS_REST_TOKEN,
      tls: {}
    },
    // We only want to process what is currently sitting in the queue right now, then die.
    drainDelay: 5,
  });

  // Wait max 50 seconds to ensure we do not hit Vercel's 60s limit
  await new Promise(resolve => setTimeout(resolve, 50000));
  
  // Safely close the worker down
  await worker.close();
  
  return NextResponse.json({ success: true, processed: results.length, details: results });
}
