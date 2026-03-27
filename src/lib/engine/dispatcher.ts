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
  leadId?: string; // Optional: Supabase lead UUID for recording
  templateName?: string; // Optional: Symbolic name of the template
}

import { getTwilioTemplateSid } from '../twilio/templates';
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

    console.log('[Config] TWILIO_MESSAGING_SERVICE_SID:', config.TWILIO_MESSAGING_SERVICE_SID);

    // Use Messaging Service SID if available, otherwise fallback (which will likely fail 63027)
    if (config.TWILIO_MESSAGING_SERVICE_SID) {
      messageParams.messagingServiceSid = config.TWILIO_MESSAGING_SERVICE_SID;
    } else {
      console.warn('[Twilio] No MESSAGING_SERVICE_SID found in config. Falling back to from number.');
      messageParams.from = `whatsapp:${opts.from}`;
    }

    if (opts.body) {
      messageParams.body = opts.body;
    }

    if (opts.contentSid) {
      // Resolve symbolic names or resolve if empty/placeholder
      const resolvedSid = await getTwilioTemplateSid(opts.contentSid);
      
      if (!resolvedSid || !resolvedSid.startsWith('HX')) {
        console.error(`[Dispatcher] Could not resolve a valid ContentSid for "${opts.contentSid}". Found: "${resolvedSid}"`);
        // If it's already an HX sid, let it through as a last resort, otherwise fail early
        if (opts.contentSid.startsWith('HX')) {
          messageParams.contentSid = opts.contentSid;
        } else {
          return null; 
        }
      } else {
        messageParams.contentSid = resolvedSid;
      }
      // Always send contentVariables if using contentSid, with a fallback
      // Meta often rejects 63027 if a template expects variables and they are missing.
      messageParams.contentVariables = JSON.stringify(
        opts.contentVariables && Object.keys(opts.contentVariables).length > 0
          ? opts.contentVariables
          : { "1": "there" }
      );
    }

    console.log('[Twilio] messageParams:', JSON.stringify(messageParams, null, 2));

    const message = await twilioClient.messages.create(messageParams);
    
    // 4. Record outbound message in Supabase (Immutable Log)
    // Analytics depends on 'direction' = 'outbound' and 'template_variant_id' being set
    try {
      let finalLeadId = opts.leadId;
      if (!finalLeadId) {
        const { data: lead } = await supabase
          .from('leads')
          .select('id')
          .eq('phone_normalised', opts.to)
          .single();
        finalLeadId = lead?.id;
      }

      if (finalLeadId) {
        await supabase.from('messages').insert({
          lead_id:             finalLeadId,
          twilio_sid:          message.sid,
          phone_normalised:    opts.to,
          direction:           'outbound',
          content:             message.body,
          status:              'sent',
          template_id:         opts.templateName, // The symbolic name (e.g. wa_welcome_meta)
          template_variant_id: messageParams.contentSid, // The actual HX... SID
          sender_number:       opts.from || config.TWILIO_MESSAGING_SERVICE_SID || 'system',
          sent_at:             new Date().toISOString(),
        });

        // 5. Update lead's last-contact markers for analytics & state tracking
        await supabase
          .from('leads')
          .update({
            wa_last_outbound_at: new Date().toISOString(),
            wa_last_template:    opts.templateName || null,
            wa_last_twilio_sid:  message.sid,
            wa_last_status:      'sent',
          })
          .eq('id', finalLeadId);
      }
    } catch (saveErr) {
      console.warn('[Dispatcher] Failed to record outbound message or update lead in DB:', saveErr);
      // Don't throw, we've already sent the message
    }

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
