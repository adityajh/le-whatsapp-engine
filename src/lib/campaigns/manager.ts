import { supabase } from '@/lib/supabase';
import { enqueueOutboundMessage } from '@/lib/queue/client';

export type CampaignSegmentFilters = {
  lead_source?: string;
  wa_hotness?: string;
};

export async function createAndLaunchCampaign(name: string, templateVariantId: string, segment: CampaignSegmentFilters) {
  // 1. Create the template in campaigns
  const { data: campaign, error: cErr } = await supabase
    .from('campaigns')
    .insert({
      name,
      template_variant_id: templateVariantId,
      segment_filters: segment,
      status: 'running'
    })
    .select()
    .single();

  if (cErr || !campaign) {
    throw new Error('Failed to create campaign');
  }

  // 2. Fetch leads mapping the segment, explicitly blocking opted-out & dead
  let query = supabase
    .from('leads')
    .select('id, phone_normalised, wa_state, wa_opt_in')
    .eq('wa_opt_in', true)
    .neq('wa_state', 'closed')
    .neq('wa_state', 'invalid_number')
    .neq('wa_state', 'opted_out')
    .neq('wa_hotness', 'dead');

  if (segment.lead_source) {
    query = query.eq('lead_source', segment.lead_source);
  }
  if (segment.wa_hotness) {
    query = query.eq('wa_hotness', segment.wa_hotness);
  }

  const { data: leads, error: lErr } = await query;
  if (lErr || !leads || leads.length === 0) {
    await supabase.from('campaigns').update({ status: 'completed' }).eq('id', campaign.id);
    return { success: true, count: 0, campaignId: campaign.id };
  }

  // 3. Insert Campaign Leads
  const campaignLeadsInserts = leads.map(l => ({
    campaign_id: campaign.id,
    lead_id: l.id,
    status: 'pending'
  }));

  await supabase.from('campaign_leads').insert(campaignLeadsInserts);

  // 4. Enqueue into BullMQ with rate limiting / time-of-day already handled by enqueue wrapper
  let enqueued = 0;
  for (const lead of leads) {
    try {
      await enqueueOutboundMessage({
        to:               lead.phone_normalised,
        contentSid:       templateVariantId,
        leadId:           lead.id,
        templateName:     name, // Use campaign name as symbolic template name for tracking
      });
      enqueued++;
    } catch (err) {
      console.error(`Skipping queue for ${lead.phone_normalised}`, err);
    }
  }

  // Update campaign to completed since we finished enqueueing
  await supabase.from('campaigns').update({ status: 'completed' }).eq('id', campaign.id);

  return { success: true, count: enqueued, campaignId: campaign.id };
}
