-- 1. Bảng phòng ban (Đã có sẵn head_email chỉ định về tranglee12306@gmail.com)
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    head_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO departments (name, description, head_email) VALUES
('Technical', 'Khắc phục sự cố API, hạ tầng cơ sở dữ liệu, lỗi phân quyền hệ thống', 'tranglee12306@gmail.com'),
('Sales', 'Tiếp nhận yêu cầu báo giá, tư vấn bản quyền phần mềm, hợp đồng triển khai', 'tranglee12306@gmail.com'),
('Finance', 'Tiếp nhận đối soát sao kê, xuất hóa đơn điện tử VAT, thanh toán đối tác', 'tranglee12306@gmail.com'),
('General', 'Hỗ trợ giải đáp chung, điều phối lịch làm việc & hỗ trợ khách hàng', 'tranglee12306@gmail.com')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, head_email = EXCLUDED.head_email;

-- 2. Bảng quản lý danh tiếng người gửi (Blacklist)
CREATE TABLE IF NOT EXISTS email_senders_reputation (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'neutral',
    notes TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO email_senders_reputation (email, status, notes) VALUES
('spammer@evil.com', 'blacklist', 'Máy chủ phát tán mã độc lừa đảo tiền số'),
('no-reply-marketing@bulkmailer.biz', 'blacklist', 'Hệ thống gửi email rác hàng loạt')
ON CONFLICT (email) DO NOTHING;

-- 3. Bảng lưu trữ Triage Logs
CREATE TABLE IF NOT EXISTS email_triage_logs (
    id SERIAL PRIMARY KEY,
    sender_email VARCHAR(255) NOT NULL,
    sender_name VARCHAR(100),
    subject TEXT NOT NULL,
    body_snippet TEXT,
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL,
    sentiment VARCHAR(20) NOT NULL,
    urgency_reason TEXT,
    sla_deadline TIMESTAMP,
    status VARCHAR(30) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bảng Audit Logs hệ thống
CREATE TABLE IF NOT EXISTS system_audit_logs (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50) DEFAULT 'n8n-workflow-1',
    event_type VARCHAR(50) NOT NULL,
    payload JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
