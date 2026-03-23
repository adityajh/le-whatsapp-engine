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

/**
 * Dispatches a WhatsApp message via Twilio API
 * Returns the MessageInstance on success.
 */
export async function dispatchMessage(opts: DispatchOptions) {
  try {
    const messageParams: any = {
      from: `whatsapp:${opts.from}`,
      to: `whatsapp:${opts.to}`,
    };

    if (opts.body) {
      messageParams.body = opts.body;
    }

    if (opts.contentSid) {
      // Using Twilio Content API (modern approach for templated messages)
      messageParams.contentSid = opts.contentSid;
      if (opts.contentVariables) {
        messageParams.contentVariables = JSON.stringify(opts.contentVariables);
      }
    }

    if (opts.mediaUrl && opts.mediaUrl.length > 0) {
      messageParams.mediaUrl = opts.mediaUrl;
    }

    const message = await twilioClient.messages.create(messageParams);
    
    console.log(`[Dispatcher] Successfully queued message SID: ${message.sid} to ${opts.to}`);
    return message;
  } catch (err: any) {
    console.error(`[Dispatcher] Failed to dispatch message to ${opts.to}:`, err.message);
    throw err;
  }
}
