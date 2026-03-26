/**
 * Source of Truth for Workflow Constants
 * -------------------------------------
 * Update this file to add new templates, states, or lead fields.
 * These changes will automatically propagate to the Logic Builder UI
 * and the Rules Engine.
 */

// Map of human-readable template names to Twilio Content SIDs
export const TEMPLATE_SIDS: Record<string, string> = {
  // Welcome templates — source × persona routing (Rule 4)
  wa_welcome_meta_student:    'HXd032c7b2d23d59cd56bbc71453b0afd6',
  wa_welcome_meta_parent:     'HXd97f088d39cd2f46bf189a3839eeb8ce',
  wa_welcome_organic_student: 'HX5f55c702e5b379893cf79f9a0f492e6e',
  wa_welcome_organic_parent:  'HXdad3576db7480fcf3e61c780221df990',
  wa_welcome_manual:          'HX23923d44f51d9a7da14f22cf109ac576', // pending approval — SID TBC
  // Follow-up templates
  wa_followup_1:              'HXf0af953383a41a1ac25ba99cf8435c8d', // pending approval — SID TBC
  wa_followup_2_quickreply:   'HX99c54dea1ea1d4fec682ee78452c0831',
  wa_track_selector:          'HXddf8ea9d9d01a0cc51dc6419909abb20',
  // Counsellor + campaigns
  wa_counsellor_intro:        'HX8241ba1ede5451b564660006d059faa2', // pending approval — SID TBC
  wa_webinar_cta:             'HXe5d3fdede430efb27b5e7c50bed1b55a',
  // Legacy / deprecated
  wa_welcome_organic:         'HX56142f55de8db39eaadc7ad5fc7aff03',
  wa_welcome_meta:            'HXd3cf40ca8ed1b0fa7bc74cfa9a901887',
  wa_welcome_meta_2:          'HXf346638884dd3f8121e9e620319c289c',
  wa_reengagement:            'HXb0be78e0070d3153d3c1d5d62410b74a',
};

// Allowed states for Trigger nodes (wa_state column in 'leads' table)
export const WORKFLOW_STATES = [
  'wa_pending',
  'first_sent',
  'followup_sent',
  'replied',
  'wa_hot',
  'wa_nurture',
  'wa_sent',
  'wa_delivered',
  'wa_read',
  'wa_manual_triage',
  'wa_closed',
  'wa_human_handoff',
];

// Lead fields available for Condition node evaluation
export const LEAD_FIELDS = [
  { id: 'lead_source',      label: 'Lead Source' },
  { id: 'persona',          label: 'Persona (Student / Parent)' },
  { id: 'program',          label: 'Program' },
  { id: 'academic_level',   label: 'Academic Level' },
  { id: 'relocate_to_pune', label: 'Relocate to Pune?' },
  { id: 'urgency',          label: 'Urgency' },
  { id: 'lead_track',       label: 'Lead Track' },
  { id: 'wa_hotness',       label: 'Hotness (Score)' },
  { id: 'wa_reply_class',   label: 'Reply Category' },
  { id: 'wa_state',         label: 'Current State' },
];

// Values shown as a dropdown when the selected field has a fixed set of options
export const FIELD_VALUES: Record<string, string[]> = {
  lead_source:      ['Meta Ads', 'Organic', 'Website', 'Manual', 'Phone', 'Instagram', 'Referral', 'Google Ads', 'Direct'],
  persona:          ['Student', 'Parent'],
  program:          ['BBA Pune', 'Storysells'],
  academic_level:   ['12th', '11th', '10th', 'Graduate', 'Already in college'],
  relocate_to_pune: ['Yes', 'No'],
  urgency:          ['HIGH', 'MEDIUM', 'LOW'],
  lead_track:       ['enterprise_leadership', 'family_business', 'venture_builder'],
  wa_hotness:       ['hot', 'warm', 'cold', 'dead'],
  wa_reply_class:   ['interested', 'fee_question', 'not_now', 'wrong_number', 'stop', 'other'],
  wa_state:         [...['wa_pending', 'first_sent', 'followup_sent', 'replied', 'wa_hot', 'wa_nurture', 'wa_closed']],
};

// Lead Source common values (kept for backwards compat with Builder)
export const SOURCE_VALUES = FIELD_VALUES.lead_source;
