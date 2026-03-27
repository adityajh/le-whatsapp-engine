/**
 * Backfill messages table from Twilio's message history.
 * Fetches all outbound WhatsApp messages sent today from our sender,
 * matches them to leads by phone number, and inserts them into Supabase.
 *
 * Note: Twilio logs don't return the Content SID (HX...), so
 * template_variant_id will be null on backfilled rows — they appear in
 * the Message Log tab but not in Template Performance aggregates.
 *
 * Usage: npx tsx scripts/backfill-messages.ts
 */

import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';
const SENDER     = '+917709333161';
const WA_SENDER  = `whatsapp:${SENDER}`;

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!,
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function normalisePhone(raw: string): string {
  const stripped = raw.replace('whatsapp:', '');
  return stripped.startsWith('+') ? stripped : `+${stripped}`;
}

function mapStatus(twilioStatus: string): string {
  if (twilioStatus === 'delivered')                         return 'delivered';
  if (twilioStatus === 'read')                             return 'read';
  if (twilioStatus === 'failed' || twilioStatus === 'undelivered') return 'failed';
  return 'sent';
}

async function backfill() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  console.log(`\nFetching Twilio WhatsApp messages from ${SENDER} since ${startOfDay.toLocaleDateString()}...\n`);

  const twilioMessages = await twilioClient.messages.list({
    from:          WA_SENDER,
    dateSentAfter: startOfDay,
    limit:         500,
  });

  console.log(`Found ${twilioMessages.length} messages in Twilio.\n`);

  let inserted = 0;
  let skipped  = 0;
  let errors   = 0;

  for (const msg of twilioMessages) {
    const phone = normalisePhone(msg.to);

    // Skip if already in DB (idempotent — safe to re-run)
    const { data: existing } = await supabase
      .from('messages')
      .select('id')
      .eq('twilio_sid', msg.sid)
      .maybeSingle();

    if (existing) {
      console.log(`  — ${msg.sid} already exists, skipping.`);
      skipped++;
      continue;
    }

    // Find the matching lead
    const { data: lead } = await supabase
      .from('leads')
      .select('id, name')
      .eq('phone_normalised', phone)
      .maybeSingle();

    const status     = mapStatus(msg.status);
    const isDelivered = status === 'delivered' || status === 'read';

    const { error } = await supabase.from('messages').insert({
      lead_id:             lead?.id ?? null,
      twilio_sid:          msg.sid,
      phone_normalised:    phone,
      direction:           'outbound',
      content:             msg.body,
      status,
      error_code:          msg.errorCode ? String(msg.errorCode) : null,
      template_variant_id: null, // not available from Twilio message list
      template_id:         null,
      sender_number:       SENDER,
      sent_at:             msg.dateSent?.toISOString()    ?? new Date().toISOString(),
      delivered_at:        isDelivered ? msg.dateUpdated?.toISOString() ?? null : null,
      read_at:             status === 'read' ? msg.dateUpdated?.toISOString() ?? null : null,
    });

    if (error) {
      console.error(`  ✗ ${msg.sid} (${phone}): ${error.message}`);
      errors++;
    } else {
      const name = lead?.name ?? 'lead not found';
      console.log(`  ✓ ${msg.sid} → ${phone} [${name}] — ${status}${msg.errorCode ? ` (err: ${msg.errorCode})` : ''}`);
      inserted++;
    }
  }

  console.log(`\n──────────────────────────────`);
  console.log(`Inserted : ${inserted}`);
  console.log(`Skipped  : ${skipped} (already in DB)`);
  console.log(`Errors   : ${errors}`);
  console.log(`──────────────────────────────\n`);
}

backfill().catch(console.error);
