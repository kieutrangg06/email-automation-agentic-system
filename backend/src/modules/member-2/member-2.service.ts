import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { POSTGRES_POOL } from '../../database/database.module';
import {
  DailySummaryDto,
  DraftStatusSyncDto,
  NotifyDraftDto,
} from './member-2.dto';

const ACTIVE_DRAFT_STATES = ['PENDING_APPROVAL', 'NEEDS_REVIEW'];

@Injectable()
export class Member2Service {
  private readonly logger = new Logger(Member2Service.name);

  constructor(@Inject(POSTGRES_POOL) private readonly pool: Pool) {}

  async getKnowledge(query?: string) {
    if (query?.trim()) {
      const result = await this.pool.query(
        `SELECT id, topic, keywords, content, created_at
         FROM knowledge_base
         WHERE to_tsvector('simple', topic || ' ' || keywords || ' ' || content)
           @@ websearch_to_tsquery('simple', $1)
         ORDER BY ts_rank(to_tsvector('simple', topic || ' ' || keywords || ' ' || content),
           websearch_to_tsquery('simple', $1)) DESC, created_at DESC
         LIMIT 50`,
        [query.trim()],
      );
      return result.rows;
    }

    const result = await this.pool.query(
      'SELECT id, topic, keywords, content, created_at FROM knowledge_base ORDER BY created_at DESC LIMIT 100',
    );
    return result.rows;
  }

  async getDrafts(status?: string) {
    const result = status
      ? await this.pool.query(
          `SELECT id, ticket_code, recipient_email, sender_name, original_subject,
             proposed_subject, confidence_score, status, reviewed_by,
             knowledge_context, approval_resume_url IS NOT NULL AS can_resume,
             created_at, received_at, reviewed_at, sent_at
           FROM email_drafts WHERE status = $1 ORDER BY created_at DESC LIMIT 200`,
          [status],
        )
      : await this.pool.query(
          `SELECT id, ticket_code, recipient_email, sender_name, original_subject,
             proposed_subject, confidence_score, status, reviewed_by,
             knowledge_context, approval_resume_url IS NOT NULL AS can_resume,
             created_at, received_at, reviewed_at, sent_at
           FROM email_drafts ORDER BY created_at DESC LIMIT 200`,
        );
    return result.rows;
  }

  async getDraft(id: number) {
    const result = await this.pool.query(
      `SELECT id, ticket_code, recipient_email, sender_name, original_subject,
         original_body, proposed_subject, proposed_body, confidence_score, status,
         reviewed_by, knowledge_context,
         approval_resume_url IS NOT NULL AS can_resume, created_at, received_at,
         reviewed_at, sent_at
       FROM email_drafts WHERE id = $1 LIMIT 1`,
      [id],
    );
    if (!result.rows[0]) throw new NotFoundException('Email draft not found');
    return result.rows[0];
  }

  async notifyDraft(body: NotifyDraftDto) {
    const draft = await this.getDraft(body.draft_id);
    if (draft.recipient_email !== body.recipient_email) {
      throw new ConflictException('Notification data does not match the draft');
    }
    if (body.resume_url) {
      const resumeUrl = new URL(body.resume_url);
      const n8nUrl = new URL(process.env.N8N_BASE_URL ?? 'http://localhost:5678');
      if (
        resumeUrl.origin !== n8nUrl.origin ||
        !resumeUrl.pathname.startsWith('/webhook-waiting/')
      ) {
        throw new ConflictException('n8n resume URL must use the configured n8n origin');
      }
      await this.pool.query(
        `UPDATE email_drafts SET approval_resume_url = $2, n8n_execution_id = $3
         WHERE id = $1`,
        [body.draft_id, resumeUrl.toString(), body.execution_id ?? null],
      );
    }
    await this.audit('EMAIL_DRAFT_NOTIFICATION', {
      draft_id: draft.id,
      ticket_code: draft.ticket_code,
      recipient_email: draft.recipient_email,
    });
    return { accepted: true, draft_id: draft.id, status: draft.status };
  }

  async submitApproval(
    id: number,
    action: 'APPROVE' | 'MODIFY',
    body: { reviewed_by: string; subject?: string; body?: string },
  ) {
    const result = await this.pool.query(
      `UPDATE email_drafts SET status = 'APPROVAL_REQUESTED', reviewed_by = $2,
         reviewed_at = NOW()
       WHERE id = $1 AND status = ANY($3::varchar[])
       RETURNING id, ticket_code, recipient_email, proposed_subject, proposed_body,
         approval_resume_url`,
      [id, body.reviewed_by, ACTIVE_DRAFT_STATES],
    );
    const draft = result.rows[0];
    if (!draft) {
      const current = await this.getDraft(id);
      throw new ConflictException(`Draft cannot be approved from ${current.status}`);
    }

    const approvalPayload = {
      draft_id: draft.id,
      ticket_code: draft.ticket_code,
      recipient_email: draft.recipient_email,
      action,
      reviewed_by: body.reviewed_by,
      subject: action === 'MODIFY' ? body.subject : draft.proposed_subject,
      body: action === 'MODIFY' ? body.body : draft.proposed_body,
    };

    try {
      if (!draft.approval_resume_url) {
        throw new Error('n8n Wait node resume URL is not registered for this draft');
      }
      const resumeUrl = new URL(draft.approval_resume_url);
      const resumeSuffix = 'email-reply-approval';
      if (!resumeUrl.pathname.endsWith(`/${resumeSuffix}`)) {
        resumeUrl.pathname = `${resumeUrl.pathname.replace(/\/$/, '')}/${resumeSuffix}`;
      }
      const safePath = resumeUrl.pathname.replace(
        /(\/webhook-waiting\/)[^/]+/,
        '$1[redacted]',
      );
      this.logger.log(
        `[approval-resume] POST ${resumeUrl.origin}${safePath}${resumeUrl.search ? '?[redacted]' : ''} ${JSON.stringify({
          draft_id: draft.id,
          action,
          execution_id: draft.n8n_execution_id,
          payload_fields: Object.keys(approvalPayload),
          recipient_domain: draft.recipient_email.split('@')[1] ?? '',
          subject_length: approvalPayload.subject?.length ?? 0,
          body_length: approvalPayload.body?.length ?? 0,
        })}`,
      );
      let response: Response | undefined;
      let lastError: unknown;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
          response = await fetch(resumeUrl.toString(), {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(approvalPayload),
            signal: AbortSignal.timeout(10000),
          });
          if (response.ok) break;
          lastError = new Error(`n8n returned HTTP ${response.status}`);
          if (response.status !== 404 && response.status < 500) break;
        } catch (error) {
          lastError = error;
        }
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
        }
      }
      if (!response?.ok) throw lastError ?? new Error('n8n resume request failed');
      await this.audit('EMAIL_REPLY_APPROVAL_SUBMITTED', {
        draft_id: id,
        action,
        reviewed_by: body.reviewed_by,
      });
      return { accepted: true, draft_id: id, status: 'APPROVAL_REQUESTED' };
    } catch (error) {
      await this.pool.query(
        `UPDATE email_drafts SET status = 'PENDING_APPROVAL', reviewed_by = NULL,
           reviewed_at = NULL WHERE id = $1 AND status = 'APPROVAL_REQUESTED'`,
        [id],
      );
      throw new ServiceUnavailableException(
        `Unable to submit approval to n8n: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  async rejectDraft(id: number, reviewedBy: string) {
    const result = await this.pool.query(
      `UPDATE email_drafts SET status = 'REJECTED', reviewed_by = $2, reviewed_at = NOW()
       WHERE id = $1 AND status = ANY($3::varchar[]) RETURNING id, status`,
      [id, reviewedBy, ACTIVE_DRAFT_STATES],
    );
    if (!result.rows[0]) {
      const current = await this.getDraft(id);
      throw new ConflictException(`Draft cannot be rejected from ${current.status}`);
    }
    await this.audit('EMAIL_DRAFT_REJECTED', { draft_id: id, reviewed_by: reviewedBy });
    return result.rows[0];
  }

  async syncDraftStatus(body: DraftStatusSyncDto) {
    const draft = await this.getDraft(body.draft_id);
    await this.audit('EMAIL_DRAFT_DASHBOARD_SYNCED', {
      draft_id: draft.id,
      status: draft.status,
      workflow_status: body.status,
    });
    return { draft_id: draft.id, status: draft.status };
  }

  async getLatestDailySummary() {
    const result = await this.pool.query(
      'SELECT * FROM daily_summaries ORDER BY summary_date DESC LIMIT 1',
    );
    return result.rows[0] ?? null;
  }

  async getDailySummary(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new ConflictException('Date must use YYYY-MM-DD format');
    }
    const result = await this.pool.query(
      'SELECT * FROM daily_summaries WHERE summary_date = $1::date LIMIT 1',
      [date],
    );
    return result.rows[0] ?? null;
  }

  async getSummaryHistory(limit?: string) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : 30;
    const boundedLimit = Number.isInteger(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 100)
      : 30;
    const result = await this.pool.query(
      'SELECT * FROM daily_summaries ORDER BY summary_date DESC LIMIT $1',
      [boundedLimit],
    );
    return result.rows;
  }

  async saveDailySummary(body: DailySummaryDto) {
    const result = await this.pool.query(
      `INSERT INTO daily_summaries (
         summary_date, total_received, total_p1, total_pending_tickets,
         key_insights, negative_issues, incident_spike, risk_summary,
         recommendations, recipient_count, sent_count, failed_count,
         incident_count, baseline_count, increase_percent
      ) VALUES ($1::date, $2, $3, $4, $5, $6::jsonb, $7, $8, $9::jsonb, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (summary_date) DO UPDATE SET
         total_received = EXCLUDED.total_received,
         total_p1 = EXCLUDED.total_p1,
         total_pending_tickets = EXCLUDED.total_pending_tickets,
         key_insights = EXCLUDED.key_insights,
         negative_issues = EXCLUDED.negative_issues,
         incident_spike = EXCLUDED.incident_spike,
         risk_summary = EXCLUDED.risk_summary,
         recommendations = EXCLUDED.recommendations,
         recipient_count = EXCLUDED.recipient_count,
         sent_count = EXCLUDED.sent_count,
         failed_count = EXCLUDED.failed_count,
         incident_count = EXCLUDED.incident_count,
         baseline_count = EXCLUDED.baseline_count,
         increase_percent = EXCLUDED.increase_percent,
         created_at = NOW()
       RETURNING *`,
      [
        body.summary_date,
        body.total_received,
        body.total_p1 ?? 0,
        body.pending_tickets ?? 0,
        JSON.stringify(body.key_insights ?? []),
        JSON.stringify(body.negative_issues ?? []),
        body.incident_spike ?? false,
        body.risk_summary ?? '',
        JSON.stringify(body.recommendations ?? []),
        body.recipient_count ?? 0,
        body.sent_count ?? 0,
        body.failed_count ?? 0,
        body.incident_count ?? 0,
        body.baseline_count ?? null,
        body.increase_percent ?? null,
      ],
    );
    await this.audit('DAILY_SUMMARY_DASHBOARD_SYNCED', {
      summary_date: body.summary_date,
    });
    return result.rows[0];
  }

  private async audit(eventType: string, payload: Record<string, unknown>) {
    await this.pool.query(
      `INSERT INTO system_audit_logs (source, event_type, payload)
       VALUES ('nestjs-member-2', $1, $2::jsonb)`,
      [eventType, JSON.stringify(payload)],
    );
  }
}