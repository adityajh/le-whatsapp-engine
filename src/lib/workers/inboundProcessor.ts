import { Job } from 'bullmq';
import { supabase } from '@/lib/supabase';

export async function processInboundMessage(job: Job) {
  const { MessageSid, From, Body } = job.data;
  
  // Normalize Phone safely (strip whatsapp: and ensure +91)
  const phone = (From || '').replace('whatsapp:', '');
  const cleanPhone = phone.startsWith('+91') ? phone : (phone.length === 10 ? `+91${phone}` : phone);

  // Classify intent according to Taxonomy
  const lowerBody = (Body || '').toLowerCase();
  let replyClass = 'other';
  let waHotness = 'warm';
  let waOptIn = true;

  if (lowerBody.includes('stop') || lowerBody.includes('unsubscribe')) {
    replyClass = 'stop';
    waHotness = 'dead';
    waOptIn = false;
  } else if (lowerBody.includes('fee') || lowerBody.includes('price') || lowerBody.includes('cost')) {
    replyClass = 'fee_question';
    waHotness = 'warm';
  } else if (lowerBody.includes('yes') || lowerBody.includes('interested') || lowerBody.includes('more')) {
    replyClass = 'interested';
    waHotness = 'hot';
  } else if (lowerBody.includes('busy') || lowerBody.includes('not now') || lowerBody.includes('later')) {
    replyClass = 'not_now';
    waHotness = 'cold';
  } else if (lowerBody.includes('wrong number') || lowerBody.includes('not me')) {
    replyClass = 'wrong_number';
    waHotness = 'dead';
  }

  const now = new Date().toISOString();

  // Update Supabase leads
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .update({
      wa_reply_class: replyClass,
      wa_hotness: waHotness,
      wa_last_inbound_at: now,
      wa_opt_in: waOptIn
    })
    .eq('phone_normalised', cleanPhone)
    .select('zoho_lead_id')
    .single();

  if (leadError && leadError.code !== 'PGRST116') {
    console.error(`[InboundProcessor] Error updating lead ${cleanPhone}:`, leadError);
    // Let BullMQ retry
    throw new Error('Database error on leads update');
  }

  // Update messages table (idempotent if MessageSid unique constraint exists)
  const { error: msgError } = await supabase.from('messages').insert({
    twilio_sid: MessageSid,
    phone_normalised: cleanPhone,
    direction: 'inbound',
    body: Body,
    status: 'received',
    created_at: now,
  });

  if (msgError && msgError.code !== '23505') { // Ignore unique constraint violation for idempotency
    console.error(`[InboundProcessor] Error saving message ${MessageSid}:`, msgError);
  }

  // Zoho Writeback Stub
  if (lead?.zoho_lead_id) {
    console.log(`[Zoho Writeback] Syncing ${lead.zoho_lead_id} with reply_class=${replyClass}, hotness=${waHotness}`);
    
    // Alert logic: If hot, trigger email & task
    if (waHotness === 'hot') {
      console.log(`[Alert Engine] Triggering Hot Lead Alert -> Zoho Task & Email for ${lead.zoho_lead_id}`);
      // TODO: Actual API calls to email provider / Zoho Task creation here.
      // e.g. await sendAlertEmail(lead.zoho_lead_id, replyClass);
    }
  }

  return { success: true, replyClass, waOptIn };
}
