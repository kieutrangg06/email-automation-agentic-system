import { Controller, Post, Get, Body, Sse, MessageEvent } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'admin',
  password: 'SecretPassword123!',
  database: 'email_automation_db',
});

@Controller('api/v1/crm')
export class CrmController {
  private static crmNotification$ = new Subject<any>();

  // 1. Frontend gọi khi tải trang hoặc F5: Lấy toàn bộ Lead đã lưu trong DB
  @Get('leads')
  async getAllLeads() {
    try {
      const res = await pool.query('SELECT * FROM crm_leads ORDER BY id DESC');
      return { success: true, data: res.rows };
    } catch (err: any) {
      console.error('[DB ERROR] Lỗi lấy danh sách leads:', err.message);
      return { success: false, data: [] };
    }
  }

  // 2. n8n Luồng 5 bắn vào sau khi trích xuất AI: Lưu DB và phát SSE
  @Post('leads')
  async createLead(@Body() body: any) {
    console.log('[BACKEND CRM] Nhận Lead từ n8n:', body);

    try {
      const leadName = body.lead_name || body.name || 'Khách Hàng Mới';
      const email = body.email || body.sender_email || 'chua_co_email@example.com';
      const phone = body.phone || body.phone_number || '';
      const company = body.company || body.organization || 'Doanh Nghiệp Tư Nhân';
      const intent = body.intent || body.inquiry_topic || 'Quan tâm giải pháp phần mềm';
      const leadScore = Number(body.lead_score || body.score || 75);
      const sentiment = body.sentiment || 'POSITIVE';
      const status = body.status || 'NEW';

      const result = await pool.query(
        `INSERT INTO crm_leads (lead_name, email, phone, company, intent, lead_score, sentiment, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [leadName, email, phone, company, intent, leadScore, sentiment, status]
      );

      const savedLead = result.rows[0];

      // Phát SSE
      CrmController.crmNotification$.next({
        type: 'NEW_LEAD',
        title: '🎯 Khách Hàng Tiềm Năng Mới',
        message: `${leadName} (${company})`,
        data: savedLead,
      });

      // BẮT BUỘC RETURN JSON ĐỂ N8N DỪNG XOAY
      return {
        success: true,
        message: 'Lead created successfully',
        data: savedLead,
      };
    } catch (err: any) {
      console.error('[DB ERROR]:', err.message);
      return {
        success: false,
        error: err.message,
      };
    }
  }

  @Post('notifications')
  async handleNotification(@Body() body: any) {
    return this.createLead(body);
  }

  // 4. Kênh SSE riêng cho CRM Leads
  @Sse('stream')
  streamCrmNotifications(): Observable<MessageEvent> {
    return CrmController.crmNotification$.asObservable().pipe(
      map((payload) => ({
        data: payload,
      } as MessageEvent)),
    );
  }
}