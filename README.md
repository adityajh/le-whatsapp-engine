# LE WhatsApp Automation Engine

**Production-ready WhatsApp lead engagement engine** connecting Zoho CRM ↔ Twilio WhatsApp ↔ Supabase, with automated message classification, SLA tracking, campaign management, and a visual Logic Builder.

**Live URL:** [https://le-whatsapp-engine.vercel.app/admin](https://le-whatsapp-engine.vercel.app/admin)

---

## Architecture Overview

```
Zoho CRM ──webhook──► Vercel (Next.js App Router)
                           │
                     ┌─────┼──────────────┐
                     │     │              │
               /webhooks/zoho    /webhooks/twilio/inbound
                     │                    │
              Normalise Phone        Enqueue to
              Upsert to Supabase     Upstash Redis
              Evaluate Rules Engine       │
                     │              ┌─────┴─────┐
                     ▼              │  Cron Job  │
              Logic Builder ────►  Process Queue  ◄── cron-job.org (1 min)
              (React Flow)          │           │
                                Classify      Update
                                Reply         Supabase
                                (DB rules)
                                    │
                              ──► Twilio WhatsApp API ──► Lead's Phone
```

### Core Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router, TypeScript) |
| Database | Supabase (Postgres) |
| Queue / Cache | Upstash Redis (REST API — `rpush`/`lpop`) |
| Messaging | Twilio WhatsApp Business API |
| CRM | Zoho CRM (via Webhook + planned API writeback) |
| Hosting | Vercel (Serverless, Hobby plan) |
| Cron Scheduling | cron-job.org (free tier — per-minute execution) |
| Rules Engine | Custom React Flow graph evaluator (`logicEvaluator.ts`) |

---

## Admin UI Modules

| Page | URL | Description |
|---|---|---|
| **Control Hub** | `/admin` | Central dashboard linking all tools |
| **Logic Builder** | `/admin/logic-builder` | Visual drag-and-drop state machine editor (React Flow) |
| **SLA Monitor** | `/admin/sla-monitor` | Table of leads ticking toward SLA breach |
| **Campaign Manager** | `/admin/campaigns` | Manage bulk WhatsApp campaigns with per-campaign funnel stats |
| **Create Campaign** | `/admin/campaigns/create` | Form to segment leads and launch batch sends |
| **Reply Classification** | `/admin/classification` | Edit keywords per reply class — no deploy needed |
| **Template Analytics** | `/admin/analytics` | Delivery %, reply %, per-template performance breakdown |
| **WhatsApp Templates** | `/admin/templates` | Live Twilio template list with approval status and Refresh |

---

## API Endpoints

### Webhooks (Inbound)
| Endpoint | Method | Source | Auth |
|---|---|---|---|
| `/api/webhooks/zoho` | POST | Zoho CRM Workflow Rules | HMAC SHA256 (`x-zoho-signature`) |
| `/api/webhooks/twilio/inbound` | POST | Twilio (WhatsApp reply received) | `x-twilio-signature` |
| `/api/webhooks/twilio/status` | POST | Twilio (delivery status callback) | `x-twilio-signature` |

### Cron Jobs (Called by cron-job.org)
| Endpoint | Method | Schedule | Purpose |
|---|---|---|---|
| `/api/cron/process-queue` | GET | Every 1 min | Drain Upstash Redis queue, process inbound/status jobs |
| `/api/cron/sla-monitor` | GET | Every 5 min | Escalate overdue SLA leads |
| `/api/cron/zoho-reconcile` | GET | Every 60 min | Sync missing WA states between Zoho and Supabase |
| `/api/cron/reengagement` | GET | Every 24 hours | Re-engage 7-day dormant leads |

### Admin API
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/admin/workflow` | POST | Save Logic Builder graph to `workflow_rules` table |
| `/api/admin/templates` | GET | List approved Twilio templates (cached 1hr in Redis) |
| `/api/admin/templates/refresh` | POST | Bust Twilio template cache and reload |

---

## Environment Variables & Secrets

All secrets are stored in **Vercel → Project Settings → Environment Variables**.

| Variable | Source | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API | Supabase project REST endpoint |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API | Server-side DB access (bypasses RLS) |
| `UPSTASH_REDIS_REST_URL` | Upstash Console → Redis Database | Redis REST endpoint for queue |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Console → Redis Database | Auth token for Upstash REST |
| `TWILIO_ACCOUNT_SID` | Twilio Console → Account Info | Twilio account identifier |
| `TWILIO_AUTH_TOKEN` | Twilio Console → Account Info | Twilio API auth + webhook signature validation |
| `TWILIO_WEBHOOK_SECRET` | Same as `TWILIO_AUTH_TOKEN` (optional override) | Validates `x-twilio-signature` on inbound webhooks |
| `TWILIO_MESSAGING_SERVICE_SID` | Twilio Console → Messaging → Services | **Required** for Content API (HX...) template sending. Value: `MG4b7040930f5d63bc27d808429106136a` |
| `ZOHO_WEBHOOK_SECRET` | User-defined shared secret | HMAC SHA256 validation of Zoho payloads |
| `CRON_SECRET` | User-defined (e.g. `le_cron_secret_2026`) | `Authorization: Bearer <secret>` header for cron endpoints |
| `NODE_ENV` | Auto-set by Vercel | `production` / `development` |

---

## External Service Configuration

### Twilio (WhatsApp Sender: `+917709333161`)
- **Inbound Webhook URL:** `https://le-whatsapp-engine.vercel.app/api/webhooks/twilio/inbound`
- **Status Callback URL:** `https://le-whatsapp-engine.vercel.app/api/webhooks/twilio/status`
- **Method:** HTTP POST (both)
- **Location in Console:** Messaging → Senders → WhatsApp senders → `+917709333161`
- **Messaging Service SID:** `MG4b7040930f5d63bc27d808429106136a` — Required for all Content API template sends.
- **Geo Permissions:** India (`+91`) must be checked under Console → Geo Permissions.
- **Template discovery:** Templates are fetched live from `https://content.twilio.com/v1/Content` — no manual config needed when adding new templates. Hit Refresh in `/admin/templates` after changes.

### cron-job.org
- **4 cron jobs** configured (see table above)
- Each job sends `Authorization: Bearer <CRON_SECRET>` header
- Request method: GET

### Zoho CRM (Planned)
- Workflow Rules on Leads module post to `/api/webhooks/zoho`
- Include `x-zoho-signature` header with HMAC SHA256 of body using shared secret

---

## Database Schema (Supabase)

| Table | Purpose |
|---|---|
| `leads` | Mirror of Zoho leads with WhatsApp state fields |
| `messages` | Immutable log of every inbound/outbound message |
| `lead_events` | Append-only event log (audit trail) |
| `sender_profiles` | WhatsApp sender numbers + warmup tracking |
| `workflow_rules` | Logic Builder graph (React Flow JSON) |
| `campaigns` | Campaign definitions (name, template, segment) |
| `campaign_leads` | Per-lead tracking within each campaign |
| `classification_rules` | Keyword rules per reply class — editable from admin UI |

Migrations:
- `supabase/migrations/20260323_init_schema.sql`
- `supabase/migrations/20260324_campaign_tracking.sql`
- `supabase/migrations/20260325_classification_rules.sql`

---

## Reply Classification

Keywords are stored in the `classification_rules` table and editable at `/admin/classification` — no deploy needed. Cached in Redis (30min TTL), cache busted on save.

| Class | Hotness | Next Action |
|---|---|---|
| `interested` | Hot | Alert counsellor (2h SLA) |
| `fee_question` | Warm | Alert counsellor or auto-trigger fee template |
| `not_now` | Cold | Pause outbound, nurture |
| `wrong_number` | Dead | Mark closed |
| `stop` | Dead | Set `WA_Opt_In = false`, halt all sends |
| `other` | Warm | Alert counsellor for human review |

---

## Development

```bash
npm install
npm run dev       # Local dev server at http://localhost:3000
npm run lint      # ESLint
npm run build     # Production build
```

Deploy to production:
```bash
vercel --prod --yes
```

---

## Reference Docs
- [`PRE_BUILD_SPECS.md`](./PRE_BUILD_SPECS.md) — Phone normalisation, reply taxonomy, architecture decisions
- [`PROJECT_EXECUTION.md`](./PROJECT_EXECUTION.md) — Execution tracker with all tasks and blockers
- [`CHANGELOG.md`](./CHANGELOG.md) — Version history
