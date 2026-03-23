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
  }
});

/**
 * Enqueue a message to be sent asynchronously by the worker
 */
export async function enqueueOutboundMessage(payload: any) {
  try {
    const job = await outboundQueue.add('sendWhatsApp', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
    console.log(`[Queue] Added job ${job.id} to outbound messages.`);
    return job;
  } catch (error) {
    console.error(`[Queue Error] Failed to enqueue outbound message`, error);
    throw error;
  }
}
