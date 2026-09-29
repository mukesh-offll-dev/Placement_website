package com.gces.placementcell.repository;

import com.gces.placementcell.entity.enums.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Executes the paged and @EntityGraph repository queries against the real database.
 *
 * Spring Data only parses derived query names at startup; it does not run them, and an
 * @EntityGraph that joins two List associations fails at execution time with
 * MultipleBagFetchException rather than at boot. These tests therefore actually run each
 * query so that class of mistake cannot reach production.
 *
 * Read-only by design: every call is a select, and @Transactional with rollback means
 * nothing is written even if that changes. Safe to run against a shared database.
 */
@SpringBootTest
@Transactional(readOnly = true)
@DisplayName("Repository Query Execution Test")
class RepositoryQueryExecutionTest {

    @Autowired private JobRepository jobRepository;
    @Autowired private JobApplicationRepository applicationRepository;
    @Autowired private NotificationRecipientRepository recipientRepository;
    @Autowired private StudentProfileRepository studentProfileRepository;

    private static final long ABSENT_ID = -1L;

    @Test
    @DisplayName("Job paged and entity-graph queries execute")
    void testJobQueries() {
        var page = PageRequest.of(0, 10, Sort.by("id").descending());

        assertNotNull(jobRepository.findByIsDeletedFalse(page));
        assertNotNull(jobRepository.findByStatusAndIsDeletedFalse(JobStatus.ACTIVE, page));
        assertNotNull(jobRepository.findByCompanyId(ABSENT_ID, page));
        assertNotNull(jobRepository.findOpenJobs(JobStatus.ACTIVE, LocalDate.now(), page));

        // would throw MultipleBagFetchException if the graph joined two bags
        assertDoesNotThrow(() -> jobRepository.findWithDetailsById(ABSENT_ID));
        jobRepository.countByStatusAndIsDeletedFalse(JobStatus.ACTIVE);
    }

    @Test
    @DisplayName("JobApplication paged and entity-graph queries execute")
    void testApplicationQueries() {
        var page = PageRequest.of(0, 10);

        assertNotNull(applicationRepository.findByJobId(ABSENT_ID, page));
        assertNotNull(applicationRepository.findByStudentProfileId(ABSENT_ID, page));
        assertNotNull(applicationRepository.findByStatus(ApplicationStatus.APPLIED, page));
        assertDoesNotThrow(() -> applicationRepository.findWithTimelineById(ABSENT_ID));
        assertNotNull(applicationRepository.countGroupedByStatusForJob(ABSENT_ID));
    }

    @Test
    @DisplayName("Notification feed queries execute")
    void testNotificationFeedQueries() {
        var page = PageRequest.of(0, 20);

        assertNotNull(recipientRepository.findByUserIdOrderByCreatedAtDesc(ABSENT_ID, page));
        assertNotNull(recipientRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(ABSENT_ID, page));
        recipientRepository.countByUserIdAndIsReadFalse(ABSENT_ID);
    }

    @Test
    @DisplayName("Student directory search and filter paginate")
    void testStudentDirectoryQueries() {
        var page = PageRequest.of(0, 10, Sort.by("fullName"));

        assertNotNull(studentProfileRepository.searchStudents("zzz-no-such-student", page));
        assertNotNull(studentProfileRepository.filterStudents(null, null, null, page));
        assertNotNull(studentProfileRepository.filterStudents(
                "CSE", PlacementStatus.PENDING, new BigDecimal("7.00"), page));
        assertNotNull(studentProfileRepository.findByDepartmentCode("CSE", page));
        assertDoesNotThrow(() -> studentProfileRepository.findWithDetailsByUserId(ABSENT_ID));
    }
}
