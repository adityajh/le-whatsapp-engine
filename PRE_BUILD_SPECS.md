# PRE-BUILD: Tech Specs & Decisions
**Status:** Defined (Awaiting Sign-off)
**Owner:** Code Agent

---

## 1. Phone Normalisation Specification
Twilio requires the E.164 numbering format (e.g., `+919876543210`). Indian lead forms often capture numbers inconsistently. 

**Input Variations to Handle:**
- `9876543210` (10 digits, no code)
- `09876543210` (Leading zero)
- `+919876543210` (Correct E.164)
- `919876543210` (Country code, no plus)
- `+91 98 765 43210` (Spaces)
- `+91-98765-43210` (Dashes)
- `(+91) 9876543210` (Parentheses)

**Normalisation Logic (Order of Operations):**
1. Remove all non-numeric and non-plus characters (spaces, dashes, parentheses).
2. If string starts with `0` and length is 11, strip the leading `0`.
3. If string length is 10, prepend `+91`.
4. If string length is 12 and starts with `91`, prepend `+`.
5. If string length is 13 and starts with `+91`, accept as valid.
6. If the number does not match an Indian mobile pattern (e.g., length not 10 after stripping +91), log as `INVALID_PHONE` and halt webhook processing.

---

## 2. Reply Classification Taxonomy
When a lead replies, the system classifies the intent (using simple regex/keyword matching or simple LLM call later) to determine the next state and urgency.

| Classification | Meaning | Next Action (Rules Engine) | Resulting WA State | Hotness |
|---|---|---|---|---|
| `interested` | Wants to know more | Alert counsellor immediately (2h SLA) | `wa_hot` | Hot |
| `fee_question`| Asking about price/fees | Alert counsellor OR trigger fee template | `wa_hot` | Warm |
| `not_now` | Busy, "contact later" | Pause outbound, log for nurture | `wa_nurture` | Cold |
| `wrong_number`| "Not me", "Wrong person" | Mark dead, close loop | `wa_closed` | Dead |
| `stop` | Opt-out request | Set `WA_Opt_In = false`, no more sends | `wa_closed` | Dead |
| `other` | Question, unrelated | Alert counsellor for human review | `wa_hot` | Warm |

---

## 3. Architecture Decisions (Proposed by Code Agent)

> **Please confirm these 3 decisions so we can begin Week 1 scaffolding.**

### Decision 1: Queue Worker → **Vercel Cron**
- **Proposal:** Use Upstash Redis (BullMQ compatible) but trigger the queue processor via a Vercel Cron Job running every 1 minute. 
- **Why:** 50-100 leads a day is very low volume. We don't need a 24/7 always-on server like Railway just to process a dozen messages a day. A 1-minute delay on campaigns or webhooks is perfectly acceptable for this use case and keeps the entire stack serverless on Vercel.

### Decision 2: Database Provider → **Supabase**
- **Proposal:** Use Supabase's free tier for Postgres.
- **Why:** Vercel serverless requires connection pooling (PgBouncer/Supavisor) so we don't exhaust DB connections. Supabase handles this natively out of the box, offers a great UI to view our mirrored Zoho data, and provides easy setup. Neon is good too, but Supabase integrates smoothly with NextAuth/Auth.

### Decision 3: Admin Logic Builder Auth → **NextAuth (Shared Credentials)**
- **Proposal:** For Phase 1, secure the Logic Builder UI using NextAuth (Auth.js) with a hardcoded secure password (or a whitelist of 2-3 Google Workspace emails).
- **Why:** Don't bloat the app with a full Clerk/Stripe user management system if only 1-2 admins will use the Logic Builder. It's an internal tool.

---

## 4. Deliverability & Template Strategy (Migrated from Legacy Docs)

### Deliverability Checklist:
- **Strong opt-in copy at lead capture**: Drives higher reply rates from genuine leads.
- **Contextual first message (source-specific)**: Reduces block rate — user recognises why they're being contacted.
- **No bulk blasting**: Bulk sends without prior engagement destroy quality score.
- **Sender consistency**: Same number builds recognition and trust over time.
- **Reply-driven follow-ups**: WhatsApp rewards conversations, not broadcasts.
- **Track read vs reply rate**: Read without reply = low relevance signal.
- **Time-of-day send window**: 9am to 8pm IST to prevent late night sends which increase block rates.
- **Max 2 outbound templates per lead before reply**: Prevents spam signals.
- **Block sends to opted-out numbers**: Absolute requirement to avoid compliance violations.
- **Monitor quality score**: Check Twilio dashboard weekly.

### 5. Live Environment & Tracking (Updated 24 March 2026)

**Live WhatsApp Sender Details:**
- **Number**: `+917709333161` (Twilio Location: Messaging → Senders → WhatsApp senders)
- **Status**: Online ✅
- **Business Display Name**: Let's Enterprise
- **WABA ID**: `730962058295010`
- **Throughput**: 80 messages/second
- **Warmup Limit**: 250 conversations/day (Started 24 March 2026). Phases: 250 → 1,000 → 2,000 → 10,000.
- **Webhook URLs**: Empty — to be filled in Week 1 when Node app has a public URL.

*Note: Ignore backup US number `+1 864 894 2178`.*

**Compliance (Minimum Required Before Go-Live):**
- **Consent**: Store `WA_Opt_In = true` per lead before sending. No consent, no send.
- **STOP Handler**: Must be live on Day 1. Any inbound STOP keyword sets `WA_Opt_In = false` and halts all sends immediately.
- **Opt-out Logging**: Log every opt-out with timestamp (WhatsApp Business Policy requirement).

**Approved Templates and SIDs:**
- `wa_welcome_manual` : `HX23923d44f51d9a7da14f22cf109ac576`
- `wa_welcome_organic` : `HX56142f55de8db39eaadc7ad5fc7aff03`
- `wa_welcome_meta` : `HXd3cf40ca8ed1b0fa7bc74cfa9a901887`
- `wa_counsellor_intro` : `HX8241ba1ede5451b564660006d059faa2`
- `wa_reengagement` : `HXb0be78e0070d3153d3c1d5d62410b74a`
- `wa_followup_1` : `HXf0af953383a41a1ac25ba99cf8435c8d`

**Spec Reference Notes:**
- **Phone Norm**: Normalise to `+91XXXXXXXXXX`. Invalid numbers must set `WA_State = invalid_number` in Zoho.
- **Reply Classification**: 8 classes map to `WA_Reply_Class`, `WA_Hotness`, and drive Zoho tasks/alerts. Classification must happen BEFORE inbound message actions.
- **Source -> Template Map**: 8 lead sources mapped via `campaign_name` to first templates and follow-ups.
