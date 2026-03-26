# LE WhatsApp Automation — Project Execution Tracker
**Project:** ZOHO + Twilio WhatsApp Lead Engagement Engine
**Started:** 23 March 2026
**Last Updated:** 26 March 2026
**Status:** 🟡 PHASE 1 IN PROGRESS — Rules Engine v3 built. Zoho setup + end-to-end testing pending.

> **How to use this file**
> - Mark tasks `[x]` when done, `[~]` when in progress, `[!]` when blocked
> - Add notes inline under any task — keep them brief
> - Update the **Last Updated** date above on every edit

---

## 📋 STATUS SUMMARY

| Phase | Tasks | Done | In Progress | Blocked |
|---|---|---|---|---|
| Pre-Build | 10 | 8 | 0 | 2 (Zoho custom fields + DPDP) |
| Week 1 — Go Live | 16 | 16 | 0 | 0 |
| Week 2 — Stability + Campaigns | 10 | 10 | 0 | 0 |
| Week 3 — Intelligence + Logic Builder | 8 | 8 | 0 | 0 |
| Week 4 — Optimisation | 10 | 7 | 0 | 0 |
| **Phase 1 — Rules Engine v3** | **10** | **5** | **1** | **4** |
| Phase 2 — Next Sprint | 7 | 0 | 0 | 0 |
| Phase 3 — Future | 5 | 0 | 0 | 0 |

---

## 🔴 PHASE 0 — PRE-BUILD (Week 0)
> **Owner split:** Templates Agent (T) · Code Agent (C) · Human/Ops (H)

### Templates & Twilio — Templates Agent
- [x] Write final copy for all 10 WhatsApp templates (T)
  - Original set: `wa_welcome_meta`, `wa_welcome_organic`, `wa_welcome_manual`, `wa_followup_1`, `wa_followup_2`, `wa_reengagement`, `wa_counsellor_intro`, `wa_callback_confirm`, `wa_closed_loop`, `wa_not_eligible`
  - Revised set (v3.1, 25 Mar 2026): `wa_welcome_meta_student`, `wa_welcome_meta_parent`, `wa_welcome_organic_student`, `wa_welcome_organic_parent`, `wa_welcome_manual`, `wa_followup_1`, `wa_followup_2_quickreply`, `wa_track_selector`, `wa_webinar_cta`, `wa_counsellor_intro`
- [x] Submit all 10 templates to Twilio for approval (T)
  - 7 approved as of 26 Mar 2026
  - 3 pending: `wa_welcome_manual`, `wa_followup_1`, `wa_counsellor_intro`
- [x] Confirm per-number warmup schedule: 250 → 1,000 → 2,000 → 10,000 conversations/day (T)
  - Warmup started 24 Mar 2026. Current limit: 250/day from `+917709333161`
- [ ] Set up Twilio sandbox numbers for staging (T)

### Zoho Setup — Human/Ops
- [ ] Create Zoho custom fields on Leads module (H) ← **Phase 1 task — see P1.7**
  - Original list (11 fields): `WA_Opt_In`, `WA_State`, `WA_Hotness`, `WA_Last_Outbound_At`, `WA_Last_Inbound_At`, `WA_Last_Template`, `WA_Last_Status`, `WA_Sender_Key`, `WA_Reply_Class`, `WA_Last_Twilio_SID`, `WA_Human_Response_Due_At`
  - New fields required (Phase 1): `WA_Track` (picklist)
  - User to provide existing Zoho field list for conflict check before creation
- [ ] Create Zoho Workflow Rules to POST to `/api/webhooks/zoho` (H) ← **Phase 1 task — see P1.3**
  - Lead Created → POST with all mapped fields
  - Lead Stage Changed → POST with all mapped fields
  - Map Zoho field names to: `program`, `persona`, `academic_level`, `relocate_to_pune`

### Specs & Decisions — Code Agent + Ops
- [x] Write phone normalisation spec (all Indian number formats) (C)
- [x] Define reply classification taxonomy — 6 classes (C + H)
- [ ] Document DPDP consent flow: LP checkbox → Zoho WA_Opt_In field (H)
- [x] Decide: Queue system → Upstash REST rpush/lpop (C)
- [x] Decide: Postgres on Supabase (C)
- [x] Decide: Logic Builder auth — unprotected for Phase 1, NextAuth planned (C)

---

## 🟢 WEEK 1 — GO LIVE (Core Plumbing)
> Status: ✅ Complete.

- [x] Scaffold Next.js + TypeScript project on Vercel
- [x] Connect Supabase Postgres — run DB migrations, create all tables
- [x] Connect Upstash Redis — configure REST queue
- [x] Set up environment variables + secrets management (Vercel env vars)
- [x] Deploy health-check endpoint `/health`
- [x] Build `/webhooks/zoho` with HMAC secret validation
- [x] Build `/webhooks/twilio/inbound` with Twilio signature validation
- [x] Build `/webhooks/twilio/status` with Twilio signature validation
- [x] Build phone normaliser utility (all Indian formats → E.164)
- [x] Build Rules Engine v1 — reads from `workflow_rules` table
- [x] Enforce 24-hour session window (`WA_Last_Inbound_At`)
- [x] Enforce time-of-day send window (9am–8pm IST only)
- [x] Implement STOP / opt-out handler — set `WA_Opt_In = false`, halt all sends
- [x] Build Twilio API client (Content API template sends via Messaging Service SID)
- [x] Store outbound message in `messages` table
- [x] Build minimal event log viewer / queue worker (`/api/cron/process-queue`)

---

## ✅ WEEK 2 — STABILITY + CAMPAIGN LAYER
> Status: ✅ Complete.

- [x] Build inbound reply processor — classify against 6-class taxonomy
- [x] Writeback on inbound: `WA_Reply_Class`, `WA_Hotness`, `WA_Last_Inbound_At`
- [x] Handle Twilio error codes: `63016`, `63032`, `21211`
- [x] Implement idempotency keys (deduplication via MessageSid)
- [x] Build Dead Letter Queue — retry via queue config
- [x] Build Zoho reconciliation cron — `/api/cron/zoho-reconcile`
- [x] Enforce cooldown rules — max 2 outbound templates before any reply
- [x] Build hot lead alerts engine v1 — alert on `interested` classification
- [x] Monitor `WA_Human_Response_Due_At` for SLA breach alerts
- [x] Build Campaign Manager module (create, segment, enqueue, rate-limit)
- [x] Build campaign tracking (`campaign_leads` table)
- [x] Build Campaign Manager UI at `/admin/campaigns` and `/admin/campaigns/create`

---

## ✅ WEEK 3 — INTELLIGENCE + LOGIC BUILDER
> Status: ✅ Complete.

- [x] Build priority scoring engine (hot/warm/cold/dead via reply classification)
- [x] Build SLA tracker (`WA_Human_Response_Due_At` countdown + breach handling)
- [x] Build re-engagement sequence (originally: 7-day dormant → repurposed in Phase 1 to Rules 5 & 6)
- [x] Build source-based routing (Meta Ads / Organic / Manual → different first templates)
- [x] Define and implement owner assignment logic on favorable lead reply
- [x] Fix: Twilio Error 63027 — **Resolved**
  - Added `messagingServiceSid` (MG…) to dispatcher
  - Fixed empty `contentVariables: {}` causing 63027
  - Fixed `process-queue` cron stripping variables
  - Enabled India Geo Permissions
  - Set up Twilio Messaging Service (`MG4b7040930f5d63bc27d808429106136a`)
  - Resubmitted `wa_welcome_meta` as utility → approved as `wa_welcome_meta_2`
  - End-to-end delivery confirmed 25 Mar 2026
- [x] Fix: Zoho Reconcile 405/HTTP Error (Added POST support to cron route)
- [x] Build Logic Builder — visual FSM editor (React Flow)
- [x] Rules engine reads live from `workflow_rules` at runtime
- [x] Test: change rule via UI → rules engine picks it up without deploy
- [ ] Auth-protect Logic Builder — admin only

---

## 🟡 WEEK 4 — OPTIMISATION + MONITORING
> Status: 🟡 In Progress. Admin UI, analytics, and classification complete.

### Admin Dashboard
- [x] Build centralized Admin Dashboard (`/admin`) with card navigation to all tools
- [x] Root redirect (`/` → `/admin`)
- [x] Shared admin layout with top nav bar
- [x] Consistent light theme across all admin pages

### Reliability
- [x] Set up cron-job.org — 4 jobs: process-queue (1 min), sla-monitor (5 min), zoho-reconcile (60 min), reengagement (daily 11:30 AM)
- [x] Replace BullMQ raw TCP with Upstash REST rpush/lpop
- [ ] Add national holiday / suppression calendar
- [ ] Implement Zoho Bulk Write API for high-volume writeback batching
- [ ] Build retry with exponential backoff across all outbound calls

### Analytics & Dashboard
- [x] Build template performance tracking — `/admin/analytics`
- [x] Build campaign analytics inline on `/admin/campaigns`
- [x] `/admin/templates` — live Twilio template list with approval status
- [x] `/admin/classification` — DB-driven keyword editor
- [x] Auto-discover templates from Twilio Content API
- [ ] Build conversion tracking (lead stage FSM progression)
- [ ] Events list, lead detail view, message history per lead
- [ ] Sender quality score view
- [ ] Auto-pause campaign sends when sender quality score = LOW

---

## 🔵 PHASE 1 — RULES ENGINE v3 (26 March 2026)
> **Goal:** Complete Rules Engine v3 implementation, Zoho setup, and end-to-end testing.
> **Status:** 🟡 Code complete. Zoho setup and testing pending.

### ✅ Completed (this session)
- [x] **New DB fields** — `20260326_new_lead_fields.sql`: `program`, `persona`, `academic_level`, `relocate_to_pune`, `urgency`, `lead_track`, `webinar_rsvp` added to `leads` table
- [x] **Workflow graph seeded** — `20260326_seed_workflow.sql`: Rules 1–4 decision tree pre-built as editable React Flow graph in `workflow_rules`
- [x] **Constants updated** — All 10 templates in `TEMPLATE_SIDS`, new `FIELD_VALUES` map, new `WORKFLOW_STATES`, expanded `LEAD_FIELDS`
- [x] **Lead type updated** — `supabase.ts` `Lead` type includes all 7 new fields
- [x] **Zoho webhook enriched** — Accepts `program`, `persona`, `academic_level`, `relocate_to_pune`; computes `urgency` from `academic_level` at intake
- [x] **rulesEngine.ts** — Graph-first + programmatic fallback for Rules 1–4; `first_sent` state set after welcome enqueue; `wa_manual_triage` for filtered leads
- [x] **Logic Builder loads from DB** — `GET /api/admin/workflow` added; Builder loads published graph on mount
- [x] **Logic Builder dropdowns** — Per-field value dropdowns via `FIELD_VALUES` (persona, program, academic_level, etc.)
- [x] **inboundProcessor.ts** — ButtonPayload detection (Rule 8), state transitions, `wa_counsellor_intro` auto-send, 2h SLA, `lead_track`/`webinar_rsvp` writes, `lead_events` logging
- [x] **Reengagement cron** — Repurposed for Rules 5 (24h no-reply → `wa_followup_1`) and 6 (48h post-reply → `wa_track_selector` or `wa_followup_2_quickreply`)

### 🔲 Remaining (to do)
- [ ] **P1.1 — Fix `wa_state` overwrite on re-upsert**
  - Zoho fires webhooks on updates too. Current upsert unconditionally sets `wa_state: 'wa_pending'` and `wa_opt_in: true`, corrupting leads already in sequence.
  - Fix: on `onConflict`, update contact fields only (`name`, `email`, `lead_source`, `program`, `persona`, `academic_level`, `relocate_to_pune`, `urgency`). Leave all `wa_*` fields untouched.

- [ ] **P1.2 — Update Storysells branch in workflow graph**
  - Current seed: `program = Storysells` → End node (silent skip).
  - Required: route Storysells → Action node (`wa_welcome_manual`) as placeholder.
  - Can be done via `/admin/logic-builder` UI (no migration needed).

- [~] **P1.3 — Zoho webhook field mapping** *(in progress — working with user)*
  - User to provide Zoho field export (all existing Lead fields).
  - Map Zoho API names → our schema (`program`, `persona`, `academic_level`, `relocate_to_pune`).
  - Update `zohoPayloadSchema` keys to match exact Zoho field names.
  - Create Zoho Workflow Rules to POST these fields on Lead Created / Lead Updated.

- [ ] **P1.4 — Run Supabase migrations on production**
  - Apply `20260326_new_lead_fields.sql`
  - Apply `20260326_seed_workflow.sql`

- [ ] **P1.5 — Verify `ButtonPayload` field name from Twilio**
  - Pull a raw inbound webhook log from Twilio for a quick reply tap.
  - Confirm field name is exactly `ButtonPayload` (not `button_text`, `ButtonText`, etc.).
  - Update `inboundProcessor.ts` if field name differs.

- [ ] **P1.6 — Set up Zoho API credentials**
  - Create Zoho OAuth server-based application.
  - Generate client ID, client secret, and a long-lived refresh token.
  - Store in Vercel env vars: `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_ORG_ID`.
  - Document token refresh flow (Zoho access tokens expire every 60 min).

- [ ] **P1.7 — Create Zoho custom fields on Leads module**
  - Cross-check against user's existing field list before creating (avoid duplicates).
  - **Core WA fields** (if not already present): `WA_Opt_In` (Checkbox), `WA_State` (Single-line), `WA_Hotness` (Picklist: hot/warm/cold/dead), `WA_Reply_Class` (Picklist: interested/fee_question/not_now/wrong_number/stop/other), `WA_Last_Inbound_At` (DateTime)
  - **New field**: `WA_Track` (Picklist: enterprise_leadership/family_business/venture_builder)

- [ ] **P1.8 — Implement core Zoho writeback**
  - After every inbound message processed, call Zoho Leads update API.
  - Fields to write: `WA_Reply_Class`, `WA_Hotness`, `WA_Last_Inbound_At`.
  - Write `WA_Opt_In = false` immediately on opt-out (compliance — cannot wait for reconcile cron).
  - Fix and reactivate `/api/cron/zoho-reconcile` (currently failing with HTTP error — auth not configured).

- [ ] **P1.9 — Update 3 pending template SIDs**
  - When `wa_welcome_manual`, `wa_followup_1`, `wa_counsellor_intro` are approved in Twilio, update `TEMPLATE_SIDS` in `constants.ts`.
  - Live Twilio name-lookup fallback covers until then.

- [ ] **P1.10 — End-to-end test and debug**
  - **New lead — Meta Student path:** Zoho webhook → upsert (with `persona=Student`, `lead_source=Meta Ads`) → rules engine → `wa_welcome_meta_student` queued → dispatched → Twilio delivery confirmed.
  - **New lead — Organic Parent path:** same flow with `wa_welcome_organic_parent`.
  - **New lead — Manual path:** `wa_welcome_manual` (or live name lookup if SID pending).
  - **Filter paths:** test `program=Storysells` (→ `wa_welcome_manual` per P1.2), `relocate_to_pune=No` (→ `wa_manual_triage`), `academic_level=10th` (→ skip).
  - **Button payload flows:** send `wa_track_selector` manually → tap a track button → confirm `lead_track` written + `wa_counsellor_intro` queued + 2h SLA set.
  - **Free-text reply:** send message → confirm NLP classification → confirm state transition.
  - **Opt-out:** send "STOP" → confirm `wa_opt_in = false` written in Supabase and Zoho.
  - **Follow-up cron (Rule 5):** set a test lead to `wa_state=first_sent` with `wa_last_outbound_at` >24h ago and `wa_last_inbound_at=NULL` → trigger cron → confirm `wa_followup_1` queued.

---

## 🟠 PHASE 2 — NEXT SPRINT

- [ ] **P2.1 — Follow-up cron deduplication**
  - Set new `wa_state` atomically *before* enqueuing in Rules 5 & 6 (not after).
  - Prevents a lead from being matched again on the next cron run while still in the dispatch queue.

- [ ] **P2.2 — Rule 6 double-send guard**
  - Add `wa_last_outbound_at < wa_last_inbound_at` check to Rule 6 query.
  - Prevents a lead who already received `wa_track_selector` from also getting `wa_followup_2_quickreply` 48h later.

- [ ] **P2.3 — Named flow save/open in Logic Builder**
  - Allow multiple `workflow_rules` rows. One row `is_active = true` evaluated at runtime.
  - UI additions: flow list panel (list / open / duplicate / create new), active/draft toggle, flow name editing.
  - Enables versioning and A/B draft testing of routing logic.

- [ ] **P2.4 — Editable button payload map**
  - Admin UI (similar to `/admin/classification`) where button postback IDs are mapped to reply class, hotness, state transition, and special actions (`lead_track`, `webinar_rsvp`, counsellor flag).
  - Eliminates code change requirement for every new quick reply template.

- [ ] **P2.5 — Campaign reply awareness**
  - Use `wa_last_template` in `inboundProcessor` to suppress specific downstream actions for campaign-originated replies.
  - Specifically: `WEBINAR_YES` tap → flag counsellor but do NOT auto-send `wa_counsellor_intro` (counsellor sends joining details manually).

- [ ] **P2.6 — Expanded Zoho writeback**
  - After outbound send: write `WA_State`, `WA_Last_Outbound_At`, `WA_Last_Template`.
  - On track selector tap: write `WA_Track` picklist value.
  - On hot lead: create Zoho Task ("Call [Name] — WA Hot Lead", due in 2h, assigned to owner).

- [ ] **P2.7 — Storysells proper template**
  - Create a Storysells-specific WhatsApp template in Twilio and get it approved.
  - Update Logic Builder routing: `program = Storysells` → new Storysells template (replace `wa_welcome_manual` placeholder).

---

## ⚪ PHASE 3 — FUTURE

- [ ] **P3.1 — Multiple independent flows**
  - Support more than one active flow evaluated in parallel (e.g., BBA Pune flow, Storysells flow).
  - `rulesEngine.ts` selects the right flow based on a top-level lead field (e.g., `program`).

- [ ] **P3.2 — End node differentiation**
  - Different outcomes for different End nodes in the graph.
  - Currently all End nodes behave identically (`wa_manual_triage`).
  - Future: silent skip, Zoho task, email alert, SMS fallback — configurable per End node.

- [ ] **P3.3 — CSV import for contacts campaigns**
  - Admin UI to upload a CSV of contacts into a temporary Supabase table (`contacts_import`).
  - Columns: phone, name, and any segment fields.
  - Campaigns can target this table in addition to the existing `leads` table.

- [ ] **P3.4 — Contacts campaign runner**
  - Campaign creation UI supports selecting source: existing `leads` (with filters) or an imported `contacts_import` batch.
  - Rate-limiting, dispatch queue, and delivery tracking apply equally to both.

- [ ] **P3.5 — Lead data strategy review**
  - Formal review of long-term Supabase vs Zoho data model.
  - Current model (Supabase = WA state mirror, Zoho = source of truth) works well.
  - Review once Zoho writeback is mature and volume is clear.

---

## 🧱 BLOCKERS LOG

| # | Raised | Blocker | Owner | Status | Resolution |
|---|---|---|---|---|---|
| 1 | 23 Mar | Template approval needed before Week 1 | Templates Agent | ✅ Resolved | Setup completed by User in Twilio |
| 2 | 23 Mar | BullMQ worker: Vercel Cron vs Railway decision needed | Code Agent | ✅ Resolved | Vercel Cron + cron-job.org (BullMQ replaced with Upstash REST) |
| 3 | 23 Mar | Postgres provider: Neon vs Supabase | Code Agent | ✅ Resolved | Supabase chosen |
| 4 | 23 Mar | Logic Builder auth method | Code Agent | ✅ Resolved | NextAuth planned, unprotected for Phase 1 |
| 5 | 24 Mar | Vercel Hobby plan limits crons to daily only | Code Agent | ✅ Resolved | External cron-job.org handles per-minute scheduling |
| 6 | 24 Mar | BullMQ TCP incompatible with Upstash serverless | Code Agent | ✅ Resolved | Replaced with pure Upstash REST rpush/lpop |
| 7 | 24 Mar | Vercel GitHub webhook stopped triggering builds | Ops | ✅ Resolved | Using `vercel --prod` CLI deploys |
| 8 | 25 Mar | Twilio error 63027 — templates not delivering | Code Agent | ✅ Resolved | Resubmitted template as utility category. E2E delivery confirmed 25 Mar 2026. |
| 9 | 25 Mar | Twilio Geo Permissions blocked India delivery | Ops | ✅ Resolved | User enabled India in Twilio Console → Geo Permissions |
| 10 | 25 Mar | Messaging Service A2P 10DLC blocked WhatsApp sender | Ops | ✅ Resolved | Used WhatsApp-specific sender flow to bypass A2P SMS requirement |
| 11 | 26 Mar | Zoho API credentials not set up — writeback non-functional | Ops | 🔴 Open | Set up OAuth app + refresh token (P1.6) |
| 12 | 26 Mar | 3 templates pending Twilio approval (wa_welcome_manual, wa_followup_1, wa_counsellor_intro) | Templates Agent | 🟡 In Progress | Live name-lookup fallback active. Update constants.ts when approved. |
| 13 | 26 Mar | ButtonPayload field name from Twilio unverified | Code Agent | 🔴 Open | Pull raw webhook log from Twilio to confirm (P1.5) |
| 14 | 26 Mar | Zoho field mapping not yet done — new fields can't be received | Ops | 🔴 Open | User to provide Zoho field export; map to schema (P1.3) |

---

## 📝 DECISIONS LOG

| Date | Decision | Chosen | Alternatives Considered |
|---|---|---|---|
| 23 Mar | Hosting | Vercel (serverless) | Railway, EC2, Render |
| 23 Mar | Messaging provider | Twilio WhatsApp | 360dialog, WATI |
| 23 Mar | Human handover channel | Zoho Task + Email | Slack, WhatsApp group |
| 23 Mar | Opt-in method | LP form checkbox | Post-capture consent DM |
| 23 Mar | Rules engine config | DB-driven (Logic Builder graph) | Hardcoded / YAML config |
| 23 Mar | Campaign rate limit | 30 msg/min (default) | TBD based on warmup |
| 24 Mar | Queue system | Upstash REST (rpush/lpop) | BullMQ (incompatible with serverless) |
| 24 Mar | Cron scheduling | cron-job.org (free) | Vercel Cron (Hobby plan limits) |
| 24 Mar | Deploy method | `vercel --prod` CLI | GitHub auto-deploy (webhook broken) |
| 23 Mar | Admin dashboard | Centralized `/admin` hub | Separate standalone pages |
| 25 Mar | Content API template delivery | Must use `messagingServiceSid` with Content SIDs (HX...) | Sending from bare phone number (unsupported since Apr 2025) |
| 25 Mar | Template variable format | Omit `contentVariables` entirely when empty | Pass `contentVariables: {}` (broken — causes 63027) |
| 25 Mar | Template discovery | Live Twilio Content API with Upstash cache (1hr TTL) | Manual `constants.ts` updates |
| 25 Mar | Reply classification | DB-driven keyword rules (`classification_rules` table, Redis cache 30min) | Hardcoded if/else |
| 26 Mar | Rules engine architecture | Graph-first (Logic Builder), code fallback for Rules 1–4 | Hardcoded routing only |
| 26 Mar | Welcome template routing | Source × Persona (5 paths: Meta×Student, Meta×Parent, Organic×Student, Organic×Parent, Manual) | Single template per source (no persona split) |
| 26 Mar | Storysells handling | Route to `wa_welcome_manual` placeholder; proper template in Phase 2 | Silent skip (no WA message) |
| 26 Mar | Follow-up cron timing | Once daily at 11:30 AM (acceptable ~24h variance) | Per-hour (over-engineering for current volume) |
| 26 Mar | Zoho data model | Supabase = WA state mirror only; Zoho = source of truth | Full lead replication to Supabase |
| 26 Mar | Contacts campaigns | Phase 3: CSV import to temp Supabase table | Zoho Contacts API integration |
| 26 Mar | Zoho writeback scope (Phase 1) | Core: opt-out + reply class + hotness | Minimal (opt-out only) or Full (incl. Zoho Tasks) |
| 26 Mar | re-engagement cron | Repurposed for Rules 5 & 6 (24h/48h follow-ups); 7-day dormancy cron deprecated | Keep 7-day cron, add new cron for follow-ups |

---

## 🗂️ TEMPLATE REGISTRY (current, all 10)

| # | Name | SID | Type | Status | Trigger |
|---|---|---|---|---|---|
| 01 | `wa_welcome_meta_student` | `HXd032c7b2d23d59cd56bbc71453b0afd6` | Text, `{{1}}`=name | ✅ Approved | source=Meta, persona=Student |
| 02 | `wa_welcome_meta_parent` | `HXd97f088d39cd2f46bf189a3839eeb8ce` | Text, `{{1}}`=name | ✅ Approved | source=Meta, persona=Parent |
| 03 | `wa_welcome_organic_student` | `HX5f55c702e5b379893cf79f9a0f492e6e` | Text, `{{1}}`=name | ✅ Approved | source=Organic/Website, persona=Student |
| 04 | `wa_welcome_organic_parent` | `HXdad3576db7480fcf3e61c780221df990` | Text, `{{1}}`=name | ✅ Approved | source=Organic/Website, persona=Parent |
| 05 | `wa_welcome_manual` | HX… (pending) | Text, `{{1}}`=name | ⏳ Pending | source=Manual/Phone/Instagram/Referral |
| 06 | `wa_followup_1` | HX… (pending) | Text, `{{1}}`=name | ⏳ Pending | wa_state=first_sent, 24h no reply (Rule 5) |
| 07 | `wa_followup_2_quickreply` | `HX99c54dea1ea1d4fec682ee78452c0831` | Quick Reply (3 buttons) | ✅ Approved | wa_state=replied, 48h silence, track set (Rule 6b) |
| 08 | `wa_track_selector` | `HXddf8ea9d9d01a0cc51dc6419909abb20` | Quick Reply (3 buttons) | ✅ Approved | wa_state=replied, 48h silence, no track (Rule 6a) |
| 09 | `wa_webinar_cta` | `HXe5d3fdede430efb27b5e7c50bed1b55a` | Quick Reply (2 buttons) | ✅ Approved | Campaign only — parent segment |
| 10 | `wa_counsellor_intro` | HX… (pending) | Text, `{{1}}`=name | ⏳ Pending | interested/fee_question reply or track selector tap |

**Sender:** `+917709333161` (WABA ID: `730962058295010`)
**Messaging Service SID:** `MG4b7040930f5d63bc27d808429106136a`
**Warmup limit:** 250/day (started 24 Mar 2026)

---

## 🔗 REFERENCE DOCS
- [`PRE_BUILD_SPECS.md`](./PRE_BUILD_SPECS.md) — Phone normalisation, reply taxonomy, architecture decisions
- [`CHANGELOG.md`](./CHANGELOG.md) — Version history
- [`README.md`](./README.md) — Architecture overview, setup guide
