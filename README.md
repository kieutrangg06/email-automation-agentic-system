# Email Automation Agentic System

Project gồm PostgreSQL, NestJS Core API, Next.js App Router và các workflow n8n. Member 2 triển khai AI email reply có human approval cùng báo cáo Daily Inbox Intelligence.

## Chạy local

1. Tạo `.env` từ `.env.example`, cấu hình PostgreSQL và các secret cục bộ.
2. Khởi động PostgreSQL và n8n: `docker compose --env-file .env -f docker/docker-compose.yml up -d`.
3. Đặt cấu hình backend trong `backend/.env`, rồi chạy `npm run start:dev` từ thư mục `backend/` (dotenv tự nạp file này; port 4000).
4. Khởi động UI từ `frontend/`: `npm run dev` (port 3000).
5. Import hai workflow trong `workflows/member-2/` vào n8n (port 5678), sau đó gán credentials và cấu hình recipient.

Chi tiết schema, API contract, credentials, test webhook/approval và vận hành schedule: [docs/member-2-reply-rag-digest.md](docs/member-2-reply-rag-digest.md).
