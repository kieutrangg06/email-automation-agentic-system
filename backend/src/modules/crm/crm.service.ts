import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateLeadDto, CreateInvoiceDto } from './dto/create-lead.dto';

@Injectable()
export class CrmService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'admin',
      password: process.env.DB_PASSWORD || 'SecretPassword123!',
      database: process.env.DB_NAME || 'email_automation_db',
    });
  }

  // Luồng 5: Lấy danh sách leads / customers
  async getCustomers() {
    const res = await this.pool.query(
      'SELECT * FROM crm_customers ORDER BY created_at DESC;'
    );
    return res.rows;
  }

  // Luồng 5: Nhận webhook tạo deal từ n8n (Node 11)
  async handleLeadWebhook(dto: CreateLeadDto) {
    const res = await this.pool.query(
      `UPDATE crm_customers 
       SET lead_score = $1, company = COALESCE($2, company), status = 'DEAL_CREATED'
       WHERE email = $3 RETURNING *;`,
      [dto.leadScore, dto.company, dto.email]
    );
    return { success: true, lead: res.rows[0] };
  }

  // Luồng 6: Lấy danh sách hóa đơn
  async getInvoices() {
    const res = await this.pool.query(
      'SELECT * FROM finance_invoices ORDER BY created_at DESC;'
    );
    return res.rows;
  }

  // Luồng 6: Nhận webhook lưu hóa đơn từ n8n (Node 14)
  async handleInvoiceWebhook(dto: CreateInvoiceDto) {
    const res = await this.pool.query(
      `INSERT INTO finance_invoices (invoice_number, vendor_name, tax_code, subtotal, vat_amount, total_amount, is_valid)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (invoice_number) DO UPDATE 
       SET total_amount = EXCLUDED.total_amount
       RETURNING *;`,
      [
        dto.invoice_number,
        dto.vendor_name,
        dto.tax_code,
        dto.subtotal,
        dto.vat_amount,
        dto.total_amount,
        dto.is_valid ?? true,
      ]
    );
    return { success: true, invoice: res.rows[0] };
  }
}