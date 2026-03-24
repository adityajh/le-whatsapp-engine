import { Queue } from 'bullmq';
import { Redis } from '@upstash/redis';
import { config } from '../config';

// Initialize Upstash Redis instance
export const redisClient = new Redis({
  url: config.UPSTASH_REDIS_REST_URL,
  token: config.UPSTASH_REDIS_REST_TOKEN,
});

// Since BullMQ primarily relies on persistent Redis connections, using Upstash requires a workaround
// For a fully serverless setup, many prefer `@upstash/qstash` for webhooks fetching instead of BullMQ.
// However, since we committed to BullMQ, we create standard Queue interfaces. 
// *Note: The background Worker must be run in a separate persistent environment OR we use Vercel cron to drain synchronous tasks.

export const outboundQueue = new Queue('outboundMessages', {
  connection: {
    host: new URL(config.UPSTASH_REDIS_REST_URL).hostname,
    port: Number(new URL(config.UPSTASH_REDIS_REST_URL).port || 6379),
    username: 'default',
    password: config.UPSTASH_REDIS_REST_TOKEN,
    tls: {}
  },
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false
  }
});

// Note: BullMQ rate limiting is actually configured on the Worker side in process-queue/route.ts
// Usually via e.g. `limiter: { max: 30, duration: 60000 }`

/**
 * Enqueue a message to be sent asynchronously by the worker
 */
export async function enqueueOutboundMessage(payload: Record<string, string>) {
  try {
    // Time-of-day logic: 9 AM to 8 PM IST
    // IST is UTC + 5:30
    const now = new Date();
    
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(now.getTime() + istOffset);
    const hoursIST = nowIST.getUTCHours();
    
    let delay = 0;
    
    // If it's before 9 AM IST or after 8 PM IST, delay until 9 AM IST
    if (hoursIST >= 20 || hoursIST < 9) {
      // Calculate next 9 AM IST
      const next9AM = new Date(nowIST.getTime());
      if (hoursIST >= 20) {
        next9AM.setUTCDate(next9AM.getUTCDate() + 1); // Tomorrow
      }
      next9AM.setUTCHours(9, 0, 0, 0); // 9 AM
      // Calculate delay in ms
      delay = next9AM.getTime() - nowIST.getTime();
      console.log(`[Queue] Outside IST window. Delaying message by ${Math.round(delay/1000/60)} minutes until 9 AM IST.`);
    }

    const job = await outboundQueue.add('sendWhatsApp', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      delay: delay > 0 ? delay : undefined,
    });
    console.log(`[Queue] Added job ${job.id} to outbound messages.`);
    return job;
  } catch (error) {
    console.error(`[Queue Error] Failed to enqueue outbound message`, error);
    throw error;
  }
}

export const inboundQueue = new Queue('inboundMessages', {
  connection: {
    host: new URL(config.UPSTASH_REDIS_REST_URL).hostname,
    port: Number(new URL(config.UPSTASH_REDIS_REST_URL).port || 6379),
    username: 'default',
    password: config.UPSTASH_REDIS_REST_TOKEN,
    tls: {}
  }
});

export const statusQueue = new Queue('statusUpdates', {
  connection: {
    host: new URL(config.UPSTASH_REDIS_REST_URL).hostname,
    port: Number(new URL(config.UPSTASH_REDIS_REST_URL).port || 6379),
    username: 'default',
    password: config.UPSTASH_REDIS_REST_TOKEN,
    tls: {}
  }
});

export async function enqueueInboundMessage(payload: Record<string, string>) {
  try {
    const job = await inboundQueue.add('processInbound', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      jobId: payload.MessageSid, // Idempotency key
    });
    console.log(`[Queue] Added job ${job.id} to inbound messages.`);
    return job;
  } catch (error) {
    console.error(`[Queue Error] Failed to enqueue inbound message`, error);
    throw error;
  }
}

export async function enqueueStatusUpdate(payload: Record<string, string>) {
  try {
    const job = await statusQueue.add('processStatus', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      jobId: `${payload.MessageSid}_${payload.MessageStatus}`, // Idempotency
    });
    console.log(`[Queue] Added job ${job.id} to status updates.`);
    return job;
  } catch (error) {
    console.error(`[Queue Error] Failed to enqueue status update`, error);
    throw error;
  }
}
