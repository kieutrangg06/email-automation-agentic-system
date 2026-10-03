import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);
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
    const [totalRes, p1Res, techRes, pendingRes, ticketsRes] = await Promise.all([
      this.pool.query('SELECT COUNT(*) FROM email_triage_logs;'),
      this.pool.query("SELECT COUNT(*) FROM email_triage_logs WHERE priority ILIKE '%P1%';"),
      this.pool.query("SELECT COUNT(*) FROM email_triage_logs WHERE category = 'Technical';"),
      this.pool.query("SELECT COUNT(*) FROM email_triage_logs WHERE status = 'PENDING';"),
      this.pool.query("SELECT COUNT(*) FROM tickets WHERE status = 'OPEN';"),
    ]);

    return {
      total: parseInt(totalRes.rows[0].count, 10),
      p1Count: parseInt(p1Res.rows[0].count, 10),
      techCount: parseInt(techRes.rows[0].count, 10),
      pendingCount: parseInt(pendingRes.rows[0].count, 10),
      openTicketsCount: parseInt(ticketsRes.rows[0].count, 10),
    };
  }

  async updateTriageStatus(id: number, status: string) {
    const res = await this.pool.query(
      'UPDATE email_triage_logs SET status = $1 WHERE id = $2 RETURNING *;',
      [status, id]
    );
    return res.rows[0];
  }

  async createTicket(data: any) {
    const code = data.ticket_code || `TICK-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `INSERT INTO tickets 
         (ticket_code, sender_email, title, description, summary, category, priority, assigned_to, agent_email, first_response_sla, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() + INTERVAL '2 hours', 'OPEN')
         ON CONFLICT (ticket_code) DO NOTHING
         RETURNING *;`,
        [
          code,
          data.sender_email || 'guest@enterprise.com',
          data.title || 'Yêu cầu hỗ trợ',
          data.description || '',
          data.summary || '',
          data.category || 'Technical',
          data.priority || 'P1 - Critical',
          data.assigned_to || 'Nguyễn Văn An',
          data.agent_email || 'an.nguyen@enterprise.vn',
        ]
      );

      // Cập nhật tăng số lượng ticket đang gán cho nhân viên
      if (data.agent_email) {
        await client.query(
          'UPDATE support_agents SET active_tickets_count = active_tickets_count + 1 WHERE email = $1;',
          [data.agent_email]
        );
      }
      await client.query('COMMIT');
      return { status: 'created', ticket: res.rows[0] };
    } catch (e) {
      await client.query('ROLLBACK');
      this.logger.error('Failed to create ticket', e);
      throw e;
    } finally {
      client.release();
    }
  }

  async getAllTickets(status?: string, priority?: string) {
    let query = 'SELECT * FROM tickets WHERE 1=1';
    const params: any[] = [];
    if (status && status !== 'All') {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    if (priority && priority !== 'All') {
      params.push(`%${priority}%`);
      query += ` AND priority ILIKE $${params.length}`;
    }
    query += ' ORDER BY id DESC;';
    const res = await this.pool.query(query, params);
    return res.rows;
  }

  async resolveTicket(code: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        "UPDATE tickets SET status = 'RESOLVED', resolved_at = NOW() WHERE ticket_code = $1 RETURNING *;",
        [code]
      );
      if (res.rows.length > 0 && res.rows[0].agent_email) {
        await client.query(
          'UPDATE support_agents SET active_tickets_count = GREATEST(active_tickets_count - 1, 0) WHERE email = $1;',
          [res.rows[0].agent_email]
        );
      }
      await client.query('COMMIT');
      return res.rows[0];
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}