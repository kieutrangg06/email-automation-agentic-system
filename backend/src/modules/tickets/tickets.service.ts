import { Injectable } from "@nestjs/common";
import { Pool } from "pg";

@Injectable()
export class TicketsService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: "127.0.0.1",
      port: 5432,
      user: "admin",
      password: "SecretPassword123!",
      database: "email_automation_db",
    });
  }

  async getDepartments() {
    const res = await this.pool.query("SELECT name, description, head_email FROM departments ORDER BY id ASC;");
    return res.rows;
  }

  async getRecentLogs() {
    const res = await this.pool.query("SELECT * FROM email_triage_logs ORDER BY created_at DESC LIMIT 100;");
    return res.rows;
  }

  async getStats() {
    const totalRes = await this.pool.query("SELECT COUNT(*) FROM email_triage_logs;");
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

  async createTicket(data: any) {
    const code = data.ticket_code || `TICK-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const res = await this.pool.query(
      `INSERT INTO tickets 
       (ticket_code, sender_email, title, description, summary, category, priority, assigned_to, agent_email, first_response_sla, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() + INTERVAL '2 hours', 'OPEN')
       ON CONFLICT (ticket_code) DO NOTHING
       RETURNING *;`,
      [
        code,
        data.sender_email || "guest@enterprise.com",
        data.title || "Yêu cầu hỗ trợ",
        data.description || "",
        data.summary || "",
        data.category || "Technical",
        data.priority || "P1 - Critical",
        data.assigned_to || "Nguyễn Văn An (Kỹ thuật)",
        data.agent_email || "an.nguyen@enterprise.vn",
      ]
    );
    return { status: "created", ticket: res.rows[0] };
  }

  async getAllTickets(status?: string, priority?: string) {
    let query = "SELECT * FROM tickets WHERE 1=1";
    const params: any[] = [];
    if (status && status !== "All") {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    if (priority && priority !== "All") {
      params.push(`%${priority}%`);
      query += ` AND priority ILIKE $${params.length}`;
    }
    query += " ORDER BY id DESC;";
    const res = await this.pool.query(query, params);
    return res.rows;
  }

  async resolveTicket(code: string) {
    const res = await this.pool.query("UPDATE tickets SET status = 'RESOLVED' WHERE ticket_code = $1 RETURNING *;", [code]);
    return res.rows[0];
  }
}
