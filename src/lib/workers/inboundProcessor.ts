import { supabase } from '@/lib/supabase';
import { classifyReply } from '@/lib/engine/classifier';

export async function processInboundMessage(job: { data: Record<string, string> }) {
  const { MessageSid, From, Body } = job.data;

  // Normalize Phone safely (strip whatsapp: and ensure +91)
  const phone = (From || '').replace('whatsapp:', '');
  const cleanPhone = phone.startsWith('+91') ? phone : (phone.length === 10 ? `+91${phone}` : phone);

  // Classify intent using DB-driven rules
  const { replyClass, hotness: waHotness, optOut } = await classifyReply(Body || '');
  const waOptIn = !optOut;

  const now = new Date().toISOString();

  // Owner Assignment Logic
  let assignedOwner = null;
  const { data: currentLead } = await supabase.from('leads').select('owner_email').eq('phone_normalised', cleanPhone).single();
  
  if (currentLead && !currentLead.owner_email && (replyClass === 'interested' || replyClass === 'fee_question')) {
    // Basic assignment logic - placeholder for round-robin
    assignedOwner = 'team@letsenterprise.in';
    console.log(`[Owner Assignment] Lead ${cleanPhone} responded favorably. Automatically assigning to ${assignedOwner}`);
  }

  // Update Supabase leads
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .update({
      wa_reply_class: replyClass,
      wa_hotness: waHotness,
      wa_last_inbound_at: now,
      wa_opt_in: waOptIn,
      ...(assignedOwner ? { owner_email: assignedOwner } : {})
    })
    .eq('phone_normalised', cleanPhone)
    .select('zoho_lead_id, owner_email')
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
