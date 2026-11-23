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
        return ineligibilityReason(student, job) == null;
    }

    /**
     * A message naming the first criterion the student fails, or {@code null} when eligible.
     */
    public static String ineligibilityReason(StudentProfile student, Job job) {
        if (student.effectiveLifecycle() != com.gces.placementcell.entity.enums.LifecycleStatus.ACTIVE) {
            return "Only active students are eligible";
        }
        if (!meetsCgpa(student, job)) {
            return "This job requires a minimum CGPA of " + job.getMinCgpa().stripTrailingZeros().toPlainString()
                    + (student.getCgpa() == null ? " and your profile has no CGPA on file" : "");
        }
        if (!meetsBacklogs(student, job)) {
            return "This job does not allow active backlogs";
        }
        if (!meetsBatch(student, job)) {
            return "This job is only open to the " + job.getGraduationYear() + " graduating batch";
        }
        if (!meetsDepartment(student, job)) {
            return "This job is not open to your department";
        }
        if (!meetsDegree(student, job)) {
            return "This job is not open to your degree";
        }
        return null;
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
        if (degree == null || degree.isBlank()) {
            return false;
        }
        // Student records hold values like "B.E CSE" while a job lists "B.E", so a
        // job degree matches the whole value or its first word, ignoring case,
        // dots and spaces ("B.E" = "BE" = "b.e").
        String whole = normalizeDegree(degree);
        String firstWord = normalizeDegree(degree.trim().split("[\\s\\-/(,]+")[0]);
        return job.getEligibleDegrees().stream()
                .map(JobEligibleDegree::getDegree)
                .map(JobEligibility::normalizeDegree)
                .anyMatch(d -> !d.isEmpty() && (d.equals(whole) || d.equals(firstWord)));
    }

    static String normalizeDegree(String value) {
        return value == null ? "" : value.replaceAll("[.\\s]", "").toUpperCase(java.util.Locale.ROOT);
    }
}
