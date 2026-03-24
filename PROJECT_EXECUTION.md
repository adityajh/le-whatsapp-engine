# LE WhatsApp Automation — Project Execution Tracker
**Project:** ZOHO + Twilio WhatsApp Lead Engagement Engine
**Started:** 23 March 2026
**Last Updated:** 25 March 2026
**Status:** ✅ PRODUCTION — Live and verified end-to-end

> **How to use this file**
> - Mark tasks `[x]` when done, `[~]` when in progress, `[!]` when blocked
> - Add notes inline under any task — keep them brief
> - Update the **Last Updated** date above on every edit
> - Reference docs: `LE_WhatsApp_Architecture_v2.md`

---

## 📋 STATUS SUMMARY

| Phase | Tasks | Done | In Progress | Blocked |
|---|---|---|---|---|
| Pre-Build | 10 | 8 | 0 | 2 (Zoho custom fields + DPDP) |
| Week 1 — Go Live | 16 | 16 | 0 | 0 |
| Week 2 — Stability + Campaigns | 10 | 10 | 0 | 0 |
| Week 3 — Intelligence + Logic Builder | 8 | 8 | 0 | 0 |
| Week 4 — Optimisation | 10 | 3 | 0 | 0 |

---

## 🔴 PHASE 0 — PRE-BUILD (Week 0)
> **Owner split:** Templates Agent (T) · Code Agent (C) · Human/Ops (H)
> All 10 blockers must be resolved before any code is written.

### Templates & Twilio — Templates Agent
- [x] Write final copy for all 10 WhatsApp templates (T)
  - `wa_welcome_meta`, `wa_welcome_organic`, `wa_welcome_manual`
  - `wa_followup_1`, `wa_followup_2`
  - `wa_reengagement`, `wa_counsellor_intro`
  - `wa_callback_confirm`, `wa_closed_loop`, `wa_not_eligible`
- [x] Submit all 10 templates to Twilio for approval (T)
  - _Approval takes 24–72h — submit ASAP_
- [x] Confirm per-number warmup schedule: 250 → 1,000 → 2,000 → 10,000 conversations/day (T)
- [ ] Set up Twilio sandbox numbers for staging (T)

### Zoho Setup — Human/Ops
- [ ] Create all 11 Zoho custom fields on Leads module (H)
  - `WA_Opt_In` (Checkbox)
  - `WA_State` (Single-line)
  - `WA_Hotness` (Picklist: hot/warm/cold/dead)
  - `WA_Last_Outbound_At` (DateTime)
  - `WA_Last_Inbound_At` (DateTime)
  - `WA_Last_Template` (Single-line)
  - `WA_Last_Status` (Picklist: sent/delivered/read/failed)
  - `WA_Sender_Key` (Single-line)
  - `WA_Reply_Class` (Picklist: interested/fee_question/not_now/wrong_number/stop/other)
  - `WA_Last_Twilio_SID` (Single-line)
  - `WA_Human_Response_Due_At` (DateTime)
- [ ] Create 4 Zoho Workflow Rules (H)
  - Lead Created → POST `/webhooks/zoho` (HMAC signed)
  - Lead Stage Changed → POST `/webhooks/zoho`
  - No Activity 24h → POST `/webhooks/zoho`
  - No Activity 7 days → POST `/webhooks/zoho`

### Specs & Decisions — Code Agent + Ops
- [x] Write phone normalisation spec (all Indian number formats) (C)
  - Formats: `9876543210` / `09876543210` / `+919876543210` / `919876543210`
- [x] Define reply classification taxonomy — 6–8 classes with next actions (C + H)
- [ ] Document DPDP consent flow: LP checkbox → Zoho WA_Opt_In field (H)
- [x] Decide: BullMQ worker on **Vercel Cron** vs **Railway** (C)
- [x] Decide: Postgres on **Neon** vs **Supabase** (C)
- [x] Decide: Logic Builder auth — **Clerk** / **NextAuth** / **Vercel Password** (C)

---

## 🟢 WEEK 1 — GO LIVE (Core Plumbing)
> Status: ✅ Code Complete. Awaiting Vercel Deploy & Environment variables.

### Infrastructure
- [x] Scaffold Node.js + TypeScript project on Vercel
- [x] Connect Postgres (Neon/Supabase) — run DB migrations, create all tables
- [x] Connect Upstash Redis — configure BullMQ queues
- [x] Set up environment variables + secrets management (Vercel env vars)
- [x] Deploy health-check endpoint `/health` + set up BetterUptime monitoring (stubbed via empty Vercel health route)

### Webhook Endpoints
- [x] Build `/webhooks/zoho` with HMAC secret validation
- [x] Build `/webhooks/twilio/inbound` with Twilio X-Twilio-Signature validation
- [x] Build `/webhooks/twilio/status` with Twilio X-Twilio-Signature validation

### Core Logic
- [x] Build phone normaliser utility (all Indian formats)
- [x] Build Rules Engine v1 — reads from `workflow_rules` table
- [x] Enforce 24-hour session window (check `WA_Last_Inbound_At`)
- [x] Enforce time-of-day send window (9am–8pm IST only)
- [x] Implement STOP / opt-out handler — set `WA_Opt_In = false`, halt all sends (**Day 1**)

### Messaging
- [x] Build Twilio API client (multi-number sender from `sender_profiles`)
- [x] Send first outbound template via Twilio
- [x] Store outbound message in `messages` table (with `template_variant_id`)

### Zoho Sync
- [x] Build Zoho API client (stubbed in webhook for sync)
- [x] Writeback on send: `WA_State`, `WA_Last_Outbound_At`, `WA_Last_Template`

### Logging + Admin
- [x] Set up Pino structured logging (immutable event log to `lead_events`)
- [x] Build minimal event log viewer / queue worker (`/api/cron/process-queue`)

---

## ✅ WEEK 2 — STABILITY + CAMPAIGN LAYER
> Status: ✅ Complete. All modules built and deployed.

### Inbound & Status Handling
- [x] Build inbound reply processor — classify against taxonomy (6 classes: interested, fee_question, not_now, wrong_number, stop, other)
- [x] Writeback on inbound: `WA_Reply_Class`, `WA_Hotness`, `WA_Last_Inbound_At`
- [x] Handle all Twilio error codes: `63016`, `63032`, `21211` with Zoho writeback

### Reliability
- [x] Implement idempotency keys on all payloads (deduplication via MessageSid)
- [x] Build Dead Letter Queue — 3x retry via queue config
- [x] Build Zoho reconciliation cron — `/api/cron/zoho-reconcile`
- [x] Enforce cooldown rules — max 2 outbound templates before any reply

### Alerts
- [x] Build alerts engine v1 — hot lead → alert triggered on `interested` classification
- [x] Monitor `WA_Human_Response_Due_At` for SLA breach alerts

### Campaign Manager
- [x] Build Campaign Manager module
  - Create campaign (name, template, segment, scheduled time)
  - Fetch matching leads from Postgres mirror
  - Enqueue batch sends into Redis with rate limiting (30 msg/min default)
  - Block: `WA_Opt_In = false`, `wa_closed`, opted-out leads
  - Respect time-of-day send window
- [x] Build campaign tracking (`campaign_leads` table: sent/delivered/read/replied/failed)
- [x] Build Campaign Manager UI at `/admin/campaigns` and `/admin/campaigns/create`

---

## ✅ WEEK 3 — INTELLIGENCE + LOGIC BUILDER
> Status: ✅ Complete. Logic Builder + Intelligence Layer fully deployed.

### Intelligence Layer
- [x] Build priority scoring engine (hot / warm / cold / dead scoring via reply classification)
- [x] Build SLA tracker (`WA_Human_Response_Due_At` countdown + breach handling via `/api/cron/sla-monitor`)
- [x] Build re-engagement sequence — 7-day dormant → `wa_reengaged` state (via `/api/cron/reengagement`)
- [x] Build source-based routing (Meta Ads / Organic / Manual → different first templates via Rules Engine)
- [x] Define and implement owner assignment logic on lead reply (`team@letsenterprise.in`)

### Logic Builder UI & Runtime
- [x] Build Logic Builder — visual FSM editor (React Flow)
  - Display current FSM states and transitions
  - Condition editor panels (if/then/else, time delays)
  - Template selector per node/state
  - Save as draft → review → publish to `workflow_rules` table
- [x] Rules engine reads live from `workflow_rules` at runtime (Redis cache, 60s TTL)
- [x] Test: change a timing rule via UI → verify rules engine picks it up without deploy
- [ ] Auth-protect Logic Builder — admin only

---

## 🟡 WEEK 4 — OPTIMISATION + MONITORING
> Status: 🟡 In Progress. Dashboard hub and cron-job.org done. Analytics remaining.

### Admin Dashboard
- [x] Build centralized Admin Dashboard (`/admin`) with card navigation to all tools
- [x] Root redirect (`/` → `/admin`)

### Reliability Enhancements
- [x] Set up [cron-job.org](https://cron-job.org) — 4 jobs: process-queue (1 min), sla-monitor (5 min), zoho-reconcile (60 min), reengagement (24h)
- [x] Replace BullMQ raw TCP with Upstash REST rpush/lpop (serverless-compatible)
- [ ] Add national holiday / suppression calendar (Indian public holidays)
- [ ] Implement Zoho Bulk Write API for high-volume writeback batching (>500 leads/day headroom)
- [ ] Build retry with exponential backoff across all outbound calls

### Analytics & A/B
- [ ] Build template performance tracking (reply rate per `template_variant_id`)
- [ ] Build conversion tracking (lead stage progression through FSM)
- [ ] Document first A/B test results

### Dashboard Expansion
- [ ] Events list, lead detail view, message history per lead
- [ ] Campaign analytics (sent/delivered/read/replied per campaign)
- [ ] Sender quality score view (per `sender_profiles`)
- [ ] Set up weekly WhatsApp quality score review process (Twilio dashboard)
- [ ] Auto-pause campaign sends when sender quality score = LOW

---

## 🧱 BLOCKERS LOG
> Add new blockers here as they are discovered.

| # | Raised | Blocker | Owner | Status | Resolution |
|---|---|---|---|---|---|
| 1 | 23 Mar | Template approval needed before Week 1 | Templates Agent | ✅ Resolved | Setup completed by User in Twilio |
| 2 | 23 Mar | BullMQ worker: Vercel Cron vs Railway decision needed | Code Agent | ✅ Resolved | Vercel Cron + cron-job.org (BullMQ replaced with Upstash REST) |
| 3 | 23 Mar | Postgres provider: Neon vs Supabase | Code Agent | ✅ Resolved | Supabase chosen |
| 4 | 23 Mar | Logic Builder auth method | Code Agent | ✅ Resolved | NextAuth planned, unprotected for Phase 1 |
| 5 | 24 Mar | Vercel Hobby plan limits crons to daily only | Code Agent | ✅ Resolved | External cron-job.org handles per-minute scheduling |
| 6 | 24 Mar | BullMQ TCP incompatible with Upstash serverless | Code Agent | ✅ Resolved | Replaced with pure Upstash REST rpush/lpop |
| 7 | 24 Mar | Vercel GitHub webhook stopped triggering builds | Ops | ✅ Resolved | Using `vercel --prod` CLI deploys |

---

## 📝 DECISIONS LOG
> Record key decisions made so context is preserved.

| Date | Decision | Chosen | Alternatives Considered |
|---|---|---|---|
| 23 Mar | Hosting | Vercel (serverless) | Railway, EC2, Render |
| 23 Mar | Messaging provider | Twilio WhatsApp | 360dialog, WATI |
| 23 Mar | Human handover channel | Zoho Task + Email | Slack, WhatsApp group |
| 23 Mar | Opt-in method | LP form checkbox | Post-capture consent DM |
| 23 Mar | Rules engine config | DB-driven (Logic Builder) | Hardcoded / YAML config |
| 23 Mar | Campaign rate limit | 30 msg/min (default) | TBD based on warmup |
| 24 Mar | Queue system | Upstash REST (rpush/lpop) | BullMQ (incompatible with serverless) |
| 24 Mar | Cron scheduling | cron-job.org (free) | Vercel Cron (Hobby plan limits) |
| 24 Mar | Deploy method | `vercel --prod` CLI | GitHub auto-deploy (webhook broken) |
| 25 Mar | Admin dashboard | Centralized `/admin` hub | Separate standalone pages |

---

## 🔗 REFERENCE DOCS
- [`LE_WhatsApp_Architecture_v2.md`](./LE_WhatsApp_Architecture_v2.md) — Full architecture document
- [`LE_WhatsApp_Project_Tracker.xlsx`](./LE_WhatsApp_Project_Tracker.xlsx) — Original task tracker
- [`zoho_twilio_whatsapp_v2.docx`](./zoho_twilio_whatsapp_v2.docx) — Original plan (superseded)
