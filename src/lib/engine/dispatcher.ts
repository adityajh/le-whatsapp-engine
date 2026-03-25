import twilio from 'twilio';
import { config } from '../config';

// Initialize the Twilio client securely
const twilioClient = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);

export interface DispatchOptions {
  to: string; // The E.164 normalised number
  from: string; // The sender profile number
  body?: string; // Free-form message body (only valid within 24h session)
  contentSid?: string; // Twilio Content API template SID (replaces templates)
  contentVariables?: Record<string, string>; // Variables for Content API
  mediaUrl?: string[];
}

import { supabase } from '../supabase';

/**
 * Dispatches a WhatsApp message via Twilio API
 * Enforces a 2-message outbound cooldown limit relative to last inbound.
 * Returns the MessageInstance on success.
 */
export async function dispatchMessage(opts: DispatchOptions) {
  try {
    // Cooldown Enforcement Check
    const { data: lead } = await supabase
      .from('leads')
      .select('wa_last_inbound_at')
      .eq('phone_normalised', opts.to)
      .single();

    // Count outbound messages since last inbound (or since epoch if null)
    const inDate = lead?.wa_last_inbound_at || new Date(0).toISOString();
    
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('phone_normalised', opts.to)
      .eq('direction', 'outbound')
      .gt('created_at', inDate);

    if (count && count >= 2) {
      console.warn(`[Cooldown Enforcement] Dropping message to ${opts.to}. Exceeded 2 outbound messages without a reply.`);
      return null;
    }
    const messageParams: any = {
      to: `whatsapp:${opts.to}`,
    };

    // Use Messaging Service SID if available, otherwise fallback to 'from' phone
    if (config.TWILIO_MESSAGING_SERVICE_SID) {
      messageParams.messagingServiceSid = config.TWILIO_MESSAGING_SERVICE_SID;
    } else {
      messageParams.from = `whatsapp:${opts.from}`;
    }

    if (opts.body) {
      messageParams.body = opts.body;
    }

    if (opts.contentSid) {
      messageParams.contentSid = opts.contentSid;
      if (opts.contentVariables && Object.keys(opts.contentVariables).length > 0) {
        messageParams.contentVariables = JSON.stringify(opts.contentVariables);
      }
    }

    console.log(`[Dispatcher] Twilio Payload:`, JSON.stringify(messageParams, null, 2));

    const message = await twilioClient.messages.create(messageParams);
    
    console.log(`[Dispatcher] Successfully queued message SID: ${message.sid} to ${opts.to}`);
    return message;
  } catch (err: any) {
    console.error(`[Dispatcher] Failed to dispatch message to ${opts.to}:`, {
      message: err.message,
      code: err.code,
      moreInfo: err.moreInfo,
      status: err.status,
    });
    throw err;
  }
}
