-- =====================================================================
-- Placement Management System - Complete PostgreSQL Schema (Production / Neon Cloud)
-- Reference: schema/tables.dbml
-- Dialect: PostgreSQL 14+
-- Contains: 24 Tables, Primary Keys, Foreign Keys, NOT NULL constraints, Indexes, Constraints
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ENUM TYPES
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('STUDENT', 'PLACEMENT_OFFICER', 'ADMIN', 'RECRUITER');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
        CREATE TYPE account_status AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'placement_status') THEN
        CREATE TYPE placement_status AS ENUM ('PENDING', 'ACTIVE', 'PLACED', 'BLOCKED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
        CREATE TYPE document_type AS ENUM ('RESUME', 'MARKSHEET', 'CERTIFICATE', 'ID_PROOF', 'OTHER');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
        CREATE TYPE verification_status AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'experience_type') THEN
        CREATE TYPE experience_type AS ENUM ('INTERNSHIP', 'FULL_TIME', 'PART_TIME', 'FREELANCE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_type') THEN
        CREATE TYPE job_type AS ENUM ('FULL_TIME', 'INTERNSHIP', 'PART_TIME', 'CONTRACT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN
        CREATE TYPE job_status AS ENUM ('DRAFT', 'ACTIVE', 'CLOSING_SOON', 'CLOSED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_mode') THEN
        CREATE TYPE delivery_mode AS ENUM ('ONLINE', 'OFFLINE', 'HYBRID');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'drive_status') THEN
        CREATE TYPE drive_status AS ENUM ('SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
        CREATE TYPE application_status AS ENUM ('APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'REJECTED', 'SELECTED', 'WITHDRAWN');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'timeline_status') THEN
        CREATE TYPE timeline_status AS ENUM ('DONE', 'UPCOMING', 'PENDING', 'FAILED', 'SKIPPED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM ('GENERAL', 'JOB', 'PLACEMENT_DRIVE', 'INTERVIEW', 'DEADLINE', 'ANNOUNCEMENT', 'SYSTEM');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_priority') THEN
        CREATE TYPE notification_priority AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_audience') THEN
        CREATE TYPE notification_audience AS ENUM ('ALL', 'STUDENTS', 'PLACEMENT_OFFICERS', 'RECRUITERS', 'SPECIFIC_USERS');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_status') THEN
        CREATE TYPE notification_status AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'EXPIRED', 'ARCHIVED');
    END IF;
END $$;


-- ---------------------------------------------------------------------
-- DOMAIN 1: IDENTITY & ACCESS
-- ---------------------------------------------------------------------

-- 1. Users
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

    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT chk_users_role CHECK (role IN ('STUDENT', 'PLACEMENT_OFFICER', 'ADMIN', 'RECRUITER')),
    CONSTRAINT chk_users_account_status CHECK (account_status IN ('PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users (account_status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at);
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users (role, is_active);

-- 2. Admin Profiles
CREATE TABLE IF NOT EXISTS admin_profiles (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL,
    name                VARCHAR(120) NOT NULL,
    designation         VARCHAR(60) NOT NULL,
    department          VARCHAR(100) NULL,
    contact_email       VARCHAR(150) NULL,
    avatar              VARCHAR(255) NULL,
    created_at          TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_admin_profiles_user UNIQUE (user_id),
    CONSTRAINT fk_admin_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_profiles_user ON admin_profiles (user_id);


-- ---------------------------------------------------------------------
-- DOMAIN 2: COMPANIES & EMPLOYERS
-- ---------------------------------------------------------------------

-- 3. Companies
CREATE TABLE IF NOT EXISTS companies (
    id                  BIGSERIAL PRIMARY KEY,
    name                VARCHAR(150) NOT NULL,
    short_name          VARCHAR(10) NULL,
    logo_url            TEXT NULL,
    logo_color          VARCHAR(10) NULL,
    about               TEXT NULL,
    website             TEXT NULL,
    industry            VARCHAR(100) NULL,
    created_at          TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_companies_name UNIQUE (name)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_name ON companies (name);
CREATE INDEX IF NOT EXISTS idx_companies_short_name ON companies (short_name);


-- ---------------------------------------------------------------------
-- DOMAIN 3: STUDENT PROFILES & DETAILS
-- ---------------------------------------------------------------------

-- 4. Student Profiles
CREATE TABLE IF NOT EXISTS student_profiles (
    id                          BIGSERIAL PRIMARY KEY,
    user_id                     BIGINT NOT NULL,
    roll_no                     VARCHAR(20) NULL,
    full_name                   VARCHAR(120) NOT NULL,
    email                       VARCHAR(150) NOT NULL,
    phone                       VARCHAR(20) NULL,
    address                     VARCHAR(255) NULL,
    about                       TEXT NULL,
    avatar_url                  TEXT NULL,
    resume_url                  TEXT NULL,
    college                     VARCHAR(150) NULL,
    degree                      VARCHAR(100) NULL,
    department                  VARCHAR(100) NULL,
    department_code             VARCHAR(10) NULL,
    batch                       VARCHAR(20) NULL,
    semester                    SMALLINT NULL,
    cgpa                        DECIMAL(4,2) NULL,
    total_backlogs              INT NOT NULL DEFAULT 0,
    active_backlogs             INT NOT NULL DEFAULT 0,
    placement_status            VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    is_open_to_opportunities    BOOLEAN NOT NULL DEFAULT TRUE,
    placed_company_id           BIGINT NULL,
    placed_ctc                  DECIMAL(12,2) NULL,
    placed_on                   DATE NULL,
    profile_completion_percent  SMALLINT NOT NULL DEFAULT 0,
    created_at                  TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_student_profiles_user UNIQUE (user_id),
    CONSTRAINT uq_student_profiles_roll_no UNIQUE (roll_no),
    CONSTRAINT fk_student_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_student_profiles_placed_company FOREIGN KEY (placed_company_id) REFERENCES companies(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_student_semester CHECK (semester IS NULL OR (semester >= 1 AND semester <= 10)),
    CONSTRAINT chk_student_cgpa CHECK (cgpa IS NULL OR (cgpa >= 0.00 AND cgpa <= 10.00)),
    CONSTRAINT chk_student_completion CHECK (profile_completion_percent >= 0 AND profile_completion_percent <= 100),
    CONSTRAINT chk_student_backlogs CHECK (active_backlogs <= total_backlogs),
    CONSTRAINT chk_student_placement_status CHECK (placement_status IN ('PENDING', 'ACTIVE', 'PLACED', 'BLOCKED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_student_profiles_user ON student_profiles (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_profiles_roll_no ON student_profiles (roll_no);
CREATE INDEX IF NOT EXISTS idx_student_department_code ON student_profiles (department_code);
CREATE INDEX IF NOT EXISTS idx_student_cgpa ON student_profiles (cgpa);
CREATE INDEX IF NOT EXISTS idx_student_placement_status ON student_profiles (placement_status);
CREATE INDEX IF NOT EXISTS idx_student_semester ON student_profiles (semester);
CREATE INDEX IF NOT EXISTS idx_student_placed_company ON student_profiles (placed_company_id);
CREATE INDEX IF NOT EXISTS idx_student_dept_cgpa ON student_profiles (department_code, cgpa);
CREATE INDEX IF NOT EXISTS idx_student_status_dept ON student_profiles (placement_status, department_code);

-- 5. Student Skills
CREATE TABLE IF NOT EXISTS student_skills (
    id                  BIGSERIAL PRIMARY KEY,
    student_id          BIGINT NOT NULL,
    skill_name          VARCHAR(60) NOT NULL,
    proficiency         VARCHAR(20) NULL,

    CONSTRAINT uq_student_skill UNIQUE (student_id, skill_name),
    CONSTRAINT fk_student_skills_student FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_skill_proficiency CHECK (proficiency IS NULL OR proficiency IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_student_skill ON student_skills (student_id, skill_name);
CREATE INDEX IF NOT EXISTS idx_student_skills_student ON student_skills (student_id);
CREATE INDEX IF NOT EXISTS idx_student_skills_name ON student_skills (skill_name);

-- 6. Student Documents
CREATE TABLE IF NOT EXISTS student_documents (
    id                  BIGSERIAL PRIMARY KEY,
    student_id          BIGINT NOT NULL,
    document_name       VARCHAR(150) NOT NULL,
    document_type       VARCHAR(50) NOT NULL,
    file_url            TEXT NOT NULL,
    file_size           BIGINT NULL,
    status              VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    verified_by         BIGINT NULL,
    verified_at         TIMESTAMP WITHOUT TIME ZONE NULL,
    uploaded_at         TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_student_documents_student FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_student_documents_verifier FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_student_document_type CHECK (document_type IN ('RESUME', 'MARKSHEET', 'CERTIFICATE', 'ID_PROOF', 'OTHER')),
    CONSTRAINT chk_student_document_status CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED'))
);

CREATE INDEX IF NOT EXISTS idx_student_documents_student ON student_documents (student_id);
CREATE INDEX IF NOT EXISTS idx_student_documents_status ON student_documents (status);
CREATE INDEX IF NOT EXISTS idx_student_documents_type ON student_documents (student_id, document_type);

-- 7. Student Education
CREATE TABLE IF NOT EXISTS student_education (
    id                  BIGSERIAL PRIMARY KEY,
    student_id          BIGINT NOT NULL,
    institution_name    VARCHAR(150) NOT NULL,
    degree              VARCHAR(120) NOT NULL,
    board_or_university VARCHAR(150) NULL,
    start_year          SMALLINT NOT NULL,
    end_year            SMALLINT NULL,
    grade               VARCHAR(30) NULL,
    is_current          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_student_education_student FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_student_education_years CHECK (end_year IS NULL OR end_year >= start_year)
);

CREATE INDEX IF NOT EXISTS idx_student_education_student ON student_education (student_id);
CREATE INDEX IF NOT EXISTS idx_student_education_year ON student_education (student_id, end_year);

-- 8. Student Experience
CREATE TABLE IF NOT EXISTS student_experience (
    id                  BIGSERIAL PRIMARY KEY,
    student_id          BIGINT NOT NULL,
    job_role            VARCHAR(120) NOT NULL,
    company             VARCHAR(150) NOT NULL,
    experience_type     VARCHAR(50) NOT NULL DEFAULT 'INTERNSHIP',
    location            VARCHAR(120) NULL,
    start_date          DATE NOT NULL,
    end_date            DATE NULL,
    is_current          BOOLEAN NOT NULL DEFAULT FALSE,
    description         TEXT NULL,
    created_at          TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_student_experience_student FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_student_experience_dates CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT chk_student_experience_type CHECK (experience_type IN ('INTERNSHIP', 'FULL_TIME', 'PART_TIME', 'FREELANCE'))
);

CREATE INDEX IF NOT EXISTS idx_student_experience_student ON student_experience (student_id);
CREATE INDEX IF NOT EXISTS idx_student_experience_date ON student_experience (student_id, start_date);

-- 9. Student Projects
CREATE TABLE IF NOT EXISTS student_projects (
    id                  BIGSERIAL PRIMARY KEY,
    student_id          BIGINT NOT NULL,
    title               VARCHAR(150) NOT NULL,
    description         TEXT NULL,
    live_url            TEXT NULL,
    repo_url            TEXT NULL,
    media_url           TEXT NULL,
    created_at          TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_student_project_title UNIQUE (student_id, title),
    CONSTRAINT fk_student_projects_student FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_student_projects_student ON student_projects (student_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_project_title ON student_projects (student_id, title);

-- 10. Project Tech Stack
CREATE TABLE IF NOT EXISTS project_tech_stack (
    id                  BIGSERIAL PRIMARY KEY,
    project_id          BIGINT NOT NULL,
    technology          VARCHAR(60) NOT NULL,

    CONSTRAINT uq_project_technology UNIQUE (project_id, technology),
    CONSTRAINT fk_project_tech_project FOREIGN KEY (project_id) REFERENCES student_projects(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_project_technology ON project_tech_stack (project_id, technology);
CREATE INDEX IF NOT EXISTS idx_project_tech_technology ON project_tech_stack (technology);


-- ---------------------------------------------------------------------
-- DOMAIN 4: JOBS & PLACEMENT DRIVES
-- ---------------------------------------------------------------------

-- 11. Jobs
CREATE TABLE IF NOT EXISTS jobs (
    id                   BIGSERIAL PRIMARY KEY,
    company_id           BIGINT NOT NULL,
    job_role             VARCHAR(150) NOT NULL,
    job_description      TEXT NULL,
    job_type             VARCHAR(50) NOT NULL DEFAULT 'FULL_TIME',
    location             VARCHAR(120) NULL,
    ctc_text             VARCHAR(30) NULL,
    ctc_value            DECIMAL(12,2) NULL,
    vacancies            INT NULL,
    bond                 VARCHAR(100) NULL,
    min_cgpa             DECIMAL(4,2) NULL,
    backlogs_allowed     BOOLEAN NOT NULL DEFAULT FALSE,
    graduation_year      SMALLINT NULL,
    application_deadline DATE NOT NULL,
    status               VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    is_active            BOOLEAN NOT NULL DEFAULT TRUE,
    posted_by            BIGINT NOT NULL,
    posted_date          DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at           TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted           BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_jobs_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_jobs_poster FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_jobs_type CHECK (job_type IN ('FULL_TIME', 'INTERNSHIP', 'PART_TIME', 'CONTRACT')),
    CONSTRAINT chk_jobs_status CHECK (status IN ('DRAFT', 'ACTIVE', 'CLOSING_SOON', 'CLOSED')),
    CONSTRAINT chk_jobs_cgpa CHECK (min_cgpa IS NULL OR (min_cgpa >= 0.00 AND min_cgpa <= 10.00)),
    CONSTRAINT chk_jobs_vacancies CHECK (vacancies IS NULL OR vacancies > 0),
    CONSTRAINT chk_jobs_deadline CHECK (application_deadline >= posted_date)
);

CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs (company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_deadline ON jobs (application_deadline);
CREATE INDEX IF NOT EXISTS idx_jobs_min_cgpa ON jobs (min_cgpa);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_date ON jobs (posted_date);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs (location);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs (job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_by ON jobs (posted_by);
CREATE INDEX IF NOT EXISTS idx_jobs_status_deadline ON jobs (status, application_deadline);
CREATE INDEX IF NOT EXISTS idx_jobs_status_cgpa ON jobs (status, min_cgpa);

-- 12. Placement Drives
CREATE TABLE IF NOT EXISTS placement_drives (
    id                  BIGSERIAL PRIMARY KEY,
    job_id              BIGINT NOT NULL,
    drive_date          DATE NOT NULL,
    drive_time          TIME WITHOUT TIME ZONE NULL,
    venue               VARCHAR(150) NULL,
    mode                VARCHAR(50) NOT NULL DEFAULT 'OFFLINE',
    status              VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',
    created_at          TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_placement_drives_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_drive_mode CHECK (mode IN ('ONLINE', 'OFFLINE', 'HYBRID')),
    CONSTRAINT chk_drive_status CHECK (status IN ('SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED'))
);

CREATE INDEX IF NOT EXISTS idx_drives_job ON placement_drives (job_id);
CREATE INDEX IF NOT EXISTS idx_drives_drive_date ON placement_drives (drive_date);
CREATE INDEX IF NOT EXISTS idx_drives_status ON placement_drives (status);

-- 13. Job Eligible Departments
CREATE TABLE IF NOT EXISTS job_eligible_departments (
    id                  BIGSERIAL PRIMARY KEY,
    job_id              BIGINT NOT NULL,
    department_code     VARCHAR(10) NOT NULL,

    CONSTRAINT uq_job_eligible_department UNIQUE (job_id, department_code),
    CONSTRAINT fk_job_dept_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_job_eligible_department ON job_eligible_departments (job_id, department_code);
CREATE INDEX IF NOT EXISTS idx_job_elig_dept_code ON job_eligible_departments (department_code);

-- 14. Job Eligible Degrees
CREATE TABLE IF NOT EXISTS job_eligible_degrees (
    id                  BIGSERIAL PRIMARY KEY,
    job_id              BIGINT NOT NULL,
    degree              VARCHAR(60) NOT NULL,

    CONSTRAINT uq_job_eligible_degree UNIQUE (job_id, degree),
    CONSTRAINT fk_job_deg_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_job_eligible_degree ON job_eligible_degrees (job_id, degree);

-- 15. Job Responsibilities
CREATE TABLE IF NOT EXISTS job_responsibilities (
    id                  BIGSERIAL PRIMARY KEY,
    job_id              BIGINT NOT NULL,
    responsibility      VARCHAR(300) NOT NULL,
    display_order       SMALLINT NOT NULL DEFAULT 1,

    CONSTRAINT uq_job_responsibility_order UNIQUE (job_id, display_order),
    CONSTRAINT fk_job_resp_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_job_responsibility_order ON job_responsibilities (job_id, display_order);

-- 16. Job Requirements
CREATE TABLE IF NOT EXISTS job_requirements (
    id                  BIGSERIAL PRIMARY KEY,
    job_id              BIGINT NOT NULL,
    requirement         VARCHAR(300) NOT NULL,
    display_order       SMALLINT NOT NULL DEFAULT 1,

    CONSTRAINT uq_job_requirement_order UNIQUE (job_id, display_order),
    CONSTRAINT fk_job_req_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_job_requirement_order ON job_requirements (job_id, display_order);

-- 17. Job Perks
CREATE TABLE IF NOT EXISTS job_perks (
    id                  BIGSERIAL PRIMARY KEY,
    job_id              BIGINT NOT NULL,
    perk                VARCHAR(150) NOT NULL,

    CONSTRAINT uq_job_perk UNIQUE (job_id, perk),
    CONSTRAINT fk_job_perk_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_job_perk ON job_perks (job_id, perk);

-- 18. Job Selection Rounds
CREATE TABLE IF NOT EXISTS job_selection_rounds (
    id                  BIGSERIAL PRIMARY KEY,
    job_id              BIGINT NOT NULL,
    round_number        SMALLINT NOT NULL,
    round_name          VARCHAR(120) NOT NULL,
    round_mode          VARCHAR(50) NULL,
    scheduled_on        DATE NULL,

    CONSTRAINT uq_job_round_number UNIQUE (job_id, round_number),
    CONSTRAINT fk_job_rounds_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_round_number CHECK (round_number > 0),
    CONSTRAINT chk_round_mode CHECK (round_mode IS NULL OR round_mode IN ('ONLINE', 'OFFLINE', 'HYBRID'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_job_round_number ON job_selection_rounds (job_id, round_number);
CREATE INDEX IF NOT EXISTS idx_job_rounds_job ON job_selection_rounds (job_id);


-- ---------------------------------------------------------------------
-- DOMAIN 5: APPLICATIONS & TIMELINE
-- ---------------------------------------------------------------------

-- 19. Job Applications
CREATE TABLE IF NOT EXISTS job_applications (
    id                  BIGSERIAL PRIMARY KEY,
    job_id              BIGINT NOT NULL,
    student_id          BIGINT NOT NULL,
    applied_on          TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cover_letter        TEXT NULL,
    resume_url          TEXT NULL,
    consent_given       BOOLEAN NOT NULL DEFAULT FALSE,
    status              VARCHAR(50) NOT NULL DEFAULT 'APPLIED',
    current_stage       VARCHAR(80) NULL,
    current_round_id    BIGINT NULL,
    reviewed_by         BIGINT NULL,
    remarks             VARCHAR(255) NULL,
    created_at          TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_application_job_student UNIQUE (job_id, student_id),
    CONSTRAINT fk_job_app_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_job_app_student FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_job_app_round FOREIGN KEY (current_round_id) REFERENCES job_selection_rounds(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_job_app_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_app_status CHECK (status IN ('APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'REJECTED', 'SELECTED', 'WITHDRAWN'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_application_job_student ON job_applications (job_id, student_id);
CREATE INDEX IF NOT EXISTS idx_app_student ON job_applications (student_id);
CREATE INDEX IF NOT EXISTS idx_app_job ON job_applications (job_id);
CREATE INDEX IF NOT EXISTS idx_app_status ON job_applications (status);
CREATE INDEX IF NOT EXISTS idx_app_applied_on ON job_applications (applied_on);
CREATE INDEX IF NOT EXISTS idx_app_student_status ON job_applications (student_id, status);
CREATE INDEX IF NOT EXISTS idx_app_job_status ON job_applications (job_id, status);

-- 20. Application Timeline
CREATE TABLE IF NOT EXISTS application_timeline (
    id                  BIGSERIAL PRIMARY KEY,
    application_id      BIGINT NOT NULL,
    stage_label         VARCHAR(80) NOT NULL,
    stage_date          DATE NULL,
    status              VARCHAR(50) NOT NULL,
    display_order       SMALLINT NOT NULL,
    remarks             VARCHAR(255) NULL,
    updated_by          BIGINT NULL,
    created_at          TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_timeline_order UNIQUE (application_id, display_order),
    CONSTRAINT fk_timeline_app FOREIGN KEY (application_id) REFERENCES job_applications(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_timeline_updater FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_timeline_order CHECK (display_order > 0),
    CONSTRAINT chk_timeline_status CHECK (status IN ('DONE', 'UPCOMING', 'PENDING', 'FAILED', 'SKIPPED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_timeline_order ON application_timeline (application_id, display_order);
CREATE INDEX IF NOT EXISTS idx_timeline_application ON application_timeline (application_id);
CREATE INDEX IF NOT EXISTS idx_timeline_status ON application_timeline (status);

-- 21. Saved Jobs
CREATE TABLE IF NOT EXISTS saved_jobs (
    id                  BIGSERIAL PRIMARY KEY,
    student_id          BIGINT NOT NULL,
    job_id              BIGINT NOT NULL,
    saved_at            TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_saved_job UNIQUE (student_id, job_id),
    CONSTRAINT fk_saved_jobs_student FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_saved_jobs_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_saved_job ON saved_jobs (student_id, job_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_student ON saved_jobs (student_id);


-- ---------------------------------------------------------------------
-- DOMAIN 6: NOTIFICATIONS SYSTEM
-- ---------------------------------------------------------------------

-- 22. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id                  BIGSERIAL PRIMARY KEY,
    title               VARCHAR(200) NOT NULL,
    message             TEXT NOT NULL,
    notification_type   VARCHAR(50) NOT NULL,
    priority            VARCHAR(50) NOT NULL DEFAULT 'NORMAL',
    target_audience     VARCHAR(50) NOT NULL,
    created_by          BIGINT NOT NULL,
    related_job_id      BIGINT NULL,
    related_drive_id    BIGINT NULL,
    status              VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    scheduled_at        TIMESTAMP WITHOUT TIME ZONE NULL,
    published_at        TIMESTAMP WITHOUT TIME ZONE NULL,
    expires_at          TIMESTAMP WITHOUT TIME ZONE NULL,
    created_at          TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP WITHOUT TIME ZONE NULL,
    is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_notifications_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_notifications_job FOREIGN KEY (related_job_id) REFERENCES jobs(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_notifications_drive FOREIGN KEY (related_drive_id) REFERENCES placement_drives(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_notifications_type CHECK (notification_type IN ('GENERAL', 'JOB', 'PLACEMENT_DRIVE', 'INTERVIEW', 'DEADLINE', 'ANNOUNCEMENT', 'SYSTEM')),
    CONSTRAINT chk_notifications_priority CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    CONSTRAINT chk_notifications_audience CHECK (target_audience IN ('ALL', 'STUDENTS', 'PLACEMENT_OFFICERS', 'RECRUITERS', 'SPECIFIC_USERS')),
    CONSTRAINT chk_notifications_status CHECK (status IN ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'EXPIRED', 'ARCHIVED'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications (status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications (notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_target_audience ON notifications (target_audience);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_published_at ON notifications (published_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_by ON notifications (created_by);
CREATE INDEX IF NOT EXISTS idx_notifications_related_job ON notifications (related_job_id);

-- 23. Notification Recipients
CREATE TABLE IF NOT EXISTS notification_recipients (
    id                  BIGSERIAL PRIMARY KEY,
    notification_id     BIGINT NOT NULL,
    user_id             BIGINT NOT NULL,
    is_read             BOOLEAN NOT NULL DEFAULT FALSE,
    read_at             TIMESTAMP WITHOUT TIME ZONE NULL,
    delivered_at        TIMESTAMP WITHOUT TIME ZONE NULL,
    created_at          TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_notification_recipient UNIQUE (notification_id, user_id),
    CONSTRAINT fk_notif_recip_notif FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_notif_recip_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_recipient ON notification_recipients (notification_id, user_id);
CREATE INDEX IF NOT EXISTS idx_notification_recipients_user ON notification_recipients (user_id);
CREATE INDEX IF NOT EXISTS idx_notification_recipients_read ON notification_recipients (is_read);
CREATE INDEX IF NOT EXISTS idx_notification_recipients_notification ON notification_recipients (notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_recipients_user_read ON notification_recipients (user_id, is_read);

-- 24. Notification Attachments
CREATE TABLE IF NOT EXISTS notification_attachments (
    id                  BIGSERIAL PRIMARY KEY,
    notification_id     BIGINT NOT NULL,
    file_name           VARCHAR(255) NOT NULL,
    file_url            TEXT NOT NULL,
    file_type           VARCHAR(100) NULL,
    file_size           BIGINT NULL,
    created_at          TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notif_attach_notif FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notification_attachments_notification ON notification_attachments (notification_id);
