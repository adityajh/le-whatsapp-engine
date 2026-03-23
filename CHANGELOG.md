# Changelog

All notable changes to the Let's Enterprise WhatsApp Engine project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.0] - 2026-03-23
### Added
- **Infrastructure Architecture**: Completed end-to-end plan for Vercel + Next.js + Supabase Postgres + Upstash Redis integration.
- **Pre-Build Specs**: Documented strictly enforced 24-hour Twilio session rules, reply taxonomy definitions, and Indian number normalisation specifications (`PRE_BUILD_SPECS.md`).
- **Next.js Project**: Scaffolded latest `create-next-app` core App Router, explicitly built with `@supabase/supabase-js`, `bullmq`, `@upstash/redis`, `twilio`, and `zod`.
- **Database Schema**: Exported `20260323_init_schema.sql` handling `leads`, `messages`, `workflow_rules` (Logic Builder), `sender_profiles`, and `lead_events`.
- **Zod Config Validator**: Centralized `config.ts` loading and strictly validating external integration tokens at runtime.
- **Webhooks**: Implemented `POST /api/webhooks/zoho` with SHA256 HMAC payload authenticity validation.
- **Twilio Receivers**: Added `POST /api/webhooks/twilio/inbound` and `/api/webhooks/twilio/status` with `x-twilio-signature` Header validation checking absolute URLs.
- **Rules Engine Core**: Built `rulesEngine.ts` handling stateless decisions (`wa_pending`, `wa_closed`) and managing explicit user Opt-Outs (STOP requests).
- **Session / Send Window Logic**: Added `sessionWindow.ts` strictly ensuring messages wait within the 9:00 AM – 8:00 PM IST limit.
- **Twilio Dispatcher**: Built `dispatcher.ts` wrapper with template handling configured (via Twilio Content API) or free-form text based on session state window.
- **BullMQ Serverless Queue**: Created `client.ts` for Upstash remote-connection, paired with a safe Vercel Cron ephemeral drain handler `/api/cron/process-queue/route.ts` built to circumvent Vercel 60s timeout limits while consuming Redis.

### Next / Planned (Week 2 & 3)
- Live deployments on Vercel
- Full Logic Builder Visual Node UI (`reactflow`)
- Campaign Bulk Dispatch Engine
