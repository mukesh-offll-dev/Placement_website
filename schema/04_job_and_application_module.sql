-- =====================================================================
-- Task 4: Job and Application Module Schema
-- Tables: jobs, job_applications, application_timeline, notifications
-- Reference: schema/tables.dbml, schema/student_portal1.json & schema/admin_portal.txt
-- Dialect: PostgreSQL (Compatible with Neon Cloud & standard PostgreSQL 14+)
-- =====================================================================

-- 1. Create Enum Types (if not already existing)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_type') THEN
        CREATE TYPE employment_type AS ENUM (
            'FULL_TIME',
            'PART_TIME',
            'INTERNSHIP',
            'CONTRACT'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN
        CREATE TYPE job_status AS ENUM (
            'DRAFT',
            'ACTIVE',
            'CLOSING_SOON',
            'CLOSED'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
        CREATE TYPE application_status AS ENUM (
            'APPLIED',
            'UNDER_REVIEW',
            'SHORTLISTED',
            'REJECTED',
            'SELECTED',
            'WITHDRAWN'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'timeline_status') THEN
        CREATE TYPE timeline_status AS ENUM (
            'DONE',
            'UPCOMING',
            'PENDING',
            'FAILED',
            'SKIPPED'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM (
            'GENERAL',
            'JOB',
            'APPLICATION',
            'PLACEMENT_DRIVE',
            'INTERVIEW',
            'DEADLINE',
            'ANNOUNCEMENT',
            'SYSTEM'
        );
    END IF;
END $$;

-- 2. Create Jobs Table
CREATE TABLE IF NOT EXISTS jobs (
    id                   BIGSERIAL PRIMARY KEY,
    title                VARCHAR(150) NOT NULL,
    description          TEXT NULL,
    company              VARCHAR(150) NOT NULL,
    location             VARCHAR(120) NULL,
    salary               VARCHAR(100) NULL,
    employment_type      VARCHAR(50) NOT NULL DEFAULT 'FULL_TIME',
    skills               TEXT NULL,
    requirements         TEXT NULL,
    number_of_openings   INT NULL,
    application_deadline DATE NOT NULL,
    status               VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    posted_by            BIGINT NULL,
    created_at           TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted           BOOLEAN NOT NULL DEFAULT FALSE,

    -- Constraints
    CONSTRAINT fk_jobs_posted_by FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_jobs_employment_type CHECK (employment_type IN ('FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT')),
    CONSTRAINT chk_jobs_status CHECK (status IN ('DRAFT', 'ACTIVE', 'CLOSING_SOON', 'CLOSED')),
    CONSTRAINT chk_jobs_openings CHECK (number_of_openings IS NULL OR number_of_openings > 0)
);

-- 3. Create Job Applications Table
CREATE TABLE IF NOT EXISTS job_applications (
    id            BIGSERIAL PRIMARY KEY,
    job_id        BIGINT NOT NULL,
    student_id    BIGINT NOT NULL,
    status        VARCHAR(50) NOT NULL DEFAULT 'APPLIED',
    cover_letter  TEXT NULL,
    resume_url    TEXT NULL,
    current_stage VARCHAR(80) NULL,
    reviewed_by   BIGINT NULL,
    remarks       VARCHAR(255) NULL,
    applied_at    TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at    TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT uq_job_applications_job_student UNIQUE (job_id, student_id),
    CONSTRAINT fk_job_applications_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE RESTRICT,
    CONSTRAINT fk_job_applications_student FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_job_applications_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_job_applications_status CHECK (status IN ('APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'REJECTED', 'SELECTED', 'WITHDRAWN'))
);

-- 4. Create Application Timeline Table
CREATE TABLE IF NOT EXISTS application_timeline (
    id             BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL,
    stage          VARCHAR(80) NOT NULL,
    status         VARCHAR(50) NOT NULL,
    remarks        VARCHAR(255) NULL,
    display_order  SMALLINT NOT NULL DEFAULT 1,
    changed_by     BIGINT NULL,
    changed_at     TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT fk_timeline_application FOREIGN KEY (application_id) REFERENCES job_applications(id) ON DELETE CASCADE,
    CONSTRAINT fk_timeline_changed_by FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_timeline_status CHECK (status IN ('DONE', 'UPCOMING', 'PENDING', 'FAILED', 'SKIPPED')),
    CONSTRAINT chk_timeline_order CHECK (display_order > 0)
);

-- 5. Create Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id                BIGSERIAL PRIMARY KEY,
    recipient_id      BIGINT NOT NULL,
    application_id    BIGINT NULL,
    job_id            BIGINT NULL,
    title             VARCHAR(200) NOT NULL,
    message           TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    is_read           BOOLEAN NOT NULL DEFAULT FALSE,
    read_at           TIMESTAMP WITHOUT TIME ZONE NULL,
    created_at        TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT fk_notifications_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_application FOREIGN KEY (application_id) REFERENCES job_applications(id) ON DELETE SET NULL,
    CONSTRAINT fk_notifications_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL,
    CONSTRAINT chk_notifications_type CHECK (notification_type IN ('GENERAL', 'JOB', 'APPLICATION', 'PLACEMENT_DRIVE', 'INTERVIEW', 'DEADLINE', 'ANNOUNCEMENT', 'SYSTEM'))
);

-- 6. Create Indexes
-- Jobs Indexes
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs (company);
CREATE INDEX IF NOT EXISTS idx_jobs_deadline ON jobs (application_deadline);
CREATE INDEX IF NOT EXISTS idx_jobs_employment_type ON jobs (employment_type);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_by ON jobs (posted_by);
CREATE INDEX IF NOT EXISTS idx_jobs_status_deadline ON jobs (status, application_deadline);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs (created_at);

-- Job Applications Indexes
CREATE UNIQUE INDEX IF NOT EXISTS uq_job_applications_job_student ON job_applications (job_id, student_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_student ON job_applications (student_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_job ON job_applications (job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications (status);
CREATE INDEX IF NOT EXISTS idx_job_applications_applied_at ON job_applications (applied_at);
CREATE INDEX IF NOT EXISTS idx_job_applications_student_status ON job_applications (student_id, status);
CREATE INDEX IF NOT EXISTS idx_job_applications_job_status ON job_applications (job_id, status);

-- Application Timeline Indexes
CREATE INDEX IF NOT EXISTS idx_timeline_application ON application_timeline (application_id);
CREATE INDEX IF NOT EXISTS idx_timeline_status ON application_timeline (status);
CREATE INDEX IF NOT EXISTS idx_timeline_changed_at ON application_timeline (changed_at);
CREATE INDEX IF NOT EXISTS idx_timeline_app_order ON application_timeline (application_id, display_order);

-- Notifications Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications (recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read ON notifications (recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_application ON notifications (application_id);
CREATE INDEX IF NOT EXISTS idx_notifications_job ON notifications (job_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications (notification_type);

-- 7. Add Comments
COMMENT ON TABLE jobs IS 'Job postings created by placement cell admins or recruiters';
COMMENT ON COLUMN jobs.title IS 'Designation / job title e.g. Software Engineer';
COMMENT ON COLUMN jobs.company IS 'Hiring company name';
COMMENT ON COLUMN jobs.salary IS 'Compensation package display string e.g. 24 LPA';
COMMENT ON COLUMN jobs.application_deadline IS 'Last date for students to submit applications';

COMMENT ON TABLE job_applications IS 'Student job applications submitted for placement opportunities';
COMMENT ON COLUMN job_applications.job_id IS 'Reference to the job being applied for';
COMMENT ON COLUMN job_applications.student_id IS 'Reference to the student applicant profile';
COMMENT ON COLUMN job_applications.status IS 'Current status: APPLIED, UNDER_REVIEW, SHORTLISTED, REJECTED, SELECTED, WITHDRAWN';

COMMENT ON TABLE application_timeline IS 'History of stages and status updates for a job application';
COMMENT ON COLUMN application_timeline.application_id IS 'Reference to the parent job application';
COMMENT ON COLUMN application_timeline.stage IS 'Label for the recruitment stage e.g. Resume Screened, Technical Interview';
COMMENT ON COLUMN application_timeline.status IS 'Outcome status of stage: DONE, UPCOMING, PENDING, FAILED, SKIPPED';

COMMENT ON TABLE notifications IS 'Notifications delivered to users regarding drives, applications, and system updates';
COMMENT ON COLUMN notifications.recipient_id IS 'User ID of the notification recipient';
COMMENT ON COLUMN notifications.application_id IS 'Optional reference to the related job application';
COMMENT ON COLUMN notifications.job_id IS 'Optional reference to the related job';
