import { Lead, supabase } from '../supabase';
import { isWithinSendWindow } from './sessionWindow';
import { evaluateWorkflowGraph } from './logicEvaluator';
import { enqueueOutboundMessage } from '../queue/client';
import { getTwilioTemplateSid } from '../twilio/templates';

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

/**
 * Fallback template selection when no Logic Builder graph is published.
 * Implements the same Rules 1-4 logic as the seeded workflow graph so
 * new leads are always handled correctly even without a published graph.
 */
function fallbackSelectTemplate(lead: Lead): string | null {
  // Rule 1: Program filter
  if (lead.program?.toLowerCase().includes('storysells')) {
    console.log(`[Rules Engine] Fallback: Storysells lead ${lead.id} — skipping WA sequence.`);
    return null;
  }

  // Rule 2: Relocation filter
  if (lead.relocate_to_pune?.toLowerCase() === 'no') {
    console.log(`[Rules Engine] Fallback: Lead ${lead.id} won't relocate — skipping WA sequence.`);
    return null;
  }

  // Rule 3: Urgency filter (LOW = 10th grade or below)
  if (lead.urgency === 'LOW') {
    console.log(`[Rules Engine] Fallback: Lead ${lead.id} urgency LOW — skipping WA sequence.`);
    return null;
  }

  // Rule 4: Source × Persona routing
  const source = (lead.lead_source || '').toLowerCase();
  const persona = (lead.persona || '').toLowerCase();

  if (source.includes('meta') || source.includes('facebook')) {
    return persona.includes('parent') ? 'wa_welcome_meta_parent' : 'wa_welcome_meta_student';
  }
  if (source.includes('organic') || source.includes('website')) {
    return persona.includes('parent') ? 'wa_welcome_organic_parent' : 'wa_welcome_organic_student';
  }
  // Manual / Phone / Instagram / Referral / anything else
  return 'wa_welcome_manual';
}

export async function evaluateLeadAction(lead: Lead) {
  // Hard blockers
  if (lead.wa_opt_in === false) {
    console.log(`[Rules Engine] Lead ${lead.id} has opted out. Halting.`);
    return;
  }
  if (!isWithinSendWindow()) {
    console.log(`[Rules Engine] Outside 9am-8pm IST send window. Skipping lead ${lead.id}.`);
    return;
  }

  // Only send welcome templates for new leads that haven't been contacted yet
  if (lead.wa_last_outbound_at !== null) {
    console.log(`[Rules Engine] Lead ${lead.id} already has outbound history — skipping welcome evaluation.`);
    return;
  }

  let templateName: string | null = null;

  // Try the Logic Builder graph first
  const { data: workflow, error } = await supabase
    .from('workflow_rules')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .single();

  if (error || !workflow) {
    console.warn(`[Rules Engine] No active workflow. Using fallback routing for lead ${lead.id}.`);
    templateName = fallbackSelectTemplate(lead);
  } else {
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
    } else if (action.type === 'close' || action.type === 'no_match') {
      // 'close' means a filter End node was hit (Storysells / no-relocate / low urgency)
      // 'no_match' means the graph had no path for this state — fall back to code
      if (action.type === 'no_match') {
        console.log(`[Rules Engine] Graph had no path for state ${lead.wa_state} — trying fallback.`);
        templateName = fallbackSelectTemplate(lead);
      } else {
        console.log(`[Rules Engine] Graph returned close for lead ${lead.id} — no WA message sent.`);
        await supabase.from('leads').update({ wa_state: 'wa_manual_triage' }).eq('id', lead.id);
        return;
      }
    }
  }

  if (!templateName) {
    // Filtered out by fallback (Storysells / no-relocate / low-urgency)
    await supabase.from('leads').update({ wa_state: 'wa_manual_triage' }).eq('id', lead.id);
    return;
  }

  // Resolve SID from template name (checks constants, then live Twilio lookup)
  const contentSid = await getTwilioTemplateSid(templateName);
  if (!contentSid) {
    console.error(`[Rules Engine] Unknown template "${templateName}" — no SID mapping. Skipping.`);
    return;
  }

  console.log(`[Rules Engine] Enqueueing ${templateName} (${contentSid}) → ${lead.phone_normalised}`);

  await enqueueOutboundMessage({
    to: lead.phone_normalised,
    from: PRIMARY_SENDER,
    contentSid,
    templateName,
    leadId: lead.id,
    contentVariables: JSON.stringify({ "1": lead.name || "there" })
  });

  // Set state to 'first_sent' so the follow-up cron (Rule 5) can target it
  await supabase
    .from('leads')
    .update({
      wa_state: 'first_sent',
      wa_last_outbound_at: new Date().toISOString(),
      wa_last_template: templateName,
      updated_at: new Date().toISOString(),
    })
    .eq('id', lead.id);
}
