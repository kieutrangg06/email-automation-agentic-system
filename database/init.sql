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

CREATE TABLE IF NOT EXISTS support_agents (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
    active_tickets_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    ticket_code VARCHAR(80) NOT NULL UNIQUE,
    sender_email VARCHAR(255) NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    category VARCHAR(50) NOT NULL DEFAULT 'General',
    priority VARCHAR(50) NOT NULL DEFAULT 'P3 - Medium',
    assigned_to VARCHAR(150),
    agent_email VARCHAR(255),
    first_response_sla TIMESTAMP,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS summary TEXT NOT NULL DEFAULT '';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS agent_email VARCHAR(255);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS knowledge_base (
    id SERIAL PRIMARY KEY,
    topic VARCHAR(255) NOT NULL,
    keywords TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS email_drafts (
    id SERIAL PRIMARY KEY,
    ticket_code VARCHAR(80),
    recipient_email VARCHAR(255) NOT NULL,
    sender_name VARCHAR(150),
    original_subject TEXT NOT NULL DEFAULT '',
    original_body TEXT NOT NULL DEFAULT '',
    proposed_subject TEXT NOT NULL,
    proposed_body TEXT NOT NULL,
    confidence_score SMALLINT NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_APPROVAL',
    reviewed_by VARCHAR(255),
    knowledge_context JSONB NOT NULL DEFAULT '[]'::jsonb,
    approval_resume_url TEXT,
    n8n_execution_id VARCHAR(100),
    received_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    sent_at TIMESTAMP
);

ALTER TABLE email_drafts ADD COLUMN IF NOT EXISTS sender_name VARCHAR(150);
ALTER TABLE email_drafts ADD COLUMN IF NOT EXISTS original_subject TEXT NOT NULL DEFAULT '';
ALTER TABLE email_drafts ADD COLUMN IF NOT EXISTS original_body TEXT NOT NULL DEFAULT '';
ALTER TABLE email_drafts ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(255);
ALTER TABLE email_drafts ADD COLUMN IF NOT EXISTS knowledge_context JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE email_drafts ADD COLUMN IF NOT EXISTS approval_resume_url TEXT;
ALTER TABLE email_drafts ADD COLUMN IF NOT EXISTS n8n_execution_id VARCHAR(100);
ALTER TABLE email_drafts ADD COLUMN IF NOT EXISTS received_at TIMESTAMP;
ALTER TABLE email_drafts ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
ALTER TABLE email_drafts ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS daily_summaries (
    id SERIAL PRIMARY KEY,
    summary_date DATE NOT NULL UNIQUE,
    total_received INTEGER NOT NULL DEFAULT 0,
    total_pending_tickets INTEGER NOT NULL DEFAULT 0,
    total_p1 INTEGER NOT NULL DEFAULT 0,
    negative_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
    categories JSONB NOT NULL DEFAULT '{}'::jsonb,
    priorities JSONB NOT NULL DEFAULT '{}'::jsonb,
    key_insights TEXT NOT NULL DEFAULT '[]',
    risk_summary TEXT NOT NULL DEFAULT '',
    recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
    markdown_digest TEXT NOT NULL DEFAULT '',
    html_digest TEXT NOT NULL DEFAULT '',
    incident_count INTEGER NOT NULL DEFAULT 0,
    baseline_count NUMERIC(12, 2),
    increase_percent NUMERIC(12, 2),
    incident_spike BOOLEAN NOT NULL DEFAULT FALSE,
    recipient_count INTEGER NOT NULL DEFAULT 0,
    sent_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS total_pending_tickets INTEGER NOT NULL DEFAULT 0;
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS negative_issues JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS categories JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS priorities JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS risk_summary TEXT NOT NULL DEFAULT '';
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS recommendations JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS markdown_digest TEXT NOT NULL DEFAULT '';
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS html_digest TEXT NOT NULL DEFAULT '';
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS incident_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS baseline_count NUMERIC(12, 2);
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS increase_percent NUMERIC(12, 2);
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS incident_spike BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS recipient_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS sent_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS failed_count INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_summaries_summary_date ON daily_summaries (summary_date);

CREATE TABLE IF NOT EXISTS daily_digest_recipients (
    id SERIAL PRIMARY KEY,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('EXECUTIVE', 'OPERATIONS')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (recipient_email, recipient_type)
);

CREATE INDEX IF NOT EXISTS idx_email_triage_created_at ON email_triage_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_email_triage_sentiment_priority ON email_triage_logs (sentiment, priority);
CREATE INDEX IF NOT EXISTS idx_tickets_status_created_at ON tickets (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_drafts_status_created_at ON email_drafts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event_created_at ON system_audit_logs (event_type, created_at DESC);
