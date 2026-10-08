-- Digital Evidence Management System Database Schema
-- Run this file to initialize the PostgreSQL database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if reinitializing
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS chain_of_custody CASCADE;
DROP TABLE IF EXISTS evidence CASCADE;
DROP TABLE IF EXISTS cases CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'investigator')),
    full_name VARCHAR(100) NOT NULL,
    badge_number VARCHAR(50),
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Cases table
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'active', 'closed', 'archived')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Evidence table
CREATE TABLE evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
    evidence_number VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    sha256_hash VARCHAR(64) NOT NULL,
    mime_type VARCHAR(100),
    status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'under_review', 'tampered', 'archived')),
    tags VARCHAR(500),
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chain of custody table
CREATE TABLE chain_of_custody (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_id UUID NOT NULL REFERENCES evidence(id) ON DELETE RESTRICT,
    action VARCHAR(50) NOT NULL CHECK (action IN ('upload', 'view', 'download', 'verify', 'update', 'archive', 'tamper_detected')),
    performed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT,
    notes TEXT,
    hash_at_time VARCHAR(64)
);

-- Audit logs table (system-wide)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failure', 'warning')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_evidence_case_id ON evidence(case_id);
CREATE INDEX idx_evidence_uploaded_by ON evidence(uploaded_by);
CREATE INDEX idx_custody_evidence_id ON chain_of_custody(evidence_id);
CREATE INDEX idx_custody_performed_by ON chain_of_custody(performed_by);
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);
CREATE INDEX idx_cases_created_by ON cases(created_by);
CREATE INDEX idx_cases_status ON cases(status);

-- Default admin user (password: Admin@123)
INSERT INTO users (username, email, password_hash, role, full_name, badge_number, department)
VALUES (
    'admin',
    'admin@dems.gov',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/oTmMHIBKC',
    'admin',
    'System Administrator',
    'ADM-001',
    'Digital Forensics'
);

-- Default investigator user (password: Invest@123)
INSERT INTO users (username, email, password_hash, role, full_name, badge_number, department)
VALUES (
    'investigator1',
    'investigator1@dems.gov',
    '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uMutNYKJK',
    'investigator',
    'John Detective',
    'INV-042',
    'Cybercrime Unit'
);

-- Sample case
INSERT INTO cases (case_number, title, description, status, priority, created_by)
SELECT
    'CASE-2024-001',
    'Corporate Data Breach Investigation',
    'Investigation into unauthorized access to financial records in Q3 2024. Multiple systems compromised.',
    'active',
    'high',
    id
FROM users WHERE username = 'admin';

COMMENT ON TABLE users IS 'System users with role-based access control';
COMMENT ON TABLE cases IS 'Investigation cases that group related evidence';
COMMENT ON TABLE evidence IS 'Digital evidence files with integrity hashes';
COMMENT ON TABLE chain_of_custody IS 'Complete access history for each piece of evidence';
COMMENT ON TABLE audit_logs IS 'System-wide audit trail for all actions';
