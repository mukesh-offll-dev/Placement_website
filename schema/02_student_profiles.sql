-- =====================================================================
-- Task 2: Student Profile & Related Tables Schema
-- Reference: schema/tables.dbml, schema/student_portal1.json & schema/admin_portal.txt
-- Dialect: PostgreSQL (Compatible with Neon Cloud & standard PostgreSQL 14+)
-- =====================================================================

-- 1. Create Enum Types (if not already existing)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'placement_status') THEN
        CREATE TYPE placement_status AS ENUM (
            'PENDING',
            'ACTIVE',
            'PLACED',
            'BLOCKED'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
        CREATE TYPE document_type AS ENUM (
            'RESUME',
            'MARKSHEET',
            'CERTIFICATE',
            'ID_PROOF',
            'OTHER'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
        CREATE TYPE verification_status AS ENUM (
            'PENDING',
            'VERIFIED',
            'REJECTED'
        );
    END IF;
END $$;

-- 2. Create Student Profiles Table
CREATE TABLE IF NOT EXISTS student_profiles (
    id                          BIGSERIAL PRIMARY KEY,
    user_id                     BIGINT NOT NULL,
    roll_no                     VARCHAR(20) NULL,

    -- Personal / Contact Details
    full_name                   VARCHAR(120) NOT NULL,
    email                       VARCHAR(150) NOT NULL,
    phone                       VARCHAR(20) NULL,
    address                     VARCHAR(255) NULL,
    about                       TEXT NULL,
    avatar_url                  TEXT NULL,
    resume_url                  TEXT NULL,

    -- Academic Details
    college                     VARCHAR(150) NULL,
    degree                      VARCHAR(100) NULL,
    department                  VARCHAR(100) NULL,
    department_code             VARCHAR(10) NULL,
    batch                       VARCHAR(20) NULL,
    semester                    SMALLINT NULL,
    cgpa                        DECIMAL(4,2) NULL,
    total_backlogs              INT NOT NULL DEFAULT 0,
    active_backlogs             INT NOT NULL DEFAULT 0,

    -- Placement Details
    placement_status            VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    is_open_to_opportunities    BOOLEAN NOT NULL DEFAULT TRUE,
    placed_company_id           BIGINT NULL,
    placed_ctc                  DECIMAL(12,2) NULL,
    placed_on                   DATE NULL,
    profile_completion_percent  SMALLINT NOT NULL DEFAULT 0,

    created_at                  TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT uq_student_profiles_user UNIQUE (user_id),
    CONSTRAINT uq_student_profiles_roll_no UNIQUE (roll_no),
    CONSTRAINT fk_student_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_student_semester CHECK (semester IS NULL OR (semester >= 1 AND semester <= 10)),
    CONSTRAINT chk_student_cgpa CHECK (cgpa IS NULL OR (cgpa >= 0.00 AND cgpa <= 10.00)),
    CONSTRAINT chk_student_profile_completion CHECK (profile_completion_percent >= 0 AND profile_completion_percent <= 100),
    CONSTRAINT chk_student_backlogs CHECK (active_backlogs <= total_backlogs),
    CONSTRAINT chk_student_placement_status CHECK (placement_status IN ('PENDING', 'ACTIVE', 'PLACED', 'BLOCKED')),
    CONSTRAINT chk_student_placed_company CHECK (placement_status <> 'PLACED' OR placed_company_id IS NOT NULL)
);

-- 3. Create Student Skills Table
CREATE TABLE IF NOT EXISTS student_skills (
    id          BIGSERIAL PRIMARY KEY,
    student_id  BIGINT NOT NULL,
    skill_name  VARCHAR(60) NOT NULL,
    proficiency VARCHAR(20) NULL,

    -- Constraints
    CONSTRAINT uq_student_skill UNIQUE (student_id, skill_name),
    CONSTRAINT fk_student_skills_student FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE,
    CONSTRAINT chk_student_skills_proficiency CHECK (proficiency IS NULL OR proficiency IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED'))
);

-- 4. Create Student Documents Table
CREATE TABLE IF NOT EXISTS student_documents (
    id            BIGSERIAL PRIMARY KEY,
    student_id    BIGINT NOT NULL,
    document_name VARCHAR(150) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    file_url      TEXT NOT NULL,
    file_size     BIGINT NULL,
    status        VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    verified_by   BIGINT NULL,
    verified_at   TIMESTAMP WITHOUT TIME ZONE NULL,
    uploaded_at   TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT fk_student_documents_student FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_student_documents_verified_by FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_student_documents_type CHECK (document_type IN ('RESUME', 'MARKSHEET', 'CERTIFICATE', 'ID_PROOF', 'OTHER')),
    CONSTRAINT chk_student_documents_status CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    CONSTRAINT chk_student_documents_verification CHECK (status <> 'VERIFIED' OR verified_by IS NOT NULL)
);

-- 5. Create Indexes
-- Student Profiles Indexes
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_profiles_user ON student_profiles (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_profiles_roll_no ON student_profiles (roll_no);
CREATE INDEX IF NOT EXISTS idx_student_department_code ON student_profiles (department_code);
CREATE INDEX IF NOT EXISTS idx_student_cgpa ON student_profiles (cgpa);
CREATE INDEX IF NOT EXISTS idx_student_placement_status ON student_profiles (placement_status);
CREATE INDEX IF NOT EXISTS idx_student_semester ON student_profiles (semester);
CREATE INDEX IF NOT EXISTS idx_student_placed_company ON student_profiles (placed_company_id);
CREATE INDEX IF NOT EXISTS idx_student_dept_cgpa ON student_profiles (department_code, cgpa);
CREATE INDEX IF NOT EXISTS idx_student_status_dept ON student_profiles (placement_status, department_code);

-- Student Skills Indexes
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_skill ON student_skills (student_id, skill_name);
CREATE INDEX IF NOT EXISTS idx_student_skills_student ON student_skills (student_id);
CREATE INDEX IF NOT EXISTS idx_student_skills_name ON student_skills (skill_name);

-- Student Documents Indexes
CREATE INDEX IF NOT EXISTS idx_student_documents_student ON student_documents (student_id);
CREATE INDEX IF NOT EXISTS idx_student_documents_status ON student_documents (status);
CREATE INDEX IF NOT EXISTS idx_student_documents_type ON student_documents (student_id, document_type);

-- 6. Add Documentation Comments
COMMENT ON TABLE student_profiles IS 'Stores student personal, academic, contact, resume, and placement details. 1:1 with users table where role = STUDENT.';
COMMENT ON COLUMN student_profiles.id IS 'Primary key, auto-incrementing unique identifier';
COMMENT ON COLUMN student_profiles.user_id IS 'Foreign key referencing users table (1:1 relationship)';
COMMENT ON COLUMN student_profiles.roll_no IS 'Unique student roll number / registration identifier';
COMMENT ON COLUMN student_profiles.full_name IS 'Full legal name of the student';
COMMENT ON COLUMN student_profiles.email IS 'Contact email address of the student';
COMMENT ON COLUMN student_profiles.phone IS 'Contact phone number';
COMMENT ON COLUMN student_profiles.address IS 'Physical home or residential address';
COMMENT ON COLUMN student_profiles.about IS 'Student bio / professional summary';
COMMENT ON COLUMN student_profiles.avatar_url IS 'Profile avatar picture URL';
COMMENT ON COLUMN student_profiles.resume_url IS 'URL link to current primary resume document';
COMMENT ON COLUMN student_profiles.college IS 'College / Institution name';
COMMENT ON COLUMN student_profiles.degree IS 'Degree program (e.g. B.E, B.Tech, M.Tech)';
COMMENT ON COLUMN student_profiles.department IS 'Full department name (e.g. Computer Science and Engineering)';
COMMENT ON COLUMN student_profiles.department_code IS 'Short department code (e.g. CSE, ECE, MECH, EEE, CIVIL, IT)';
COMMENT ON COLUMN student_profiles.batch IS 'Academic batch period (e.g. 2022-2026)';
COMMENT ON COLUMN student_profiles.semester IS 'Current academic semester (1 to 10)';
COMMENT ON COLUMN student_profiles.cgpa IS 'Cumulative Grade Point Average (0.00 to 10.00)';
COMMENT ON COLUMN student_profiles.total_backlogs IS 'Total historical backlog count';
COMMENT ON COLUMN student_profiles.active_backlogs IS 'Current active backlog count (must be <= total_backlogs)';
COMMENT ON COLUMN student_profiles.placement_status IS 'Placement status: PENDING, ACTIVE, PLACED, BLOCKED';
COMMENT ON COLUMN student_profiles.is_open_to_opportunities IS 'Flag indicating if student is actively seeking job opportunities';
COMMENT ON COLUMN student_profiles.placed_company_id IS 'ID of company where student got placed (NULL if not placed)';
COMMENT ON COLUMN student_profiles.placed_ctc IS 'Annual CTC package in INR if placed';
COMMENT ON COLUMN student_profiles.placed_on IS 'Date when student accepted placement offer';
COMMENT ON COLUMN student_profiles.profile_completion_percent IS 'Calculated profile completion percentage (0 to 100)';
COMMENT ON COLUMN student_profiles.created_at IS 'Timestamp when student profile record was created';
COMMENT ON COLUMN student_profiles.updated_at IS 'Timestamp when student profile record was last updated';

COMMENT ON TABLE student_skills IS 'Normalized student skills and proficiency levels';
COMMENT ON COLUMN student_skills.id IS 'Primary key, auto-incrementing identifier';
COMMENT ON COLUMN student_skills.student_id IS 'Foreign key referencing student_profiles table';
COMMENT ON COLUMN student_skills.skill_name IS 'Skill name (e.g., Java, Python, React)';
COMMENT ON COLUMN student_skills.proficiency IS 'Skill proficiency level: BEGINNER, INTERMEDIATE, ADVANCED';

COMMENT ON TABLE student_documents IS 'Uploaded student verification and placement documents';
COMMENT ON COLUMN student_documents.id IS 'Primary key, auto-incrementing identifier';
COMMENT ON COLUMN student_documents.student_id IS 'Foreign key referencing student_profiles table';
COMMENT ON COLUMN student_documents.document_name IS 'Original file name of uploaded document';
COMMENT ON COLUMN student_documents.document_type IS 'Type of document: RESUME, MARKSHEET, CERTIFICATE, ID_PROOF, OTHER';
COMMENT ON COLUMN student_documents.file_url IS 'Storage URL or file path of uploaded document';
COMMENT ON COLUMN student_documents.file_size IS 'File size in bytes';
COMMENT ON COLUMN student_documents.status IS 'Verification status: PENDING, VERIFIED, REJECTED';
COMMENT ON COLUMN student_documents.verified_by IS 'User ID of officer/admin who verified document';
COMMENT ON COLUMN student_documents.verified_at IS 'Timestamp when document was verified or rejected';
COMMENT ON COLUMN student_documents.uploaded_at IS 'Timestamp when document was uploaded';
