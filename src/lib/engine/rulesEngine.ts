import { Lead, supabase } from '../supabase';
import { isWithin24HourSession, isWithinSendWindow } from './sessionWindow';
import { evaluateWorkflowGraph } from './logicEvaluator';
import { enqueueOutboundMessage } from '../queue/client';

// Map template names (returned by Logic Builder) to live Twilio Content SIDs
const TEMPLATE_SIDS: Record<string, string> = {
  wa_welcome_manual:   'HX23923d44f51d9a7da14f22cf109ac576',
  wa_welcome_organic:  'HX56142f55de8db39eaadc7ad5fc7aff03',
  wa_welcome_meta:     'HXd3cf40ca8ed1b0fa7bc74cfa9a901887',
  wa_counsellor_intro: 'HX8241ba1ede5451b564660006d059faa2',
  wa_reengagement:     'HXb0be78e0070d3153d3c1d5d62410b74a',
  wa_followup_1:       'HXf0af953383a41a1ac25ba99cf8435c8d',
};

// Primary live WhatsApp sender (Let's Enterprise)
const PRIMARY_SENDER = '+917709333161';

export async function handleOptOut(leadId: string) {
  console.log(`[Rules Engine] Processing STOP/Opt-Out for lead ${leadId}`);
  
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
}

export async function evaluateLeadAction(lead: Lead) {
  // Hard blocker: opted out
  if (lead.wa_opt_in === false) {
    console.log(`[Rules Engine] Lead ${lead.id} has opted out. Halting.`);
    return;
  }

  // Hard blocker: outside send window
  if (!isWithinSendWindow()) {
    console.log(`[Rules Engine] Outside 9am-8pm IST send window. Skipping lead ${lead.id}.`);
    return;
  }

  isWithin24HourSession(lead.wa_last_inbound_at);

  // Fetch the published workflow from Logic Builder
  const { data: workflow, error } = await supabase
    .from('workflow_rules')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .single();

  let templateName: string | null = null;

  if (error || !workflow) {
    console.warn(`[Rules Engine] No active workflow. Using source-based fallback for lead ${lead.id}.`);
    // Fallback: route by lead_source directly
    const source = (lead.lead_source || '').toLowerCase();
    if (source.includes('meta') || source.includes('facebook')) {
      templateName = 'wa_welcome_meta';
    } else if (source.includes('organic') || source.includes('website')) {
      templateName = 'wa_welcome_organic';
    } else {
      templateName = 'wa_welcome_manual';
    }
  } else {
    // Evaluate against the Logic Builder graph
    const action = evaluateWorkflowGraph(
      lead.wa_state,
      lead,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      workflow.conditions_json as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      workflow.actions_json as any
    );

    console.log(`[Rules Engine] Logic Evaluator action: ${action.type} for lead ${lead.id}`);

    if (action.type === 'send_template' && action.templateName) {
      templateName = action.templateName;
    } else {
      console.log(`[Rules Engine] No workflow path for lead ${lead.id} in state ${lead.wa_state}`);
      return;
    }
  }

  // Resolve SID from template name
  const contentSid = TEMPLATE_SIDS[templateName];
  if (!contentSid) {
    console.error(`[Rules Engine] Unknown template name "${templateName}" — no SID mapping. Skipping.`);
    return;
  }

  console.log(`[Rules Engine] Enqueueing ${templateName} (${contentSid}) → ${lead.phone_normalised}`);

  // Enqueue for dispatch
  await enqueueOutboundMessage({
    to: lead.phone_normalised,
    from: PRIMARY_SENDER,
    contentSid,
    templateName,
    leadId: lead.id,
  });

  // Update Supabase: mark state + last outbound
  await supabase
    .from('leads')
    .update({
      wa_state: 'wa_pending',
      wa_last_outbound_at: new Date().toISOString(),
      wa_last_template: templateName,
      updated_at: new Date().toISOString(),
    })
    .eq('id', lead.id);
}
