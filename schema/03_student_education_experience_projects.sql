-- =====================================================================
-- Task 3: Student Education, Experience/Internship & Projects Schema
-- Reference: schema/tables.dbml, schema/student_portal1.json & schema/admin_portal.txt
-- Dialect: PostgreSQL (Compatible with Neon Cloud & standard PostgreSQL 14+)
-- =====================================================================

-- 1. Create Enum Types (if not already existing)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'experience_type') THEN
        CREATE TYPE experience_type AS ENUM (
            'INTERNSHIP',
            'FULL_TIME',
            'PART_TIME',
            'FREELANCE'
        );
    END IF;
END $$;

-- 2. Create Student Education Table
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

    -- Constraints
    CONSTRAINT fk_student_education_student FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE,
    CONSTRAINT chk_student_education_year CHECK (end_year IS NULL OR end_year >= start_year)
);

-- 3. Create Student Experience Table (Internships & Work History)
CREATE TABLE IF NOT EXISTS student_experience (
    id              BIGSERIAL PRIMARY KEY,
    student_id      BIGINT NOT NULL,
    job_role        VARCHAR(120) NOT NULL,
    company         VARCHAR(150) NOT NULL,
    experience_type VARCHAR(50) NOT NULL DEFAULT 'INTERNSHIP',
    location        VARCHAR(120) NULL,
    start_date      DATE NOT NULL,
    end_date        DATE NULL,
    is_current      BOOLEAN NOT NULL DEFAULT FALSE,
    description     TEXT NULL,
    created_at      TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT fk_student_experience_student FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE,
    CONSTRAINT chk_student_experience_type CHECK (experience_type IN ('INTERNSHIP', 'FULL_TIME', 'PART_TIME', 'FREELANCE')),
    CONSTRAINT chk_student_experience_date CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT chk_student_experience_current CHECK (is_current = FALSE OR end_date IS NULL)
);

-- 4. Create Student Projects Table
CREATE TABLE IF NOT EXISTS student_projects (
    id          BIGSERIAL PRIMARY KEY,
    student_id  BIGINT NOT NULL,
    title       VARCHAR(150) NOT NULL,
    description TEXT NULL,
    live_url    TEXT NULL,
    repo_url    TEXT NULL,
    media_url   TEXT NULL,
    created_at  TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT uq_student_project_title UNIQUE (student_id, title),
    CONSTRAINT fk_student_projects_student FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE
);

-- 5. Create Project Tech Stack Table (Normalized technologies/tags)
CREATE TABLE IF NOT EXISTS project_tech_stack (
    id         BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL,
    technology VARCHAR(60) NOT NULL,

    -- Constraints
    CONSTRAINT uq_project_technology UNIQUE (project_id, technology),
    CONSTRAINT fk_project_tech_stack_project FOREIGN KEY (project_id) REFERENCES student_projects(id) ON DELETE CASCADE
);

-- 6. Create Indexes as specified in schema/tables.dbml
CREATE INDEX IF NOT EXISTS idx_student_education_student ON student_education (student_id);
CREATE INDEX IF NOT EXISTS idx_student_education_year ON student_education (student_id, end_year);

CREATE INDEX IF NOT EXISTS idx_student_experience_student ON student_experience (student_id);
CREATE INDEX IF NOT EXISTS idx_student_experience_date ON student_experience (student_id, start_date);

CREATE INDEX IF NOT EXISTS idx_student_projects_student ON student_projects (student_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_project_title ON student_projects (student_id, title);

CREATE UNIQUE INDEX IF NOT EXISTS uq_project_technology ON project_tech_stack (project_id, technology);
CREATE INDEX IF NOT EXISTS idx_project_tech_technology ON project_tech_stack (technology);

-- 7. Add Documentation Comments
COMMENT ON TABLE student_education IS 'Stores student academic history and education milestones (degree, 12th, 10th)';
COMMENT ON COLUMN student_education.id IS 'Primary key, auto-incrementing identifier';
COMMENT ON COLUMN student_education.student_id IS 'Foreign key referencing student_profiles table';
COMMENT ON COLUMN student_education.institution_name IS 'Name of school, college, or university';
COMMENT ON COLUMN student_education.degree IS 'Degree title or class level (e.g., B.E CSE, Class XII)';
COMMENT ON COLUMN student_education.board_or_university IS 'Affiliated board or university';
COMMENT ON COLUMN student_education.start_year IS 'Year studies started';
COMMENT ON COLUMN student_education.end_year IS 'Year completed, or NULL if currently ongoing';
COMMENT ON COLUMN student_education.grade IS 'Reported score or grade (e.g., 8.9 CGPA, 92%)';
COMMENT ON COLUMN student_education.is_current IS 'True if student is currently studying here';
COMMENT ON COLUMN student_education.created_at IS 'Timestamp when education record was added';

COMMENT ON TABLE student_experience IS 'Stores student internships and prior work history';
COMMENT ON COLUMN student_experience.id IS 'Primary key, auto-incrementing identifier';
COMMENT ON COLUMN student_experience.student_id IS 'Foreign key referencing student_profiles table';
COMMENT ON COLUMN student_experience.job_role IS 'Job or internship title (e.g., Software Engineer Intern)';
COMMENT ON COLUMN student_experience.company IS 'Employer company or organization name';
COMMENT ON COLUMN student_experience.experience_type IS 'Category: INTERNSHIP, FULL_TIME, PART_TIME, FREELANCE';
COMMENT ON COLUMN student_experience.location IS 'Workplace location or Remote';
COMMENT ON COLUMN student_experience.start_date IS 'Start date of employment';
COMMENT ON COLUMN student_experience.end_date IS 'End date of employment, or NULL if ongoing';
COMMENT ON COLUMN student_experience.is_current IS 'True if currently working here';
COMMENT ON COLUMN student_experience.description IS 'Summary of duties, achievements, and impact';
COMMENT ON COLUMN student_experience.created_at IS 'Timestamp when experience record was added';

COMMENT ON TABLE student_projects IS 'Stores showcase projects developed by students';
COMMENT ON COLUMN student_projects.id IS 'Primary key, auto-incrementing identifier';
COMMENT ON COLUMN student_projects.student_id IS 'Foreign key referencing student_profiles table';
COMMENT ON COLUMN student_projects.title IS 'Project title';
COMMENT ON COLUMN student_projects.description IS 'Detailed project description and problem statement';
COMMENT ON COLUMN student_projects.live_url IS 'Live demo or deployed application URL';
COMMENT ON COLUMN student_projects.repo_url IS 'Source code repository URL (GitHub/GitLab)';
COMMENT ON COLUMN student_projects.media_url IS 'Screenshot or preview banner image URL';
COMMENT ON COLUMN student_projects.created_at IS 'Timestamp when project was added';
COMMENT ON COLUMN student_projects.updated_at IS 'Timestamp when project was last updated';

COMMENT ON TABLE project_tech_stack IS 'Normalized technologies and tools used in student projects';
COMMENT ON COLUMN project_tech_stack.id IS 'Primary key, auto-incrementing identifier';
COMMENT ON COLUMN project_tech_stack.project_id IS 'Foreign key referencing student_projects table';
COMMENT ON COLUMN project_tech_stack.technology IS 'Technology tag name (e.g., React, Python, Docker, AWS)';
