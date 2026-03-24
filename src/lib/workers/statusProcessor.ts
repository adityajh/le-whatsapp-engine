import { Job } from 'bullmq';
import { supabase } from '@/lib/supabase';

export async function processStatusUpdate(job: Job) {
  const { MessageSid, MessageStatus, ErrorCode } = job.data;
  
  // 1. Update message status
  await supabase
    .from('messages')
    .update({ 
      status: MessageStatus,
      // Store ErrorCode as JSON if it's a string mapped differently, or cast if text field
      ...(ErrorCode ? { error_code: ErrorCode } : {})
    })
    .eq('twilio_sid', MessageSid);

  // 2. Fetch associated message to get the lead's phone number
  const { data: msg, error: msgError } = await supabase
    .from('messages')
    .select('phone_normalised')
    .eq('twilio_sid', MessageSid)
    .single();

  if (msgError || !msg) {
    console.warn(`[StatusProcessor] Could not find message ${MessageSid} to sync lead status.`);
    return { success: true, status: MessageStatus, leadSynced: false };
  }

  const updateObj: Record<string, string | boolean> = { wa_last_status: MessageStatus };
  
  // 3. Twilio Error codes handling & Compliance
  if (ErrorCode === '63032') { // User Opted Out / STOP
    updateObj.wa_opt_in = false;
    updateObj.wa_state = 'opted_out';
  } else if (ErrorCode === '21211' || ErrorCode === '63016') { // Invalid number or Template not approved
    updateObj.wa_state = 'invalid_number'; // or failed
    updateObj.wa_hotness = 'dead';
  }

  const { error: leadErr } = await supabase
    .from('leads')
    .update(updateObj)
    .eq('phone_normalised', msg.phone_normalised);

  if (leadErr) {
    console.error(`[StatusProcessor] Failed to update lead ${msg.phone_normalised}:`, leadErr);
    throw new Error('Database error updating status on lead');
  }

  return { success: true, status: MessageStatus, leadSynced: true };
}
