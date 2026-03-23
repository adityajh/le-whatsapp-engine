import { Lead, supabase } from '../supabase';
import { isWithin24HourSession, isWithinSendWindow } from './sessionWindow';
import { evaluateWorkflowGraph } from './logicEvaluator';
import { enqueueOutboundMessage } from '../queue/client';

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

  // Fetch the latest published workflow rules
  const { data: workflow, error } = await supabase
    .from('workflow_rules')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .single();

  if (error || !workflow) {
    console.error(`[Rules Engine] No active workflow rules found to process lead ${lead.id}`);
    return;
  }

  // Evaluate the lead against the Logic Builder graph
  const action = evaluateWorkflowGraph(
    lead.wa_state, 
    lead, 
    workflow.conditions_json as any, 
    workflow.actions_json as any
  );

  console.log(`[Rules Engine] Logic Evaluator returned action: ${action.type} for state ${lead.wa_state}`);

  if (action.type === 'send_template' && action.templateName) {
    console.log(`[Rules Engine] Triggering template ${action.templateName} to ${lead.phone_normalised}`);
    // Queue the dispatch
    await enqueueOutboundMessage({
      to: lead.phone_normalised,
      from: '91xxxxxxxxxx', // TBD from sender profiles
      contentSid: `HX_${action.templateName}_placeholder`, 
    });
  } else if (action.type === 'no_match') {
    console.log(`[Rules Engine] No workflow path found for lead ${lead.id} in state ${lead.wa_state}`);
  }
}
