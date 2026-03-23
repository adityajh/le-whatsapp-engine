import { Lead, supabase } from '../supabase';
import { isWithin24HourSession, isWithinSendWindow } from './sessionWindow';

export async function handleOptOut(leadId: string, phoneNormalised: string) {
  console.log(`[Rules Engine] Processing STOP/Opt-Out for lead ${leadId}`);
  
  // Mark Opt Out in DB
  const { error } = await supabase
    .from('leads')
    .update({
      wa_opt_in: false,
      wa_state: 'wa_closed',
      updated_at: new Date().toISOString()
    })
    .eq('id', leadId);

  if (error) {
    console.error(`[Rules Engine] DB Error processing Opt-Out for ${leadId}`, error);
    throw error;
  }

  // TODO: Trigger Zoho writeback to update WA_Opt_In boolean via BullMQ
}

export async function evaluateLeadAction(lead: Lead) {
  // Hard blocker: Ensure they have not opted out
  if (lead.wa_opt_in === false) {
    console.log(`[Rules Engine] Lead ${lead.id} has opted out. Halting evaluation.`);
    return;
  }

  // Hard blocker: Enforce time-of-day
  if (!isWithinSendWindow()) {
    console.log(`[Rules Engine] Outside 9am-8pm IST send window. Delaying evaluation for ${lead.id}.`);
    // Eventually, add this to a delayed job queue
    return;
  }

  const hasSession = isWithin24HourSession(lead.wa_last_inbound_at);

  // FSM Logic Placeholder (This will eventually load from `workflow_rules`)
  switch (lead.wa_state) {
    case 'wa_pending':
      console.log(`[Rules Engine] State: pending -> wa_sent. Triggering welcome template for ${lead.id}`);
      // Select template based on source
      const templateToUse = lead.lead_source?.toLowerCase().includes('meta') 
        ? 'wa_welcome_meta' 
        : 'wa_welcome_organic';
      
      // TODO: enqueue Dispatch job (to prevent blocking API response here)
      break;
      
    case 'wa_followup':
      // They are queued for a followup
      console.log(`[Rules Engine] State: followup. Checking timeline.`);
      break;

    case 'wa_hot':
      // Hot logic
      break;

    default:
      console.log(`[Rules Engine] No action defined for state ${lead.wa_state}`);
  }
}
