import { Controller, Post, Get, Body, Sse, MessageEvent } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Pool } from 'pg';

// Kết nối trực tiếp vào container PostgreSQL (enterprise_db)
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'admin',
  password: 'SecretPassword123!',
  database: 'email_automation_db',
});

@Controller('api/v1')
export class AccountingController {
  private static notification$ = new Subject<any>();

  // 1. Frontend gọi khi tải trang hoặc F5: Đọc toàn bộ hóa đơn từ PostgreSQL
  @Get('invoices')
  async getAllInvoices() {
    try {
      const res = await pool.query('SELECT * FROM invoices ORDER BY id DESC');
      return { success: true, data: res.rows };
    } catch (err) {
      console.error('[DB ERROR] Lỗi query invoices:', err);
      return { success: false, data: [] };
    }
  }

  // 2. Nhận HÓA ĐƠN HỢP LỆ từ n8n -> INSERT vào DB và phát SSE XANH
  @Post('accounting/invoices')
  async syncInvoice(@Body() body: any) {
    const invNumber = body.invoice_number || `INV-${Math.floor(100000 + Math.random() * 900000)}`;
    const issueDate = body.issue_date || new Date().toISOString().split('T')[0];
    const seller = body.sender_name || body.seller_name || 'Công Ty Đại Dương';
    const total = Number(body.total_amount || 0);
    const subtotal = Number(body.subtotal || Math.round(total / 1.1));
    const vat = Number(body.vat_amount || Math.round(total - subtotal));

    try {
      const result = await pool.query(
        `INSERT INTO invoices (invoice_number, issue_date, seller_name, subtotal, vat_amount, total_amount, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'VALID')
         ON CONFLICT (invoice_number) DO UPDATE SET total_amount = EXCLUDED.total_amount
         RETURNING *`,
        [invNumber, issueDate, seller, subtotal, vat, total]
      );
      const savedRecord = result.rows[0];

      // Bắn tín hiệu SSE cho Next.js
      AccountingController.notification$.next({
        type: 'SUCCESS',
        title: 'Hóa đơn mới hợp lệ',
        message: `HĐ #${invNumber} đã lưu vào CSDL PostgreSQL.`,
        ...savedRecord,
      });

      return { success: true, data: savedRecord };
    } catch (err: any) {
  console.error('[DB ERROR] Lưu hóa đơn thất bại:', err);
  return { success: false, error: err.message };
}
  }

  // 3. Nhận CẢNH BÁO SAI LỆCH từ n8n -> INSERT dạng SUSPICIOUS và phát SSE ĐỎ
  @Post('accounting/alerts')
  async receiveAlert(@Body() body: any) {
    const invNumber = body.invoice_number || `INV-${Math.floor(100000 + Math.random() * 900000)}`;
    const issueDate = new Date().toISOString().split('T')[0];
    const seller = body.sender_name || 'Doanh Nghiệp Kê Khống Tiền';
    const total = Number(body.total_amount || 120000000);
    const subtotal = Number(body.subtotal || 85000000);
    const vat = Number(body.vat_amount || 8500000);

    try {
      const result = await pool.query(
        `INSERT INTO invoices (invoice_number, issue_date, seller_name, subtotal, vat_amount, total_amount, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'SUSPICIOUS')
         ON CONFLICT (invoice_number) DO UPDATE SET status = 'SUSPICIOUS'
         RETURNING *`,
        [invNumber, issueDate, seller, subtotal, vat, total]
      );
      const savedRecord = result.rows[0];

      AccountingController.notification$.next({
        type: 'WARNING',
        title: 'Cảnh báo sai lệch số liệu',
        message: `HĐ #${invNumber} phát hiện lệch ${Number(body.discrepancy || 26500000).toLocaleString('vi-VN')} VNĐ!`,
        details: savedRecord,
      });

      return { success: true, data: savedRecord };
    } catch (err: any) {
  console.error('[DB ERROR] Lưu cảnh báo thất bại:', err);
  return { success: false, error: err.message };
}
  }

  // 4. Kênh SSE Real-time
  @Sse('accounting/stream')
  streamNotifications(): Observable<MessageEvent> {
    return AccountingController.notification$.asObservable().pipe(
      map((payload) => ({
        data: payload,
      } as MessageEvent)),
    );
  }
}