package com.gces.placementcell.service.impl;

import com.gces.placementcell.dto.response.*;
import com.gces.placementcell.entity.Job;
import com.gces.placementcell.entity.JobApplication;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.enums.ApplicationStatus;
import com.gces.placementcell.entity.enums.JobStatus;
import com.gces.placementcell.repository.JobApplicationRepository;
import com.gces.placementcell.repository.JobRepository;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.service.AdminDashboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminDashboardServiceImpl implements AdminDashboardService {

    private final StudentProfileRepository studentProfileRepository;
    private final JobRepository jobRepository;
    private final JobApplicationRepository jobApplicationRepository;

    @Override
    @Transactional(readOnly = true)
    public DashboardStatsDto getDashboardStats() {
        long totalStudents = studentProfileRepository.countActiveStudents();
        long totalPlaced = studentProfileRepository.countPlacedStudents();
        long totalUnplaced = Math.max(0, totalStudents - totalPlaced);

        double placementPercentage = totalStudents > 0
                ? Math.round(((double) totalPlaced / totalStudents) * 1000.0) / 10.0
                : 0.0;

        long totalCompanies = jobRepository.countDistinctCompanies();
        long totalApplications = jobApplicationRepository.count();
        long selectedStudents = jobApplicationRepository.countByStatus(ApplicationStatus.SELECTED);

        long totalActiveJobs = jobRepository.countByStatusAndIsDeletedFalse(JobStatus.ACTIVE);
        long totalJobs = jobRepository.countByIsDeletedFalse();

        LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);
        long jobsPostedThisWeek = jobRepository.findByStatusAndIsDeletedFalse(JobStatus.ACTIVE).stream()
                .filter(j -> j.getCreatedAt() != null && j.getCreatedAt().isAfter(weekAgo))
                .count();

        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        long applicationsToday = jobApplicationRepository.countByAppliedOnGreaterThanEqual(todayStart);

        // Department-wise counts
        Map<String, Long> deptStudentCount = new LinkedHashMap<>();
        for (Object[] row : studentProfileRepository.countStudentsGroupedByDepartment()) {
            if (row != null && row.length >= 2 && row[0] != null) {
                deptStudentCount.put((String) row[0], ((Number) row[1]).longValue());
            }
        }

        Map<String, Long> deptPlacementCount = new LinkedHashMap<>();
        for (Object[] row : studentProfileRepository.countPlacedStudentsGroupedByDepartment()) {
            if (row != null && row.length >= 2 && row[0] != null) {
                deptPlacementCount.put((String) row[0], ((Number) row[1]).longValue());
            }
        }

        // Combine into department stats list
        List<DepartmentStatDto> departmentStats = new ArrayList<>();
        Set<String> allDepts = new TreeSet<>(deptStudentCount.keySet());
        allDepts.addAll(deptPlacementCount.keySet());

        for (String dept : allDepts) {
            long total = deptStudentCount.getOrDefault(dept, 0L);
            long placed = deptPlacementCount.getOrDefault(dept, 0L);
            double rate = total > 0 ? Math.round(((double) placed / total) * 1000.0) / 10.0 : 0.0;

            departmentStats.add(DepartmentStatDto.builder()
                    .department(dept)
                    .totalStudents(total)
                    .placedStudents(placed)
                    .placementRate(rate)
                    .build());
        }

        // Recent Jobs
        List<Job> activeJobs = jobRepository.findByStatusAndIsDeletedFalse(JobStatus.ACTIVE);
        List<RecentJobDto> recentJobs = activeJobs.stream()
                .sorted(Comparator.comparing(Job::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(5)
                .map(j -> RecentJobDto.builder()
                        .id(j.getId())
                        .company(j.getCompanyName())
                        .title(j.getTitle())
                        .role(j.getRole())
                        .salary(j.getSalary())
                        .location(j.getLocation())
                        .cgpa(j.getMinCgpa() != null ? j.getMinCgpa().toPlainString() : null)
                        .deadline(j.getApplicationDeadline())
                        .status(j.getStatus())
                        .createdAt(j.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        // Recent Applications
        List<RecentApplicationDto> recentApplications = jobApplicationRepository.findTop10ByOrderByAppliedOnDesc().stream()
                .map(app -> {
                    StudentProfile sp = app.getStudentProfile();
                    Job j = app.getJob();
                    return RecentApplicationDto.builder()
                            .id(app.getId())
                            .studentName(sp != null ? sp.getFullName() : "Unknown")
                            .studentRollNo(sp != null ? sp.getRollNo() : "")
                            .studentDepartment(sp != null ? sp.getDepartment() : "")
                            .jobTitle(j != null ? j.getTitle() : "Unknown Job")
                            .company(j != null ? j.getCompanyName() : "")
                            .status(app.getStatus())
                            .appliedAt(app.getAppliedAt())
                            .build();
                })
                .collect(Collectors.toList());

        return DashboardStatsDto.builder()
                .totalStudents(totalStudents)
                .totalPlaced(totalPlaced)
                .totalUnplaced(totalUnplaced)
                .placementPercentage(placementPercentage)
                .totalCompanies(totalCompanies)
                .totalApplications(totalApplications)
                .selectedStudents(selectedStudents)
                .totalActiveJobs(totalActiveJobs)
                .totalJobs(totalJobs)
                .jobsPostedThisWeek(jobsPostedThisWeek)
                .applicationsToday(applicationsToday)
                .departmentStudentCount(deptStudentCount)
                .departmentPlacementCount(deptPlacementCount)
                .departmentStats(departmentStats)
                .recentJobs(recentJobs)
                .recentApplications(recentApplications)
                .build();
    }
}
