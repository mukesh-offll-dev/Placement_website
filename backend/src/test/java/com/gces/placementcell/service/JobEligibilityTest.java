package com.gces.placementcell.service;

import com.gces.placementcell.entity.Job;
import com.gces.placementcell.entity.JobEligibleDegree;
import com.gces.placementcell.entity.JobEligibleDepartment;
import com.gces.placementcell.entity.StudentProfile;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("Job eligibility rule used for alert emails")
class JobEligibilityTest {

    private static StudentProfile student() {
        return StudentProfile.builder()
                .fullName("Asha Rao")
                .email("asha@example.com")
                .departmentCode("CSE")
                .degree("B.E CSE")
                .batch("2022-2026")
                .cgpa(new BigDecimal("8.20"))
                .activeBacklogs(0)
                .build();
    }

    private static Job.JobBuilder job() {
        return Job.builder().jobRole("SDE").backlogsAllowed(false);
    }

    @Test
    @DisplayName("A job with no criteria is open to everyone")
    void noCriteria() {
        assertTrue(JobEligibility.isEligible(student(), job().build()));
    }

    @Test
    @DisplayName("CGPA: equal to the minimum passes, below fails, missing CGPA fails")
    void cgpa() {
        Job job = job().minCgpa(new BigDecimal("8.20")).build();
        assertTrue(JobEligibility.isEligible(student(), job));

        StudentProfile below = student();
        below.setCgpa(new BigDecimal("8.19"));
        assertFalse(JobEligibility.isEligible(below, job));

        StudentProfile unknown = student();
        unknown.setCgpa(null);
        assertFalse(JobEligibility.isEligible(unknown, job));
    }

    @Test
    @DisplayName("Active backlogs block the student unless the job allows them")
    void backlogs() {
        StudentProfile withBacklog = student();
        withBacklog.setActiveBacklogs(1);

        assertFalse(JobEligibility.isEligible(withBacklog, job().build()));
        assertTrue(JobEligibility.isEligible(withBacklog, job().backlogsAllowed(true).build()));
    }

    @Test
    @DisplayName("Graduation year matches the end of the student's batch")
    void batch() {
        assertTrue(JobEligibility.isEligible(student(), job().graduationYear((short) 2026).build()));
        assertFalse(JobEligibility.isEligible(student(), job().graduationYear((short) 2027).build()));

        StudentProfile noBatch = student();
        noBatch.setBatch(null);
        assertFalse(JobEligibility.isEligible(noBatch, job().graduationYear((short) 2026).build()));
    }

    @Test
    @DisplayName("Listed departments and degrees restrict the audience, ignoring case")
    void departmentAndDegree() {
        Job job = job().build();
        job.getEligibleDepartments().add(JobEligibleDepartment.builder().job(job).departmentCode("ece").build());
        assertFalse(JobEligibility.isEligible(student(), job));

        job.getEligibleDepartments().add(JobEligibleDepartment.builder().job(job).departmentCode("cse").build());
        assertTrue(JobEligibility.isEligible(student(), job));

        job.getEligibleDegrees().add(JobEligibleDegree.builder().job(job).degree("B.Tech IT").build());
        assertFalse(JobEligibility.isEligible(student(), job));
    }
}
