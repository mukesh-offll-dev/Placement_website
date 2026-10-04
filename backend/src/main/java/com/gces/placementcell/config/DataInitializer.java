package com.gces.placementcell.config;

import com.gces.placementcell.entity.*;
import com.gces.placementcell.entity.enums.*;
import com.gces.placementcell.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.data-init.enabled", havingValue = "true", matchIfMissing = true)
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final StudentSkillRepository studentSkillRepository;
    private final StudentEducationRepository studentEducationRepository;
    private final StudentExperienceRepository studentExperienceRepository;
    private final StudentProjectRepository studentProjectRepository;
    private final ProjectTechStackRepository projectTechStackRepository;
    private final JobRepository jobRepository;
    private final JobApplicationRepository jobApplicationRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("Database already contains data, skipping initialization.");
            return;
        }

        log.info("Bootstrapping initial admin, placement officer, jobs, and student data...");

        // 1. Admin & Placement Officer Users
        User adminUser = userRepository.save(User.builder()
                .email("admin@gces.edu")
                .passwordHash(passwordEncoder.encode("Admin@123"))
                .role(UserRole.ADMIN)
                .accountStatus(AccountStatus.ACTIVE)
                .isActive(true)
                .isEmailVerified(true)
                .build());

        User officerUser = userRepository.save(User.builder()
                .email("officer@gces.edu")
                .passwordHash(passwordEncoder.encode("Officer@123"))
                .role(UserRole.PLACEMENT_OFFICER)
                .accountStatus(AccountStatus.ACTIVE)
                .isActive(true)
                .isEmailVerified(true)
                .build());

        // 2. Jobs
        Job googleJob = jobRepository.save(Job.builder()
                .title("Software Engineer")
                .company("Google")
                .location("Bangalore")
                .salary("24 LPA")
                .employmentType(EmploymentType.FULL_TIME)
                .skills("Java, React, System Design, Algorithms")
                .requirements("8.5+ CGPA, no active backlogs")
                .numberOfOpenings(10)
                .applicationDeadline(LocalDate.now().plusMonths(2))
                .status(JobStatus.ACTIVE)
                .postedBy(officerUser)
                .build());

        Job amazonJob = jobRepository.save(Job.builder()
                .title("Data Analyst")
                .company("Amazon")
                .location("Hyderabad")
                .salary("18 LPA")
                .employmentType(EmploymentType.FULL_TIME)
                .skills("SQL, Python, PowerBI, Tableau")
                .requirements("7.5+ CGPA")
                .numberOfOpenings(8)
                .applicationDeadline(LocalDate.now().plusMonths(1))
                .status(JobStatus.ACTIVE)
                .postedBy(officerUser)
                .build());

        Job msJob = jobRepository.save(Job.builder()
                .title("Cloud Engineer")
                .company("Microsoft")
                .location("Hyderabad")
                .salary("22 LPA")
                .employmentType(EmploymentType.FULL_TIME)
                .skills("Azure, Linux, Kubernetes, Terraform")
                .requirements("8.0+ CGPA")
                .numberOfOpenings(5)
                .applicationDeadline(LocalDate.now().plusDays(25))
                .status(JobStatus.ACTIVE)
                .postedBy(officerUser)
                .build());

        Job zohoJob = jobRepository.save(Job.builder()
                .title("Full Stack Developer")
                .company("Zoho")
                .location("Chennai")
                .salary("10 LPA")
                .employmentType(EmploymentType.FULL_TIME)
                .skills("Java, JavaScript, React, MySQL")
                .requirements("7.0+ CGPA")
                .numberOfOpenings(15)
                .applicationDeadline(LocalDate.now().plusDays(20))
                .status(JobStatus.ACTIVE)
                .postedBy(officerUser)
                .build());

        Job infosysJob = jobRepository.save(Job.builder()
                .title("DevOps Engineer")
                .company("Infosys")
                .location("Mysore")
                .salary("8 LPA")
                .employmentType(EmploymentType.FULL_TIME)
                .skills("Docker, CI/CD, AWS, Bash")
                .requirements("6.5+ CGPA")
                .numberOfOpenings(20)
                .applicationDeadline(LocalDate.now().plusMonths(1))
                .status(JobStatus.ACTIVE)
                .postedBy(officerUser)
                .build());

        // 3. Students
        createStudentData(
                "Adithya K", "adithya.k@gce.edu.in", "912822104001", "+91 98765 00001",
                "Computer Science (CSE)", "CSE", "B.E CSE", "2022-2026", (short) 7,
                new BigDecimal("8.92"), PlacementStatus.PLACED, googleJob.getId(), new BigDecimal("2400000.00"),
                (short) 95, List.of("React", "Node.js", "Java", "AWS"),
                List.of(googleJob, amazonJob), googleJob
        );

        createStudentData(
                "Priya M", "priya.m@gce.edu.in", "912822106002", "+91 98765 00002",
                "Electronics (ECE)", "ECE", "B.E ECE", "2022-2026", (short) 7,
                new BigDecimal("7.50"), PlacementStatus.ACTIVE, null, null,
                (short) 100, List.of("VLSI", "Embedded C", "MATLAB", "IoT"),
                List.of(amazonJob, zohoJob), null
        );

        createStudentData(
                "Rahul S", "rahul.s@gce.edu.in", "912823114003", "+91 98765 00003",
                "Mechanical (MECH)", "MECH", "B.E MECH", "2023-2027", (short) 5,
                new BigDecimal("8.10"), PlacementStatus.PENDING, null, null,
                (short) 65, List.of("AutoCAD", "SolidWorks", "ANSYS"),
                List.of(zohoJob), null
        );

        createStudentData(
                "Sneha R", "sneha.r@gce.edu.in", "912822103004", "+91 98765 00004",
                "Civil Engineering", "CIVIL", "B.E CIVIL", "2022-2026", (short) 7,
                new BigDecimal("7.85"), PlacementStatus.ACTIVE, null, null,
                (short) 85, List.of("Revit", "STAAD Pro", "GIS"),
                List.of(), null
        );

        createStudentData(
                "Vijay T", "vijay.t@gce.edu.in", "912822105005", "+91 98765 00005",
                "Electrical (EEE)", "EEE", "B.E EEE", "2022-2026", (short) 7,
                new BigDecimal("9.10"), PlacementStatus.PLACED, msJob.getId(), new BigDecimal("2200000.00"),
                (short) 100, List.of("Power Systems", "PLC", "Python", "Cloud"),
                List.of(msJob, googleJob), msJob
        );

        createStudentData(
                "Arun P", "arun.p@gce.edu.in", "912822104006", "+91 98765 00006",
                "Computer Science (CSE)", "CSE", "B.E CSE", "2022-2026", (short) 7,
                new BigDecimal("8.30"), PlacementStatus.ACTIVE, null, null,
                (short) 78, List.of("Spring Boot", "React", "PostgreSQL"),
                List.of(infosysJob, zohoJob), null
        );

        createStudentData(
                "Kavitha L", "kavitha.l@gce.edu.in", "912823106007", "+91 98765 00007",
                "Electronics (ECE)", "ECE", "B.E ECE", "2023-2027", (short) 5,
                new BigDecimal("7.20"), PlacementStatus.PENDING, null, null,
                (short) 60, List.of("C++", "Verilog", "Microcontrollers"),
                List.of(), null
        );

        createStudentData(
                "Surya V", "surya.v@gce.edu.in", "912822205008", "+91 98765 00008",
                "Information Technology", "IT", "B.Tech IT", "2022-2026", (short) 7,
                new BigDecimal("8.70"), PlacementStatus.ACTIVE, null, null,
                (short) 90, List.of("Python", "Machine Learning", "FastAPI"),
                List.of(amazonJob, googleJob), null
        );

        log.info("Database bootstrap completed successfully.");
    }

    private void createStudentData(
            String name, String email, String rollNo, String phone,
            String dept, String deptCode, String degree, String batch, short sem,
            BigDecimal cgpa, PlacementStatus status, Long placedCompanyId, BigDecimal placedCtc,
            short completion, List<String> skills, List<Job> appliedJobs, Job placedJob) {

        User u = userRepository.save(User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode("Student@123"))
                .role(UserRole.STUDENT)
                .accountStatus(AccountStatus.ACTIVE)
                .isActive(true)
                .isEmailVerified(true)
                .build());

        StudentProfile sp = studentProfileRepository.save(StudentProfile.builder()
                .user(u)
                .fullName(name)
                .email(email)
                .rollNo(rollNo)
                .phone(phone)
                .address("Tamil Nadu, India")
                .college("GCE Srirangam")
                .department(dept)
                .departmentCode(deptCode)
                .degree(degree)
                .batch(batch)
                .semester(sem)
                .cgpa(cgpa)
                .totalBacklogs(0)
                .activeBacklogs(0)
                .placementStatus(status)
                .isOpenToOpportunities(status != PlacementStatus.PLACED)
                .placedCompanyId(placedCompanyId)
                .placedCtc(placedCtc)
                .placedOn(status == PlacementStatus.PLACED ? LocalDate.now().minusDays(10) : null)
                .profileCompletionPercent(completion)
                .about("Enthusiastic engineering student from " + dept + " at GCE Srirangam.")
                .build());

        for (String skill : skills) {
            studentSkillRepository.save(StudentSkill.builder()
                    .studentProfile(sp)
                    .skillName(skill)
                    .proficiency("INTERMEDIATE")
                    .build());
        }

        studentEducationRepository.save(StudentEducation.builder()
                .studentProfile(sp)
                .institutionName("GCE Srirangam")
                .degree(degree)
                .boardOrUniversity("Anna University")
                .startYear((short) 2022)
                .endYear((short) 2026)
                .grade(cgpa + " CGPA")
                .isCurrent(true)
                .build());

        StudentProject proj = studentProjectRepository.save(StudentProject.builder()
                .studentProfile(sp)
                .title(deptCode + " Project Portal")
                .description("A high performance portal developed using modern software practices.")
                .liveUrl("https://github.com/placement-portal")
                .build());

        projectTechStackRepository.save(ProjectTechStack.builder()
                .project(proj)
                .technology("Java")
                .build());

        for (Job job : appliedJobs) {
            ApplicationStatus appStatus = ApplicationStatus.APPLIED;
            if (placedJob != null && placedJob.getId().equals(job.getId())) {
                appStatus = ApplicationStatus.SELECTED;
            } else if (cgpa.compareTo(new BigDecimal("8.0")) >= 0) {
                appStatus = ApplicationStatus.SHORTLISTED;
            }

            jobApplicationRepository.save(JobApplication.builder()
                    .job(job)
                    .studentProfile(sp)
                    .status(appStatus)
                    .appliedAt(LocalDateTime.now().minusDays(3))
                    .build());
        }
    }
}
