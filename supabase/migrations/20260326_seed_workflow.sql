-- Seed the Master WhatsApp Flow graph into workflow_rules
-- This implements the Rules Engine v3.1 logic from the 25 Mar 2026 handoff:
--   Rule 1: Skip Storysells leads
--   Rule 2: Manual triage if won't relocate to Pune
--   Rule 3: Skip low urgency (10th grade or below)
--   Rule 4: Route welcome template by source × persona
--
-- After seeding, this graph is editable via /admin/logic-builder.

INSERT INTO workflow_rules (
  id,
  name,
  trigger_event,
  conditions_json,
  actions_json,
  is_active,
  published_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Master WhatsApp Flow',
  'wa_pending',
  -- conditions_json = ReactFlow nodes array
  '[
    {"id":"t1","type":"triggerNode","position":{"x":480,"y":40},"data":{"label":"State: wa_pending","state":"wa_pending"}},

    {"id":"c1","type":"conditionNode","position":{"x":480,"y":160},"data":{"label":"program == Storysells","field":"program","value":"Storysells"}},
    {"id":"e1","type":"endNode","position":{"x":200,"y":300},"data":{"label":"Skip – not BBA Pune"}},

    {"id":"c2","type":"conditionNode","position":{"x":680,"y":300},"data":{"label":"relocate_to_pune == No","field":"relocate_to_pune","value":"No"}},
    {"id":"e2","type":"endNode","position":{"x":900,"y":440},"data":{"label":"Manual triage – won''t relocate"}},

    {"id":"c3","type":"conditionNode","position":{"x":480,"y":440},"data":{"label":"academic_level == 10th","field":"academic_level","value":"10th"}},
    {"id":"e3","type":"endNode","position":{"x":200,"y":580},"data":{"label":"Skip – low urgency"}},

    {"id":"c4","type":"conditionNode","position":{"x":680,"y":580},"data":{"label":"lead_source == Meta","field":"lead_source","value":"Meta"}},

    {"id":"c5","type":"conditionNode","position":{"x":380,"y":720},"data":{"label":"persona == Student","field":"persona","value":"Student"}},
    {"id":"a1","type":"actionNode","position":{"x":220,"y":860},"data":{"label":"Send Template: wa_welcome_meta_student","templateName":"wa_welcome_meta_student"}},
    {"id":"a2","type":"actionNode","position":{"x":520,"y":860},"data":{"label":"Send Template: wa_welcome_meta_parent","templateName":"wa_welcome_meta_parent"}},

    {"id":"c6","type":"conditionNode","position":{"x":900,"y":720},"data":{"label":"lead_source == Organic","field":"lead_source","value":"Organic"}},

    {"id":"c7","type":"conditionNode","position":{"x":760,"y":860},"data":{"label":"persona == Student","field":"persona","value":"Student"}},
    {"id":"a3","type":"actionNode","position":{"x":600,"y":1000},"data":{"label":"Send Template: wa_welcome_organic_student","templateName":"wa_welcome_organic_student"}},
    {"id":"a4","type":"actionNode","position":{"x":900,"y":1000},"data":{"label":"Send Template: wa_welcome_organic_parent","templateName":"wa_welcome_organic_parent"}},

    {"id":"c8","type":"conditionNode","position":{"x":1100,"y":860},"data":{"label":"lead_source == Website","field":"lead_source","value":"Website"}},

    {"id":"c9","type":"conditionNode","position":{"x":1000,"y":1000},"data":{"label":"persona == Student","field":"persona","value":"Student"}},
    {"id":"a5","type":"actionNode","position":{"x":840,"y":1140},"data":{"label":"Send Template: wa_welcome_organic_student","templateName":"wa_welcome_organic_student"}},
    {"id":"a6","type":"actionNode","position":{"x":1140,"y":1140},"data":{"label":"Send Template: wa_welcome_organic_parent","templateName":"wa_welcome_organic_parent"}},

    {"id":"a7","type":"actionNode","position":{"x":1300,"y":1000},"data":{"label":"Send Template: wa_welcome_manual","templateName":"wa_welcome_manual"}}
  ]'::jsonb,
  -- actions_json = ReactFlow edges array
  '[
    {"id":"e-t1-c1","source":"t1","target":"c1"},
    {"id":"e-c1-true","source":"c1","target":"e1","sourceHandle":"true","label":"Yes (Storysells)"},
    {"id":"e-c1-false","source":"c1","target":"c2","sourceHandle":"false","label":"No"},
    {"id":"e-c2-true","source":"c2","target":"e2","sourceHandle":"true","label":"Yes (No Reloc)"},
    {"id":"e-c2-false","source":"c2","target":"c3","sourceHandle":"false","label":"No"},
    {"id":"e-c3-true","source":"c3","target":"e3","sourceHandle":"true","label":"Yes (10th)"},
    {"id":"e-c3-false","source":"c3","target":"c4","sourceHandle":"false","label":"No"},
    {"id":"e-c4-true","source":"c4","target":"c5","sourceHandle":"true","label":"Yes (Meta)"},
    {"id":"e-c5-true","source":"c5","target":"a1","sourceHandle":"true","label":"Student"},
    {"id":"e-c5-false","source":"c5","target":"a2","sourceHandle":"false","label":"Parent"},
    {"id":"e-c4-false","source":"c4","target":"c6","sourceHandle":"false","label":"No"},
    {"id":"e-c6-true","source":"c6","target":"c7","sourceHandle":"true","label":"Yes (Organic)"},
    {"id":"e-c7-true","source":"c7","target":"a3","sourceHandle":"true","label":"Student"},
    {"id":"e-c7-false","source":"c7","target":"a4","sourceHandle":"false","label":"Parent"},
    {"id":"e-c6-false","source":"c6","target":"c8","sourceHandle":"false","label":"No"},
    {"id":"e-c8-true","source":"c8","target":"c9","sourceHandle":"true","label":"Yes (Website)"},
    {"id":"e-c9-true","source":"c9","target":"a5","sourceHandle":"true","label":"Student"},
    {"id":"e-c9-false","source":"c9","target":"a6","sourceHandle":"false","label":"Parent"},
    {"id":"e-c8-false","source":"c8","target":"a7","sourceHandle":"false","label":"No (Manual)"}
  ]'::jsonb,
  true,
  now()
)
ON CONFLICT (id) DO UPDATE
  SET conditions_json = EXCLUDED.conditions_json,
      actions_json    = EXCLUDED.actions_json,
      published_at    = EXCLUDED.published_at;
