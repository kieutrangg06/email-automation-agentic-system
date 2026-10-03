# Member 2: Reply RAG & Daily Digest

## Architecture

PostgreSQL stores knowledge, tickets, drafts, summaries, recipients and audit records. NestJS at port 4000 is the API/database boundary. n8n at port 5678 runs both automation workflows. Next.js App Router at port 3000 reads the NestJS API; it never sends email directly.

The live schema was extended idempotently in `database/init.sql`. Existing tables are reused: `knowledge_base`, `email_drafts`, `email_triage_logs`, `tickets`, `daily_summaries`, and `system_audit_logs`. `daily_digest_recipients` stores configurable EXECUTIVE and OPERATIONS addresses. No recipient addresses are seeded.

## Workflow 3: AI Email Reply Agent with RAG & Human-in-the-Loop

Webhook `POST /webhook/email-reply` accepts `ticket_code`, `sender_email`, `sender_name`, `subject`, `body` (also `clean_body`/`text`), `received_at`, and `message_id`. It strips HTML, validates sender, retains Vietnamese/English keywords, searches PostgreSQL keyword matches (top five), prompts Gemini using only the retrieved context, parses structured JSON, evaluates confidence against `REPLY_HIGH_CONFIDENCE_THRESHOLD` (default 80), and persists a `PENDING_APPROVAL` draft. Low confidence remains pending and is marked `REVIEW_REQUIRED` in its audit record.

The workflow sends n8n's per-execution `$execution.resumeUrl` to NestJS with the draft notification. The n8n Wait node pauses the same execution; NestJS stores the resume URL and approval POSTs the validated decision to that URL. Node 13 validates the Wait webhook payload before branching. SMTP is reached only after APPROVE/MODIFY. The draft becomes SENT only after SMTP succeeds. SMTP errors audit `WORKFLOW_3_ERROR` and mark an approval-requested draft FAILED when its ID is present.

Nodes, in order:

1. `L3-01 Webhook Ingest Trigger`
2. `L3-02 Extract Query Keywords`
3. `L3-03 Normalize Search Vector`
4. `L3-04 Query Knowledge Base`
5. `L3-05 Inject Knowledge Context`
6. `L3-06 AI Reply Generator`
7. `L3-07 JSON Output Parser`
8. `L3-08 IF High Confidence`
9. `L3-09 Save Draft to Postgres`
10. `L3-10 Notify Next.js`
11. `L3-11 Audit Draft Created`
12. `L3-12 Human Approval Wait`
13. `L3-13 Webhook Approval Resume`
14. `L3-14 Switch Approval Route`
15. `L3-15 Prepare Email Payload`
16. `L3-16 Send Official Email`
17. `L3-17 Update Draft Resolved`
18. `L3-18 Calculate Resolution Time`
19. `L3-19 Log Agent KPI`
20. `L3-20 Sync Dashboard State`
21. `L3-21 Audit Sent Confirmation`
22. `L3-22 Workflow Error Handler`

### Approval Center

Route: `http://localhost:3000/approvals`. It reads draft rows/details from NestJS and offers search, status/confidence filters, detail/context, reviewer email, approve, modify and close actions. Approve/modify requests call NestJS; the browser never calls SMTP. A successful API response means n8n accepted the resume request, not that SMTP delivery is complete; the UI reloads workflow state afterward.

## Workflow 4: Daily Inbox Intelligence & Automated Digest

The Schedule Trigger runs daily at 18:00 in `Asia/Ho_Chi_Minh`. Execute Workflow in n8n can run it manually for testing. Data comes from today's `email_triage_logs`, open `tickets`, and a seven-day negative/P1/complaint history. Incident baseline is the seven-day daily average and requires at least three observed days; a spike is strictly greater than 30%. Insufficient history does not assert a spike. Recipient rows are read from `daily_digest_recipients`; no recipient is hard-coded. Failed alert delivery is audited and the digest batch continues.

Nodes, in order:

1. `L4-01 Daily Cron Trigger`
2. `L4-02 Count Total Inbound`
3. `L4-03 Query Pending Tickets`
4. `L4-04 Query Negative Issues`
5. `L4-05 Aggregate Stats`
6. `L4-06 AI Insights Generator`
7. `L4-07 Markdown Digest Builder`
8. `L4-08 HTML Email Template`
9. `L4-09 Fetch Executive Emails`
10. `L4-10 Save Daily Summary`
11. `L4-11 Detect Incident Spike`
12. `L4-12 IF Incident Spike`
13. `L4-13 Send Alert Email`
14. `L4-14 Audit Spike Flagged`
15. `L4-15 Split In Batches`
16. `L4-16 Send Executive Digest`
17. `L4-17 Push Stats to NestJS`
18. `L4-18 Confirm Batch Done`
19. `L4-19 Audit Report Finalized`
20. `L4-20 Error Catch Handler`

### Dashboard

Route: `http://localhost:3000/digest`. The date selector, metrics, negative issues, risk, insights, recommendations, delivery counts, last generated time, and history all come from `daily_summaries` via NestJS. Empty database results show an empty state; they are not replaced with sample values.

## API Contract

Base URL: `http://localhost:4000/api/v1`.

- `GET /knowledge?q=...`: bounded keyword/full-text knowledge search.
- `GET /email-drafts?status=...`, `GET /email-drafts/:id`, `GET /approvals/pending`.
- `POST /notifications/email-draft`: draft notification plus n8n `resume_url` and `execution_id`.
- `POST /email-drafts/:id/approve`: `{ "reviewed_by": "employee@company.com" }`.
- `POST /email-drafts/:id/modify`: `{ "reviewed_by": "employee@company.com", "subject": "...", "body": "..." }`.
- `POST /email-drafts/:id/reject`: closes without sending.
- `POST /dashboard/email-draft-status`: workflow state synchronization.
- `GET /dashboard/daily-summary?date=YYYY-MM-DD`, `GET /dashboard/daily-summary/:date`, `GET /dashboard/daily-summary/history`.
- `POST /dashboard/daily-summary`: validated summary and delivery statistics upsert.

All SQL inputs are parameterized. Approval validates draft state and only resumes a URL stored for that draft whose origin matches `N8N_BASE_URL`.

## Configuration

Copy `.env.example` to an ignored local `.env`; never commit populated secrets.

- PostgreSQL/API: `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `PGPOOL_MAX`, `PORT`.
- n8n: `N8N_BASE_URL`, `N8N_PORT`, `GENERIC_TIMEZONE=Asia/Ho_Chi_Minh`, `REPLY_HIGH_CONFIDENCE_THRESHOLD`.
- AI: `GEMINI_API_KEY` (used by Gemini HTTP nodes; allow n8n environment access as configured in Compose).
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SENDER`. Create an n8n SMTP credential named `SMTP account` with the corresponding values; the workflow JSON contains no password.
- PostgreSQL n8n credential: create a credential named `Postgres account` for the project database. The current n8n instance does not have this credential yet.
- Optional telemetry: `OBSERVE_APP_KEY`, `OBSERVE_APP_SECRET`; Observe is disabled unless both are set.
- Frontend: `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:4000/api/v1`).

Executive and operations recipient addresses are managed in PostgreSQL, not `.env`:

```sql
INSERT INTO daily_digest_recipients (recipient_email, recipient_type)
VALUES ('<configured-executive-address>', 'EXECUTIVE'),
       ('<configured-operations-lead-address>', 'OPERATIONS');
```

Replace both placeholders with addresses approved by the organization. No email is sent until recipients and SMTP credentials are configured.

## Run and Import

From the project root, start infrastructure with `docker compose --env-file .env -f docker/docker-compose.yml up -d`. The compose file retains PostgreSQL 5432 and n8n 5678. Existing database volumes do not rerun Docker's init hook; apply additive migrations with `docker exec -i enterprise_db psql -v ON_ERROR_STOP=1 -U "$PGUSER" -d "$PGDATABASE" < database/init.sql` after loading local `.env`.

Copy the root `.env` to `backend/.env` (or create `backend/.env` from the required keys); the Nest entrypoint loads this file automatically before importing modules. Run the API from `backend/` with `npm run start:dev` on port 4000. A missing/empty `PGPASSWORD` now fails startup with a clear error instead of producing database 500 responses. Run the UI from `frontend/` with `npm run dev`. Production builds: `npm run build` in each folder.

In n8n, use **Import from File** for `workflows/member-2/workflow-3-reply-rag.json` and `workflow-4-digest.json`. Assign the PostgreSQL and SMTP credentials after import. Activate workflow 4 to enable its 18:00 schedule; keep workflow 3 active for webhook intake. Workflow JSON is inactive by default on import.

## Manual Tests

Test workflow 3 after configuring PostgreSQL and Gemini:

```bash
curl -X POST http://localhost:5678/webhook/email-reply \
  -H 'Content-Type: application/json' \
  -d '{"ticket_code":"TICK-2026-TEST001","sender_email":"customer@example.com","sender_name":"Nguyen Van A","subject":"Chính sách hoàn tiền","body":"Tôi muốn hỏi chính sách hoàn tiền của công ty.","received_at":"2026-10-02T10:00:00+07:00","message_id":"TEST-MSG-001"}'
```

Inspect the real draft at `/approvals`, enter an authorized reviewer email, then approve or modify. The workflow remains paused until the approval action; without SMTP credentials the send step fails and is audited, not reported as sent.

For workflow 4, use **Execute Workflow** in n8n; it runs the same workflow manually without changing the production 18:00 schedule. Check `/digest` and the `daily_summaries`/`system_audit_logs` tables. The live environment currently has no Executive/Operations recipients, Gemini key, SMTP credentials, or n8n PostgreSQL credential, so AI generation and outbound delivery cannot be end-to-end verified until configured.

## Troubleshooting

- Empty `/approvals`: check webhook execution and `email_drafts`; the frontend never creates drafts.
- Approval unavailable: verify notification saved a per-execution `resume_url` and that its origin matches `N8N_BASE_URL`.
- `WORKFLOW_3_ERROR`: inspect payload/node in `system_audit_logs`; malformed AI JSON, invalid approval, DB failure, or SMTP failure are routed there.
- No digest recipients: add active rows to `daily_digest_recipients`; the workflow does not invent addresses.
- No incident classification: fewer than three observed baseline days intentionally means no spike assertion.
- Daily report missing: inspect `WORKFLOW_4_ERROR`, n8n PostgreSQL credential, NestJS availability, and `daily_summaries`.
