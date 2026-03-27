import { z } from 'zod';

const envSchema = z.object({
  // Supabase (Postgres)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Upstash Redis (BullMQ queue)
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

  // Twilio
  TWILIO_ACCOUNT_SID: z.string().min(1),
  TWILIO_AUTH_TOKEN: z.string().min(1),
  TWILIO_WEBHOOK_SECRET: z.string().min(1).optional(),
  TWILIO_MESSAGING_SERVICE_SID: z.string().startsWith('MG').optional(),

  // Zoho
  ZOHO_WEBHOOK_SECRET: z.string().min(1), // Used to validate incoming HMAC signatures
  ZOHO_CLIENT_ID: z.string().min(1).optional(),
  ZOHO_CLIENT_SECRET: z.string().min(1).optional(),
  ZOHO_REFRESH_TOKEN: z.string().min(1).optional(),

  // App Config
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

// Validate environment early via parse 
const result = envSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_WEBHOOK_SECRET: process.env.TWILIO_WEBHOOK_SECRET,
  TWILIO_MESSAGING_SERVICE_SID: process.env.TWILIO_MESSAGING_SERVICE_SID,
  ZOHO_WEBHOOK_SECRET: process.env.ZOHO_WEBHOOK_SECRET,
  ZOHO_CLIENT_ID: process.env.ZOHO_CLIENT_ID,
  ZOHO_CLIENT_SECRET: process.env.ZOHO_CLIENT_SECRET,
  ZOHO_REFRESH_TOKEN: process.env.ZOHO_REFRESH_TOKEN,
  NODE_ENV: process.env.NODE_ENV,
});

if (!result.success) {
  console.error('❌ Invalid environment variables:\n', result.error.format());
  throw new Error('Invalid environment variables');
}

export const config = result.data;
