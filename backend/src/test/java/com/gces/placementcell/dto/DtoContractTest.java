package com.gces.placementcell.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gces.placementcell.dto.request.ApplicationTimelineRequest;
import com.gces.placementcell.dto.request.JobApplicationRequest;
import com.gces.placementcell.dto.request.JobRequest;
import com.gces.placementcell.dto.request.LoginRequest;
import com.gces.placementcell.dto.request.NotificationRequest;
import com.gces.placementcell.dto.request.RegisterRequest;
import com.gces.placementcell.dto.request.StudentEducationRequest;
import com.gces.placementcell.dto.request.StudentExperienceRequest;
import com.gces.placementcell.dto.request.StudentProfileRequest;
import com.gces.placementcell.dto.response.JobResponse;
import com.gces.placementcell.dto.response.PagedResponse;
import com.gces.placementcell.dto.response.StudentProfileResponse;
import com.gces.placementcell.dto.response.UserResponse;
import com.gces.placementcell.entity.Company;
import com.gces.placementcell.entity.Job;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.AccountStatus;
import com.gces.placementcell.entity.enums.EmploymentType;
import com.gces.placementcell.entity.enums.ExperienceType;
import com.gces.placementcell.entity.enums.TargetAudience;
import com.gces.placementcell.entity.enums.TimelineStatus;
import com.gces.placementcell.entity.enums.UserRole;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.core.type.filter.AssignableTypeFilter;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Contract tests for the DTO layer.
 *
 * Two things here are worth a test rather than a code review. First, response DTOs must
 * never carry a password field: the User entity holds passwordHash, and the only thing
 * stopping it reaching a client is that every endpoint projects through a DTO. Second,
 * the cross-field @AssertTrue rules are ordinary methods, and a validator that silently
 * ignores them would look identical to one that enforces them.
 */
@DisplayName("DTO Contract Test")
class DtoContractTest {

    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void setUp() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void tearDown() {
        if (factory != null) {
            factory.close();
        }
    }

    private static Set<String> violatedProperties(Object dto) {
        return validator.validate(dto).stream()
                .map(v -> v.getPropertyPath().toString())
                .collect(java.util.stream.Collectors.toSet());
    }

    private static String messages(Object dto) {
        return validator.validate(dto).stream()
                .map(ConstraintViolation::getMessage)
                .collect(java.util.stream.Collectors.joining("; "));
    }

    // ---------------------------------------------------------------- safety

    @Nested
    @DisplayName("Response DTOs never expose credentials")
    class CredentialSafety {

        @Test
        @DisplayName("No class in dto.response declares a password-like member")
        void testNoResponseDtoHasPasswordMember() {
            var scanner = new ClassPathScanningCandidateComponentProvider(false);
            scanner.addIncludeFilter(new AssignableTypeFilter(Object.class));

            var responseTypes = scanner.findCandidateComponents("com.gces.placementcell.dto.response")
                    .stream()
                    .map(bd -> {
                        try {
                            return Class.forName(bd.getBeanClassName());
                        } catch (ClassNotFoundException e) {
                            throw new IllegalStateException(e);
                        }
                    })
                    .toList();

            // Without this the test would pass vacuously if the scan ever stopped
            // matching the package, which is the one way it could fail silently.
            assertTrue(responseTypes.size() >= 12,
                    "Expected the scan to find the response DTOs, found: " + responseTypes);

            var offenders = responseTypes.stream()
                    .flatMap(type -> Stream.concat(
                            Stream.of(type.getDeclaredFields()).map(Field::getName),
                            type.isRecord()
                                    ? Stream.of(type.getRecordComponents()).map(rc -> rc.getName())
                                    : Stream.<String>empty())
                            .filter(name -> name.toLowerCase().contains("password")
                                    || name.toLowerCase().contains("secret"))
                            .map(name -> type.getSimpleName() + "." + name))
                    .toList();

            assertTrue(offenders.isEmpty(),
                    "Response DTOs must not carry credential fields, found: " + offenders);
        }

        @Test
        @DisplayName("Serialising a response built from a User omits the password hash")
        void testSerialisedResponseHasNoHash() throws Exception {
            var mapper = new ObjectMapper().findAndRegisterModules();
            var user = sampleUser();

            for (Object dto : List.of(
                    UserResponse.from(user),
                    StudentProfileResponse.from(sampleProfile(user)),
                    JobResponse.from(sampleJob(user)))) {
                String json = mapper.writeValueAsString(dto);
                assertFalse(json.toLowerCase().contains("password"),
                        dto.getClass().getSimpleName() + " serialised a password field: " + json);
                assertFalse(json.contains("$2a$hashed-secret"),
                        dto.getClass().getSimpleName() + " leaked the hash value: " + json);
            }
        }

        @Test
        @DisplayName("Nested UserResponse carries identity but not credentials")
        void testNestedUserProjection() {
            var profile = StudentProfileResponse.from(sampleProfile(sampleUser()));

            assertEquals("student@gces.edu", profile.user().email());
            assertEquals(UserRole.STUDENT, profile.user().role());
        }
    }

    // ------------------------------------------------------------ validation

    @Nested
    @DisplayName("Request DTO validation")
    class RequestValidation {

        @Test
        @DisplayName("Login rejects a blank email and a blank password")
        void testLoginValidation() {
            var invalid = new LoginRequest("", "");
            assertEquals(Set.of("email", "password"), violatedProperties(invalid));

            assertTrue(validator.validate(new LoginRequest("officer@gces.edu", "Str0ngPass")).isEmpty());
        }

        @Test
        @DisplayName("Login accepts a short password; length policy applies only at registration")
        void testLoginAcceptsShortPassword() {
            // A 6-character password must reach the credential check, not be rejected
            // as "Validation failed" before the account is ever looked up.
            assertTrue(validator.validate(new LoginRequest("student@gces.edu", "123456")).isEmpty());

            var weakRegistration = new RegisterRequest("s@gces.edu", "123456", "Asha Rao", null, UserRole.STUDENT);
            assertTrue(violatedProperties(weakRegistration).contains("password"),
                    "Registration must still enforce the minimum length");
        }

        @Test
        @DisplayName("Registration requires a mixed-case password with a digit")
        void testRegisterPasswordStrength() {
            var weak = new RegisterRequest("s@gces.edu", "alllowercase", "Asha Rao", "20CS001", UserRole.STUDENT);
            assertTrue(violatedProperties(weak).contains("password"), messages(weak));

            var ok = new RegisterRequest("s@gces.edu", "Str0ngPass", "Asha Rao", "20CS001", UserRole.STUDENT);
            assertTrue(validator.validate(ok).isEmpty(), messages(ok));
        }

        @Test
        @DisplayName("CGPA outside 0.00-10.00 is rejected")
        void testCgpaRange() {
            assertTrue(violatedProperties(profileWithCgpa(new BigDecimal("11.00"))).contains("cgpa"));
            assertTrue(violatedProperties(profileWithCgpa(new BigDecimal("-1.00"))).contains("cgpa"));
            assertTrue(validator.validate(profileWithCgpa(new BigDecimal("8.75"))).isEmpty());
        }

        @Test
        @DisplayName("An application without consent is rejected")
        void testConsentIsMandatory() {
            var withheld = new JobApplicationRequest(1L, null, null, false);
            assertTrue(violatedProperties(withheld).contains("consentAccepted"), messages(withheld));

            var missing = new JobApplicationRequest(1L, null, null, null);
            assertTrue(violatedProperties(missing).contains("consentGiven"), messages(missing));

            assertTrue(validator.validate(new JobApplicationRequest(1L, null, null, true)).isEmpty());
        }

        @Test
        @DisplayName("Education years must be ordered and agree with the current flag")
        void testEducationCrossFieldRules() {
            var backwards = new StudentEducationRequest(
                    "GCES", "B.E. CSE", "VTU", (short) 2024, (short) 2020, "8.7", false);
            assertTrue(violatedProperties(backwards).contains("yearRangeValid"), messages(backwards));

            var contradictory = new StudentEducationRequest(
                    "GCES", "B.E. CSE", "VTU", (short) 2021, (short) 2025, "8.7", true);
            assertTrue(violatedProperties(contradictory).contains("currentFlagConsistent"),
                    messages(contradictory));

            var ongoing = new StudentEducationRequest(
                    "GCES", "B.E. CSE", "VTU", (short) 2021, null, null, true);
            assertTrue(validator.validate(ongoing).isEmpty(), messages(ongoing));
        }

        @Test
        @DisplayName("Experience dates must be ordered and agree with the current flag")
        void testExperienceCrossFieldRules() {
            var backwards = new StudentExperienceRequest(
                    "SDE Intern", "Google", ExperienceType.INTERNSHIP, "Bangalore",
                    LocalDate.of(2025, 6, 1), LocalDate.of(2025, 1, 1), null, false);
            assertTrue(violatedProperties(backwards).contains("dateRangeValid"), messages(backwards));

            var contradictory = new StudentExperienceRequest(
                    "SDE Intern", "Google", ExperienceType.INTERNSHIP, "Bangalore",
                    LocalDate.of(2025, 1, 1), LocalDate.of(2025, 6, 1), null, true);
            assertTrue(violatedProperties(contradictory).contains("currentFlagConsistent"),
                    messages(contradictory));
        }

        @Test
        @DisplayName("A SPECIFIC_USERS notification needs recipient ids")
        void testNotificationAudienceRules() {
            var noRecipients = new NotificationRequest(
                    "Shortlist out", "Check your dashboard", null, null,
                    TargetAudience.SPECIFIC_USERS, null, null, null, null, List.of());
            assertTrue(violatedProperties(noRecipients).contains("recipientListConsistent"),
                    messages(noRecipients));

            var broadcast = new NotificationRequest(
                    "Shortlist out", "Check your dashboard", null, null,
                    TargetAudience.STUDENTS, null, null, null, null, null);
            assertTrue(validator.validate(broadcast).isEmpty(), messages(broadcast));
        }

        @Test
        @DisplayName("Expiry must fall after the scheduled time")
        void testNotificationScheduleWindow() {
            var scheduled = java.time.LocalDateTime.of(2026, 10, 1, 9, 0);
            var inverted = new NotificationRequest(
                    "Drive", "Reporting time 9am", null, null, TargetAudience.ALL,
                    null, null, scheduled, scheduled.minusDays(1), null);
            assertTrue(violatedProperties(inverted).contains("scheduleValid"), messages(inverted));
        }

        @Test
        @DisplayName("A job needs a company, role and deadline")
        void testJobRequiredFields() {
            var empty = new JobRequest(null, "  ", null, null, null, null, null, null, null,
                    null, null, null, null, null, null, null);
            var violated = violatedProperties(empty);

            assertTrue(violated.containsAll(Set.of("companyId", "jobRole", "jobType", "applicationDeadline")),
                    "Expected the mandatory job fields to be flagged, got: " + violated);
        }

        @Test
        @DisplayName("Blank collection elements on a job are rejected")
        void testJobSkillElementValidation() {
            var withBlankSkill = new JobRequest(
                    1L, "SDE", null, EmploymentType.FULL_TIME, "Bangalore", "24 LPA",
                    new BigDecimal("2400000.00"), 10, null, new BigDecimal("8.00"), false,
                    (short) 2026, LocalDate.now().plusMonths(1), null, List.of("Java", " "), null);

            assertFalse(validator.validate(withBlankSkill).isEmpty(),
                    "A blank skill name must not pass validation");
        }

        @Test
        @DisplayName("A timeline stage needs a label and a status")
        void testTimelineRequiredFields() {
            var empty = new ApplicationTimelineRequest(null, null, null, null);
            assertEquals(Set.of("stageLabel", "status"), violatedProperties(empty));

            var ok = new ApplicationTimelineRequest(
                    "Technical Round 1", LocalDate.now(), TimelineStatus.UPCOMING, null);
            assertTrue(validator.validate(ok).isEmpty());
        }
    }

    // ------------------------------------------------------------- mapping

    @Nested
    @DisplayName("Response mapping")
    class ResponseMapping {

        @Test
        @DisplayName("PagedResponse keeps the page metadata and maps the content")
        void testPagedResponse() {
            var page = new PageImpl<>(List.of(sampleJob(sampleUser())), PageRequest.of(2, 5), 42);

            var response = PagedResponse.of(page, JobResponse::from);

            assertEquals(1, response.content().size());
            assertEquals("Software Development Engineer", response.content().get(0).jobRole());
            assertEquals(2, response.page());
            assertEquals(5, response.size());
            assertEquals(42, response.totalElements());
            assertEquals(9, response.totalPages());
            assertFalse(response.first());
            assertFalse(response.empty());
        }

        @Test
        @DisplayName("Job child tables are flattened to plain lists")
        void testJobChildrenFlattened() {
            var job = sampleJob(sampleUser());
            job.addSkill(com.gces.placementcell.entity.JobSkill.builder().skillName("Java").build());
            job.addRequirement(com.gces.placementcell.entity.JobRequirement.builder()
                    .requirement("No active backlogs").build());

            var response = JobResponse.from(job);

            assertEquals(List.of("Java"), response.skills());
            assertEquals(List.of("No active backlogs"), response.requirements());
            assertEquals(List.of(), response.perks(), "An empty child table maps to an empty list, not null");
            assertEquals("Google", response.company().name());
        }

        @Test
        @DisplayName("Mapping a null association yields null rather than throwing")
        void testNullSafety() {
            assertNull(UserResponse.from(null));
            assertNull(JobResponse.from(null));
            assertNull(StudentProfileResponse.from(null));
        }

        @Test
        @DisplayName("Summary profile mapping leaves child collections empty")
        void testSummaryMappingSkipsCollections() {
            var response = StudentProfileResponse.from(sampleProfile(sampleUser()));

            assertEquals(List.of(), response.skills());
            assertEquals(List.of(), response.education());
            assertEquals(List.of(), response.experience());
            assertEquals(List.of(), response.projects());
        }
    }

    // -------------------------------------------------------------- fixtures

    private static StudentProfileRequest profileWithCgpa(BigDecimal cgpa) {
        return new StudentProfileRequest(
                "Asha Rao", "asha@gces.edu", "+919876543210", null, null, null, null,
                "GCES", "B.E.", "Computer Science", "CSE", "2022-2026",
                (short) 7, cgpa, 0, 0, true);
    }

    private static User sampleUser() {
        return User.builder()
                .id(5L)
                .email("student@gces.edu")
                .passwordHash("$2a$hashed-secret")
                .role(UserRole.STUDENT)
                .accountStatus(AccountStatus.ACTIVE)
                .build();
    }

    private static StudentProfile sampleProfile(User user) {
        return StudentProfile.builder()
                .id(11L)
                .user(user)
                .rollNo("20CS001")
                .fullName("Asha Rao")
                .email("student@gces.edu")
                .departmentCode("CSE")
                .cgpa(new BigDecimal("8.75"))
                .build();
    }

    private static Job sampleJob(User poster) {
        return Job.builder()
                .id(3L)
                .company(Company.builder().id(1L).name("Google").industry("Technology").build())
                .jobRole("Software Development Engineer")
                .jobType(EmploymentType.FULL_TIME)
                .location("Bangalore")
                .ctcText("24 LPA")
                .ctcValue(new BigDecimal("2400000.00"))
                .applicationDeadline(LocalDate.now().plusMonths(1))
                .postedBy(poster)
                .build();
    }
}
