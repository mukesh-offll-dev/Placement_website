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
    private final CompanyRepository companyRepository;
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
        Job googleJob = seedJob(officerUser, "Google", "Technology", "Software Engineer", "Bangalore",
                "24 LPA", "2400000.00", "8.50", 10, LocalDate.now().plusMonths(2),
                List.of("Java", "React", "System Design", "Algorithms"), "8.5+ CGPA, no active backlogs");

        Job amazonJob = seedJob(officerUser, "Amazon", "Technology", "Data Analyst", "Hyderabad",
                "18 LPA", "1800000.00", "7.50", 8, LocalDate.now().plusMonths(1),
                List.of("SQL", "Python", "PowerBI", "Tableau"), "7.5+ CGPA");

        Job msJob = seedJob(officerUser, "Microsoft", "Technology", "Cloud Engineer", "Hyderabad",
                "22 LPA", "2200000.00", "8.00", 5, LocalDate.now().plusDays(25),
                List.of("Azure", "Linux", "Kubernetes", "Terraform"), "8.0+ CGPA");

        Job zohoJob = seedJob(officerUser, "Zoho", "Technology", "Full Stack Developer", "Chennai",
                "10 LPA", "1000000.00", "7.00", 15, LocalDate.now().plusDays(20),
                List.of("Java", "JavaScript", "React", "MySQL"), "7.0+ CGPA");

        Job infosysJob = seedJob(officerUser, "Infosys", "IT Services", "DevOps Engineer", "Mysore",
                "8 LPA", "800000.00", "6.50", 20, LocalDate.now().plusMonths(1),
                List.of("Docker", "CI/CD", "AWS", "Bash"), "6.5+ CGPA");

        // 3. Students
        createStudentData(
                "Adithya K", "adithya.k@gce.edu.in", "912822104001", "+91 98765 00001",
                "Computer Science (CSE)", "CSE", "B.E CSE", "2022-2026", (short) 7,
                new BigDecimal("8.92"), PlacementStatus.PLACED, googleJob.getCompany(), new BigDecimal("2400000.00"),
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
                new BigDecimal("9.10"), PlacementStatus.PLACED, msJob.getCompany(), new BigDecimal("2200000.00"),
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

    /** Saves a job for the named company (created on first use) with its skill and requirement rows. */
    private Job seedJob(User postedBy, String companyName, String industry, String role, String location,
                        String ctcText, String ctcValue, String minCgpa, int vacancies, LocalDate deadline,
                        List<String> skills, String requirement) {
        Company company = companyRepository.findByNameIgnoreCase(companyName)
                .orElseGet(() -> companyRepository.save(Company.builder()
                        .name(companyName)
                        .industry(industry)
                        .build()));

        Job job = Job.builder()
                .company(company)
                .jobRole(role)
                .location(location)
                .ctcText(ctcText)
                .ctcValue(new BigDecimal(ctcValue))
                .minCgpa(new BigDecimal(minCgpa))
                .jobType(EmploymentType.FULL_TIME)
                .vacancies(vacancies)
                .applicationDeadline(deadline)
                .status(JobStatus.ACTIVE)
                .postedBy(postedBy)
                .build();
        skills.forEach(skill -> job.addSkill(JobSkill.builder().skillName(skill).build()));
        job.addRequirement(JobRequirement.builder().requirement(requirement).build());
        return jobRepository.save(job);
    }

    private void createStudentData(
            String name, String email, String rollNo, String phone,
            String dept, String deptCode, String degree, String batch, short sem,
            BigDecimal cgpa, PlacementStatus status, Company placedCompany, BigDecimal placedCtc,
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
                .placedCompany(placedCompany)
                .placedCtc(placedCtc)
                .placedOn(status == PlacementStatus.PLACED ? LocalDate.now().minusDays(10) : null)
                .profileCompletionPercent(completion)
                .about("Enthusiastic engineering student from " + dept + " at GCE Srirangam.")
                .build());

        for (String skill : skills) {
            studentSkillRepository.save(StudentSkill.builder()
                    .studentProfile(sp)
                    .skillName(skill)
                    .proficiency(SkillProficiency.INTERMEDIATE)
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
                    .appliedOn(LocalDateTime.now().minusDays(3))
                    .build());
        }
    }
}
