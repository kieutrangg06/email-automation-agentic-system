-- 1. Bảng phòng ban
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    head_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO email_senders_reputation (email, status, notes) VALUES
('spammer@evil.com', 'blacklist', 'Máy chủ phát tán mã độc lừa đảo tiền số'),
('no-reply-marketing@bulkmailer.biz', 'blacklist', 'Hệ thống gửi email rác hàng loạt')
ON CONFLICT (email) DO NOTHING;

-- 3. Bảng chuyên viên hỗ trợ (Support Agents) phục vụ Luồng 2
CREATE TABLE IF NOT EXISTS support_agents (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'AVAILABLE', -- AVAILABLE, BUSY, OFFLINE
    active_tickets_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO support_agents (name, email, category, status, active_tickets_count) VALUES
('Nguyễn Văn An', 'tranglee12306@gmail.com', 'Technical', 'AVAILABLE', 1),
('Trần Hoàng Bách', 'tranglee12306@gmail.com', 'Technical', 'AVAILABLE', 0),
('Lê Thị Mai', 'tranglee12306@gmail.com', 'Sales', 'AVAILABLE', 0),
('Phạm Đức Trọng', 'tranglee12306@gmail.com', 'Finance', 'AVAILABLE', 0),
('Đỗ Thúy Vy', 'tranglee12306@gmail.com', 'General', 'AVAILABLE', 0)
ON CONFLICT (email) DO NOTHING;

-- 4. Bảng lưu trữ Triage Logs (Luồng 1)
CREATE TABLE IF NOT EXISTS email_triage_logs (
    id SERIAL PRIMARY KEY,
    sender_email VARCHAR(255) NOT NULL,
    sender_name VARCHAR(100),
    subject TEXT NOT NULL,
    body_snippet TEXT,
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL,
    sentiment VARCHAR(50) NOT NULL,
    urgency_reason TEXT,
    sla_deadline TIMESTAMP WITH TIME ZONE,
    status VARCHAR(30) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Bảng Tickets chính thức (Luồng 2)
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    ticket_code VARCHAR(50) UNIQUE NOT NULL,
    sender_email VARCHAR(255) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    summary TEXT,
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL,
    assigned_to VARCHAR(100) NOT NULL,
    agent_email VARCHAR(255),
    first_response_sla TIMESTAMP WITH TIME ZONE,
    status VARCHAR(30) DEFAULT 'OPEN', -- OPEN, IN_PROGRESS, RESOLVED, CLOSED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 6. Bảng Audit Logs hệ thống
CREATE TABLE IF NOT EXISTS system_audit_logs (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50) DEFAULT 'n8n-workflow',
    event_type VARCHAR(50) NOT NULL,
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chỉ mục tối ưu truy vấn
CREATE INDEX IF NOT EXISTS idx_triage_status ON email_triage_logs(status);
CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(ticket_code);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);