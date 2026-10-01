import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { TriageWebhookDto } from './dto/triage-webhook.dto';

@Injectable()
export class TicketsService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'admin',
      password: process.env.DB_PASSWORD || 'SecretPassword123!',
      database: process.env.DB_NAME || 'email_automation_db',
    });
  }

  async getDepartments() {
    const res = await this.pool.query('SELECT name, description, head_email FROM departments ORDER BY id ASC;');
    return res.rows;
  }

  async recordTriageEvent(dto: TriageWebhookDto) {
    const res = await this.pool.query(
      `INSERT INTO email_triage_logs 
       (sender_email, sender_name, subject, body_snippet, category, priority, sentiment, urgency_reason, sla_deadline, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING') RETURNING *;`,
      [
        dto.sender_email,
        dto.sender_name || dto.sender_email.split('@')[0],
        dto.subject,
        dto.body_snippet || '',
        dto.category,
        dto.priority,
        dto.sentiment,
        dto.urgency_reason || 'Phân loại tự động qua AI Agent',
        dto.sla_deadline ? new Date(dto.sla_deadline) : null,
      ]
    );

    await this.pool.query(
      `INSERT INTO system_audit_logs (event_type, payload) VALUES ($1, $2);`,
      ['EMAIL_TRIAGED_CALLBACK', JSON.stringify(dto)]
    );

    return { status: 'success', data: res.rows[0] };
  }

  async getRecentLogs(category?: string, priority?: string) {
    let query = 'SELECT * FROM email_triage_logs WHERE 1=1';
    const params: any[] = [];

    if (category && category !== 'All') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    if (priority && priority !== 'All') {
      params.push(`%${priority}%`);
      query += ` AND priority ILIKE $${params.length}`;
    }

    query += ' ORDER BY created_at DESC LIMIT 100;';
    const res = await this.pool.query(query, params);
    return res.rows;
  }

  async getStats() {
    const totalRes = await this.pool.query('SELECT COUNT(*) FROM email_triage_logs;');
    const p1Res = await this.pool.query("SELECT COUNT(*) FROM email_triage_logs WHERE priority ILIKE '%P1%';");
    const techRes = await this.pool.query("SELECT COUNT(*) FROM email_triage_logs WHERE category = 'Technical';");
    const pendingRes = await this.pool.query("SELECT COUNT(*) FROM email_triage_logs WHERE status = 'PENDING';");

    return {
      total: parseInt(totalRes.rows[0].count, 10),
      p1Count: parseInt(p1Res.rows[0].count, 10),
      techCount: parseInt(techRes.rows[0].count, 10),
      pendingCount: parseInt(pendingRes.rows[0].count, 10),
    };
  }

  async updateStatus(id: number, status: string) {
    const res = await this.pool.query(
      'UPDATE email_triage_logs SET status = $1 WHERE id = $2 RETURNING *;',
      [status, id]
    );
    return res.rows[0];
  }
}
