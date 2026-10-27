package com.gces.placementcell.service;

import com.gces.placementcell.entity.Job;
import com.gces.placementcell.entity.JobEligibleDegree;
import com.gces.placementcell.entity.JobEligibleDepartment;
import com.gces.placementcell.entity.StudentProfile;

/**
 * Decides whether a student meets a job's stated criteria. Pure logic, no I/O, so the
 * same rule can be reused and tested without a database.
 *
 * A criterion the job leaves blank is not applied. A criterion the job sets but the
 * student's profile cannot answer (e.g. no CGPA on file) counts as not met, because an
 * alert for a drive the student may be barred from is worse than a missed alert.
 */
public final class JobEligibility {

    private JobEligibility() {
    }

    public static boolean isEligible(StudentProfile student, Job job) {
        return meetsCgpa(student, job)
                && meetsBacklogs(student, job)
                && meetsBatch(student, job)
                && meetsDepartment(student, job)
                && meetsDegree(student, job);
    }

    private static boolean meetsCgpa(StudentProfile student, Job job) {
        if (job.getMinCgpa() == null) {
            return true;
        }
        return student.getCgpa() != null && student.getCgpa().compareTo(job.getMinCgpa()) >= 0;
    }

    private static boolean meetsBacklogs(StudentProfile student, Job job) {
        if (Boolean.TRUE.equals(job.getBacklogsAllowed())) {
            return true;
        }
        return student.getActiveBacklogs() == null || student.getActiveBacklogs() == 0;
    }

    /** Batch is stored as "2022-2026", so the graduation year is the text it ends with. */
    private static boolean meetsBatch(StudentProfile student, Job job) {
        if (job.getGraduationYear() == null) {
            return true;
        }
        String batch = student.getBatch();
        return batch != null && batch.trim().endsWith(String.valueOf(job.getGraduationYear()));
    }

    private static boolean meetsDepartment(StudentProfile student, Job job) {
        if (job.getEligibleDepartments().isEmpty()) {
            return true;
        }
        String code = student.getDepartmentCode();
        return code != null && job.getEligibleDepartments().stream()
                .map(JobEligibleDepartment::getDepartmentCode)
                .anyMatch(code::equalsIgnoreCase);
    }

    private static boolean meetsDegree(StudentProfile student, Job job) {
        if (job.getEligibleDegrees().isEmpty()) {
            return true;
        }
        String degree = student.getDegree();
        return degree != null && job.getEligibleDegrees().stream()
                .map(JobEligibleDegree::getDegree)
                .anyMatch(degree::equalsIgnoreCase);
    }
}
