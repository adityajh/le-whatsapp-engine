/**
 * Source of Truth for Workflow Constants
 * -------------------------------------
 * Update this file to add new templates, states, or lead fields.
 * These changes will automatically propagate to the Logic Builder UI 
 * and the Rules Engine.
 */

// Map of human-readable template names to Twilio Content SIDs
export const TEMPLATE_SIDS: Record<string, string> = {
  wa_welcome_manual:   'HX23923d44f51d9a7da14f22cf109ac576',
  wa_welcome_organic:  'HX56142f55de8db39eaadc7ad5fc7aff03',
  wa_welcome_meta:     'HXd3cf40ca8ed1b0fa7bc74cfa9a901887',
  wa_welcome_meta_2:   'HXf346638884dd3f8121e9e620319c289c',
  wa_counsellor_intro: 'HX8241ba1ede5451b564660006d059faa2',
  wa_reengagement:     'HXb0be78e0070d3153d3c1d5d62410b74a',
  wa_followup_1:       'HXf0af953383a41a1ac25ba99cf8435c8d',
};

// Allowed states for Trigger nodes (wa_state column in 'leads' table)
export const WORKFLOW_STATES = [
  'wa_pending',
  'wa_sent',
  'wa_delivered',
  'wa_read',
  'wa_interested',
  'wa_not_now',
  'wa_fee_query',
  'wa_stopped',
  'wa_closed',
  'wa_reengaged',
  'wa_human_handoff',
];

// Lead fields available for Condition node evaluation
export const LEAD_FIELDS = [
  { id: 'lead_source', label: 'Lead Source' },
  { id: 'wa_hotness', label: 'Hotness (Score)' },
  { id: 'wa_reply_class', label: 'Reply Category' },
  { id: 'wa_state', label: 'Current State' },
  { id: 'name', label: 'Lead Name' },
  { id: 'campaign_name', label: 'Campaign' },
];

// Lead Source common values (for convenience in dropdowns)
export const SOURCE_VALUES = [
  'Meta Ads',
  'Organic',
  'Website',
  'Manual',
  'Direct',
  'Google Ads',
];
