import { Redis } from '@upstash/redis';
import { config } from '../config';
import { isWithinSendWindow } from '../engine/sessionWindow';

// Initialize Upstash Redis via REST (serverless-safe — no raw TCP)
export const redisClient = new Redis({
  url: config.UPSTASH_REDIS_REST_URL,
  token: config.UPSTASH_REDIS_REST_TOKEN,
});

// Simple queue key prefix
const QUEUE_PREFIX = 'le:queue';

/**
 * Enqueue an inbound message from Twilio to be processed.
 */
export async function enqueueInboundMessage(payload: Record<string, string>) {
  const key = `${QUEUE_PREFIX}:inbound`;
  await redisClient.rpush(key, JSON.stringify(payload));
  console.log(`[Queue] Enqueued inbound message from ${payload.From}`);
}

/**
 * Enqueue a Twilio status update to be processed.
 */
export async function enqueueStatusUpdate(payload: Record<string, string>) {
  const key = `${QUEUE_PREFIX}:status`;
  await redisClient.rpush(key, JSON.stringify(payload));
  console.log(`[Queue] Enqueued status update for ${payload.MessageSid}`);
}

/**
 * Enqueue an outbound WhatsApp message.
 * Respects time-of-day send window by storing
 * the message with a scheduled flag if outside window.
 */
export async function enqueueOutboundMessage(payload: Record<string, string>) {
  // Use consolidated logic from sessionWindow.ts
  if (!isWithinSendWindow()) {
    console.log(`[Queue] Outside IST send window. Storing for next window.`);
    // Store in delayed queue, will be picked up by cron once window opens
    const delayedKey = `${QUEUE_PREFIX}:outbound:delayed`;
    await redisClient.rpush(delayedKey, JSON.stringify(payload));
    return;
  }

  const key = `${QUEUE_PREFIX}:outbound`;
  await redisClient.rpush(key, JSON.stringify(payload));
  console.log(`[Queue] Enqueued outbound message to ${payload.to}`);
}

/**
 * Dequeue up to `count` inbound messages for processing.
 */
export async function dequeueInbound(count = 10): Promise<Record<string, string>[]> {
  const results: Record<string, string>[] = [];
  for (let i = 0; i < count; i++) {
    const item = await redisClient.lpop(`${QUEUE_PREFIX}:inbound`) as string | null;
    if (!item) break;
    try {
      results.push(typeof item === 'string' ? JSON.parse(item) : item);
    } catch (e) {
      console.error('[Queue] Failed to parse inbound item', e);
    }
  }
  return results;
}

/**
 * Dequeue up to `count` status updates for processing.
 */
export async function dequeueStatus(count = 10): Promise<Record<string, string>[]> {
  const results: Record<string, string>[] = [];
  for (let i = 0; i < count; i++) {
    const item = await redisClient.lpop(`${QUEUE_PREFIX}:status`) as string | null;
    if (!item) break;
    try {
      results.push(typeof item === 'string' ? JSON.parse(item) : item);
    } catch (e) {
      console.error('[Queue] Failed to parse status item', e);
    }
  }
  return results;
}

/**
 * Dequeue up to `count` outbound messages ready to be dispatched via Twilio.
 */
export async function dequeueOutbound(count = 10): Promise<Record<string, string>[]> {
  const results: Record<string, string>[] = [];
  for (let i = 0; i < count; i++) {
    const item = await redisClient.lpop(`${QUEUE_PREFIX}:outbound`) as string | null;
    if (!item) break;
    try {
      results.push(typeof item === 'string' ? JSON.parse(item) : item);
    } catch (e) {
      console.error('[Queue] Failed to parse outbound item', e);
    }
  }
  return results;
}

/**
 * Dequeue up to `count` delayed outbound messages to move into the active queue.
 */
export async function dequeueDelayedOutbound(count = 10): Promise<Record<string, string>[]> {
  const results: Record<string, string>[] = [];
  for (let i = 0; i < count; i++) {
    const item = await redisClient.lpop(`${QUEUE_PREFIX}:outbound:delayed`) as string | null;
    if (!item) break;
    try {
      results.push(typeof item === 'string' ? JSON.parse(item) : item);
    } catch (e) {
      console.error('[Queue] Failed to parse delayed item', e);
    }
  }
  return results;
}
