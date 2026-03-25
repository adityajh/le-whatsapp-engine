import { redisClient } from '../queue/client';
import { config } from '../config';
import { TEMPLATE_SIDS } from '../constants';

const CACHE_KEY = 'le:twilio:templates';
const CACHE_TTL = 3600; // 1 hour

export type TwilioTemplate = {
  sid: string;
  name: string; // friendly_name from Twilio
};

async function fetchFromTwilio(): Promise<TwilioTemplate[]> {
  const credentials = Buffer.from(
    `${config.TWILIO_ACCOUNT_SID}:${config.TWILIO_AUTH_TOKEN}`
  ).toString('base64');

  const res = await fetch('https://content.twilio.com/v1/Contents?PageSize=50', {
    headers: { Authorization: `Basic ${credentials}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Twilio Content API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  return (data.contents || [])
    .filter((c: any) => c.approval_requests?.status === 'approved')
    .map((c: any) => ({
      sid: c.sid as string,
      name: c.friendly_name as string,
    }));
}

export async function getTwilioTemplates(): Promise<TwilioTemplate[]> {
  const cached = await redisClient.get<TwilioTemplate[]>(CACHE_KEY);
  if (cached) return cached;

  const templates = await fetchFromTwilio();
  await redisClient.set(CACHE_KEY, templates, { ex: CACHE_TTL });
  return templates;
}

/**
 * Resolve a template friendly_name to its Twilio Content SID.
 * Checks constants.ts first (fast), then falls back to live Twilio lookup.
 */
export async function getTwilioTemplateSid(name: string): Promise<string | null> {
  if (TEMPLATE_SIDS[name]) return TEMPLATE_SIDS[name];

  try {
    const templates = await getTwilioTemplates();
    return templates.find((t) => t.name === name)?.sid ?? null;
  } catch (err) {
    console.error('[Templates] Live Twilio lookup failed:', err);
    return null;
  }
}
