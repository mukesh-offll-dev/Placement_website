-- =====================================================================
-- Task 1: Identity & Access - Users Table Schema
-- Reference: schema/tables.dbml & schema/admin_portal.txt
-- Dialect: PostgreSQL (Compatible with Neon Cloud & standard PostgreSQL 14+)
-- =====================================================================

-- 1. Create Enum Types (if not already existing)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM (
            'STUDENT',
            'PLACEMENT_OFFICER',
            'ADMIN',
            'RECRUITER'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
        CREATE TYPE account_status AS ENUM (
            'PENDING',
            'ACTIVE',
            'INACTIVE',
            'SUSPENDED'
        );
    END IF;
END $$;

-- 2. Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id                  BIGSERIAL PRIMARY KEY,
    email               VARCHAR(150) NOT NULL,
    password_hash       VARCHAR(255) NOT NULL,
    role                VARCHAR(50) NOT NULL,
    account_status      VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    is_email_verified   BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at       TIMESTAMP WITHOUT TIME ZONE NULL,
    created_at          TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,

    -- Constraints
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT chk_users_role CHECK (role IN ('STUDENT', 'PLACEMENT_OFFICER', 'ADMIN', 'RECRUITER')),
    CONSTRAINT chk_users_account_status CHECK (account_status IN ('PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED'))
);

-- 3. Create Indexes as specified in schema/tables.dbml
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users (account_status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at);
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users (role, is_active);

-- 4. Add Documentation Comments
COMMENT ON TABLE users IS 'Single login table for all actors. Role decides which profile table holds the details.';
COMMENT ON COLUMN users.id IS 'Primary key, auto-incrementing unique identifier';
COMMENT ON COLUMN users.email IS 'Login identifier and communication email, must be unique';
COMMENT ON COLUMN users.password_hash IS 'BCrypt hash, never plain text';
COMMENT ON COLUMN users.role IS 'User role: STUDENT, PLACEMENT_OFFICER, ADMIN, RECRUITER';
COMMENT ON COLUMN users.account_status IS 'Account status: PENDING, ACTIVE, INACTIVE, SUSPENDED';
COMMENT ON COLUMN users.is_active IS 'Flag indicating if the account is active for login';
COMMENT ON COLUMN users.is_email_verified IS 'Flag indicating if the user has verified their email address';
COMMENT ON COLUMN users.last_login_at IS 'Timestamp of the user''s most recent successful login';
COMMENT ON COLUMN users.created_at IS 'Timestamp when the account was registered';
COMMENT ON COLUMN users.updated_at IS 'Timestamp when the account was last updated';
COMMENT ON COLUMN users.is_deleted IS 'Soft delete flag (true if account is deleted)';
